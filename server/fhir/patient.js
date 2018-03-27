var http = require('request-promise');
var moment = require('moment-timezone');
const bodyParser = require('body-parser');
var fhirResources = require('./resources');
var deviceProcessor = require('./device');
var locationProcessor = require('./location');
var relatedPersonProcessor = require('./related_person');
const common = require('../common');
const config = require('../config');
var orgTimeZone = config.getAppTimeZone();

function fhirErrorHandler(error,responseMessage){
    console.log("Fhir Error:"+JSON.stringify(error));
     var errorResponse = responseMessage.error;
    return errorResponse;
}

function fhirRepoCallHandler(requestInfo,fhirdatahandler,responseMessage){
    return common.prepareCommonApiManagerRequest({request:requestInfo.request,sessionInfo:requestInfo.request.user,identifier:'fhir'})
    .then((response)=>{
        var options = {
             method: requestInfo.requestMethod,
             uri: response.apiUrl + requestInfo.requestUrl,
             rejectUnauthorized: false,
             headers: {
                'Authorization': response.request.headers['Authorization'],
                'content-type': response.request.headers['content-type'],
                'x-tennantid': response.request.headers['x-tennantid']
             },
             resolveWithFullResponse: true,
             json: true
        };
        
        if(requestInfo.requestData){
            options.body = requestInfo.requestData
        }
        return new Promise((resolve, reject) => {
             http(options).then(function(response) {
                  //  console.log('**Response Body',response.body);
                     var resolevedresp = fhirdatahandler(response.body,responseMessage);
                     resolve(resolevedresp);
                 })
                 .catch(function(error) {
                     var errorResponse = fhirErrorHandler(error,responseMessage);
                     reject(errorResponse);
                     
                 });
         });
    })
    .catch((error)=>{
        return new Promise((resolve, reject) => {reject(error)});
    })
}

function prepareFhirPatientData(patientData){
    var patient = fhirResources.patient;
    let name = patientData.name.split(':');
    patient.identifier[0].value = patientData.mrn;
    patient.identifier[1].value = patientData.id;
    patient.identifier[2].value = patientData.ipno;
    patient.name[0].given[0] = name[0]; // first name
    patient.name[0].family[0] = name[1]; // last name
    patient.telecom[0].value = patientData.phoneNumber;
    patient.telecom[1].value = patientData.emailId ? patientData.emailId : '';
    patient.gender = patientData.gender.toLowerCase();
    patient.birthDate = patientData.dateOfBirth;
    patient.address[0].line[0] = patientData.addressline;
    patient.address[0].city = patientData.city;
    patient.address[0].postalCode = patientData.pin;
    patient.address[0].state = patientData.state;
    patient.maritalStatus.coding[0].system = 'http://hl7.org/fhir/v3/MaritalStatus';
    switch (patientData.maritialStatus) {
        case 'Single':
             patient.maritalStatus.coding[0].code = 'S';
             patient.maritalStatus.coding[0].display = 'Never Married';
            break;
        case 'Married':
            patient.maritalStatus.coding[0].code = 'M';
            patient.maritalStatus.coding[0].display = 'Married';
            break;
        case 'Divorced':
            patient.maritalStatus.coding[0].code = 'D';
            patient.maritalStatus.coding[0].display = 'Divorced';
            break;
        case 'Widowed':
            patient.maritalStatus.coding[0].code = 'W';
            patient.maritalStatus.coding[0].display = 'Widowed';
            break;
        case 'UnKnown':
            patient.maritalStatus.coding[0].system = 'http://hl7.org/fhir/v3/NullFlavor';
            patient.maritalStatus.coding[0].code = 'UNK';
            patient.maritalStatus.coding[0].display = 'Married';
            break;
        default:
            patient.maritalStatus.coding[0].system = 'http://hl7.org/fhir/v3/NullFlavor';
            patient.maritalStatus.coding[0].code = 'UNK';
            patient.maritalStatus.coding[0].display = 'Married';
     }
     patient.managingOrganization.reference = "Organization/" + patientData.fhirOrgId;
     return patient;
}

function prepareEpisodeOfCareResponse(fhirdata){
    var episodeOfCareResponse = {};
    if(fhirdata.entry){
       episodeOfCareResponse.id = fhirdata.entry[0].resource.id;
    }
    return episodeOfCareResponse;
}

function prepareEncounterResponse(fhirdata) {
    var encounterResponse = {};
    if (fhirdata.entry) {
        let encounter = fhirdata.entry[0].resource;
        encounterResponse.id = encounter.id;
        encounterResponse.identifier = encounter.identifier[0].value;
        encounterResponse.status = encounter.status;
        encounterResponse.patientId = encounter.patient.reference.split("/")[1];
        encounterResponse.episodeOfCareId = encounter.episodeOfCare[0].reference.split("/")[1];
        encounterResponse.orgId = encounter.serviceProvider.reference.split("/")[1];
        encounterResponse.start = encounter.period.start;
        if (encounter.period.end) {
            encounterResponse.end = encounter.period.end;
        }
    }
    return encounterResponse;
}

function preparePatientResponse(fhirdata){
    var patientResponse = {};
    if(fhirdata.entry && fhirdata.entry[0].resource.resourceType === 'Encounter' && fhirdata.entry[1].resource.resourceType === 'Patient'){
       var encounter = fhirdata.entry[0].resource;
       var patient =  fhirdata.entry[1].resource;
       patientResponse.id = patient.id;
       patientResponse.mrn = patient.identifier[0].value;
       patientResponse.ipn = encounter.identifier[0].value;
       patientResponse.encounterId = encounter.id;
       patientResponse.admittedDate = encounter.period.start;
       patientResponse.orgId = encounter.serviceProvider.reference.split('/')[1];
       patientResponse.episodeOfCareId = encounter.episodeOfCare[0].reference.split('/')[1];
    }

    if (fhirdata.entry && fhirdata.entry[0].resource.resourceType === 'EpisodeOfCare' && fhirdata.entry[1].resource.resourceType === 'Patient') 
    {
        var EpisodeOfCare = fhirdata.entry[0].resource;
        var patient = fhirdata.entry[1].resource;
        patientResponse.episodeOfCareId= EpisodeOfCare.id;
        patientResponse.id = patient.id;
        patientResponse.OrgId = patient.managingOrganization.reference.split('/')[1];
    }
    
    return patientResponse;
}

function prepareAllPatientsResponse(fhirdata,responseMessage){
    let patientsData = [];
    if(fhirdata.entry && fhirdata.entry.length > 0){
        patientsData.patientList = fhirdata.entry.filter(entry => entry.resource.resourceType === 'Patient');
        patientsData.encounterList = fhirdata.entry.filter(entry => entry.resource.resourceType === 'Encounter');
        patientsData.encounterList.forEach((encounter)=>{
          let patientResponse = {};
          let patient = patientsData.patientList.find(_patient=>_patient.resource.id === encounter.resource.patient.reference.split('/')[1]);
          patientResponse.id = patient.resource.id;
          patientResponse.mrn = patient.resource.identifier[0].value;
          patientResponse.pid = patient.resource.identifier[1].value;
          patientResponse.ipn = encounter.resource.identifier[0].value;
          patientResponse.encounterId = encounter.resource.id;
          patientResponse.admittedDate = encounter.resource.period.start;
          patientResponse.orgId = encounter.resource.serviceProvider.reference.split('/')[1];
          patientResponse.episodeOfCareId = encounter.resource.episodeOfCare[0].reference.split('/')[1];
          patientsData.push(patientResponse)
        })
    }
    return patientsData;
}


function preparesuccessdata(fhirdata,responseMessage){
    var successResponse = {
        message : responseMessage.success,
        action : responseMessage.successAction
    }
    if(fhirdata && fhirdata.id){
       successResponse.id = fhirdata.id;
    }
    return successResponse;
}

function prepareCreateEncounterResponse(fhirdata,responseMessage){
    var successResponse = {
        message : responseMessage.success,
        action : responseMessage.successAction
    }
    if(fhirdata && fhirdata.id){
       successResponse.id = fhirdata.id;
       successResponse.admittedDate = fhirdata.period.start;
    }
    return successResponse;
}

function createPatient(patientData,request) {
    var fhirserviceurl = 'Patient';
    var responseMessage = {"success" : "successfully created patient",
                          "error" : "Failed to created patient",
                          "successAction" : "patient created",
                          "errorAction" : "patient create error"
                         };
    
    var fhirPatient = prepareFhirPatientData(patientData);

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirserviceurl,
        requestData : fhirPatient,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function getPatientWithEOCByIdentifier(identifier,request) {
    var fhirserviceurl = 'EpisodeOfCare?_include=EpisodeOfCare:patient&patient.identifier=' + identifier;
    var responseMessage = {
        "error": "Failed to get Patient data",
        "errorAction": "get patient error"
    };

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };  
    return fhirRepoCallHandler(requestInfo,preparePatientResponse,responseMessage);

}

function getPatientByIdentifier(identifier,request){
    var fhirserviceurl = 'Encounter?status=arrived&_include=Encounter:patient&patient.identifier=' + identifier;
    var responseMessage = {"error" : "Failed to get Patient data",
                           "errorAction" : "get patient error"
                          };

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };  
    return fhirRepoCallHandler(requestInfo,preparePatientResponse,responseMessage);
}

function updatePatient(patientData,request) {
    var fhirserviceurl = 'Patient/' + patientData.fhirId;
    var responseMessage = {"success" : "successfully updated patient",
                          "error" : "Failed to update fhir patient"};
    
    var fhirPatient = prepareFhirPatientData(patientData);
    fhirPatient.id = patientData.fhirId;

    var requestInfo = {
        requestMethod : 'PUT',
        requestUrl : fhirserviceurl,
        requestData : fhirPatient,
        request : request
    };
    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function deletePatient(patientId,request) {
    var fhirserviceurl = 'Patient/' + patientId;
    var responseMessage = {"success" : "successfully deleted patient",
                          "error" : "Failed to delete patient",
                          "successAction" : "patient deleted",
                          "errorAction" : "patient delete error"
                         };

    var requestInfo = {
        requestMethod : 'DELETE',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function createEpisodeOfCare(patientId,fhirOrgId,request){
    var fhirserviceurl = 'EpisodeOfCare';
    var responseMessage = {"success" : "successfully created EpisodeOfCare",
                          "error" : "Failed to create EpisodeOfCare",
                          "successAction" : "episodeOfCare created",
                          "errorAction" : "episodeOfCare create error"
                         };
    
    var episodeOfCare = fhirResources.episodeOfCare;
    episodeOfCare.patient.reference = "Patient/" + patientId;
    episodeOfCare.managingOrganization.reference = "Organization/" + fhirOrgId;

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirserviceurl,
        requestData : episodeOfCare,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);

}

function deleteEpisodeOfCare( episodeOfCareId,request) {
    var fhirserviceurl = 'EpisodeOfCare/' + episodeOfCareId;
    var responseMessage = {"success" : "successfully deleted EpisodeOfCare",
                          "error" : "Failed to delete EpisodeOfCare",
                          "successAction" : "episodeOfCare deleted",
                          "errorAction" : "episodeOfCare delete error"
                         };

    var requestInfo = {
        requestMethod : 'DELETE',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function createEncounter(encounterData,request){
    var fhirserviceurl = 'Encounter';
    var responseMessage = {"success" : "successfully created Encounter",
                          "error" : "Failed to create Encounter",
                          "successAction" : "encounter created",
                          "errorAction" : "encounter create error"
                         };
    var encounter = fhirResources.encounter;
    encounter.status = encounterData.status;
    encounter.identifier[0].value = encounterData.identifier;
    encounter.patient.reference = "Patient/" + encounterData.patientId;
    encounter.episodeOfCare[0].reference = "EpisodeOfCare/" + encounterData.episodeOfCareId;
    encounter.serviceProvider.reference = "Organization/" + encounterData.orgId;
    encounter.period = {"start" : moment().tz(orgTimeZone).format()};
    encounter.location[0].location = `Location/${encounterData.locationId}`;

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirserviceurl,
        requestData : encounter,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareCreateEncounterResponse,responseMessage);
}

function getEncounterByIdentifier(identifier,status, request){
    var fhirserviceurl = `Encounter?identifier=${identifier}&status=${status}`;
    var responseMessage = {"error" : "Failed to get Encounter",
                           "errorAction" : "get encounter error"
                          };

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };  
    return fhirRepoCallHandler(requestInfo,prepareEncounterResponse,responseMessage);

}

function prepareOrgPatientResponse(fhirdata){
  let patientsData = [];
  if(fhirdata.entry && fhirdata.entry.length > 0){
      patientsData.patientList = fhirdata.entry.filter(entry => entry.resource.resourceType === 'Patient');
      patientsData.encounterList = fhirdata.entry.filter(entry => entry.resource.resourceType === 'Encounter');
      patientsData.encounterList.forEach((encounter)=>{
        let patientResponse = {};
        let patient = patientsData.patientList.find(_patient=>_patient.resource.id === encounter.resource.patient.reference.split('/')[1]);
        patientResponse.fhirId = patient.resource.id;
        patientResponse.mrn = patient.resource.identifier[1].value;
        patientResponse.ipn = encounter.resource.identifier[0].value;
        patientResponse.encounterId = encounter.resource.id;
        patientResponse.admittedDate = moment(encounter.resource.period.start).valueOf();
        patientResponse.orgId = encounter.resource.serviceProvider.reference.split('/')[1];
        patientResponse.episodeOfCareId = encounter.resource.episodeOfCare[0].reference.split('/')[1];
        let firstName = (patient.resource.name[0] && patient.resource.name[0].given && patient.resource.name[0].given[0]) ? patient.resource.name[0].given[0] : '';
        let lastName = (patient.resource.name[0] && patient.resource.name[0].family && patient.resource.name[0].family[0]) ? patient.resource.name[0].family[0] : '';
        patientResponse.name =   `${firstName}:${lastName}`;
        patientResponse.phoneNumber = patient.resource.telecom[0].value;
        patientResponse.emailId = patient.resource.telecom[1] ? patient.resource.telecom[1].value : undefined;;
        patientResponse.gender = patient.resource.gender.charAt(0).toUpperCase() + patient.resource.gender.slice(1);
        patientResponse.dateOfBirth = moment(patient.resource.birthDate).valueOf();
        patientResponse.addressline = patient.resource.address[0].line ? patient.resource.address[0].line[0] : '';
        patientResponse.city = patient.resource.address[0].city;
        patientResponse.pin = patient.resource.address[0].postalCode;
        patientResponse.state = patient.resource.address[0].state;
        switch (patient.resource.maritalStatus.coding[0].code) {
          case 'S':
            patientResponse.maritialStatus = 'Single';
            break;
          case 'M':
            patientResponse.maritialStatus = 'Married';
            break;
          case 'D':
            patientResponse.maritialStatus = 'Divorced';
            break;
          case 'W':
            patientResponse.maritialStatus = 'Widowed';
            break;
          case 'UNK':
            patientResponse.maritialStatus = 'UnKnown';
            break;
        }
        patientsData.push(patientResponse)
      })
  }
  return patientsData;

}

function getPatientsByOrgIdAnddStatus(orgId, status, request){
  var fhirserviceurl = `Encounter?status=${status}&_include=Encounter:patient&patient.organization=${orgId}`;
  var responseMessage = {"error" : "Failed to get patients"
                        };

  var requestInfo = {
      requestMethod : 'GET',
      requestUrl : fhirserviceurl,
      requestData : '',
      request : request
  };  
  return fhirRepoCallHandler(requestInfo,prepareOrgPatientResponse,responseMessage);
}

function updateEncounter(encounterData,endDate,request,appointmentId){
    var fhirserviceurl = 'Encounter/' + encounterData.id;
    var responseMessage = {"success" : "successfully updated Encounter",
                          "error" : "Failed to update Encounter",
                          "successAction" : "encounter updated",
                          "errorAction" : "encounter update error"
                         };
    var encounter = fhirResources.encounter;
    encounter.status = encounterData.status;
    encounter.identifier[0].value = encounterData.identifier;
    encounter.patient.reference = "Patient/" + encounterData.patientId;
    encounter.episodeOfCare[0].reference = "EpisodeOfCare/" + encounterData.episodeOfCareId;
    encounter.serviceProvider.reference = "Organization/" + encounterData.orgId;
    encounter.id = encounterData.id;
    if(appointmentId)
    {
        encounter.appointment.reference =  "Appointment/" + appointmentId;
    }
    if(endDate){
        encounter.period = {"start" : encounterData.start,
                            "end":endDate};
    }else{
      encounter.period = {"start" : encounterData.start};
    }
    var requestInfo = {
        requestMethod : 'PUT',
        requestUrl : fhirserviceurl,
        requestData : encounter,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function deleteEncounter( encounterId,request) {
    var fhirserviceurl = 'Encounter/' + encounterId;
    var responseMessage = {"success" : "successfully deleted Encounter",
                          "error" : "Failed to delete Encounter",
                          "successAction" : "encounter deleted",
                          "errorAction" : "encounter delete error"
                         };

     var requestInfo = {
        requestMethod : 'DELETE',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function deletePatientFhirResources(patientId,episodeOfCareId,encounterId,request){
    return deleteEncounter(encounterId,request)
    .then((response) => {
       return deleteEpisodeOfCare(episodeOfCareId,request);
    })
    .then((response) => {
        return deletePatient(patientId,request);
    })
    .then((response) =>{
        var reponseMessage = {action: "Deleted patient resources"};
        return Promise.resolve(reponseMessage);
    })
    .catch((error) => {
       var reponseMessage = {action: "Failed to delete patient resources"};
       return Promise.reject(reponseMessage);
    });

}

function revertPatientCreation({error,patientId,episodeOfCareId,encounterId,relatedPersonId,request}){
  let errMsg = error.action ? error.action : error;
  let patientCreationResponse = {
        status : 500,
        statusText : "Fhir patient creation failed"
      };
  if(errMsg === 'Failed to create Related Person'){
    return deletePatient(patientId,request)
    .then((res)=>{
      return Promise.resolve(patientCreationResponse)
    })
    .catch((err)=>{
      return Promise.resolve(patientCreationResponse)
    })
  }else if(errMsg === 'Failed to create EpisodeOfCare'){
    return relatedPersonProcessor.deleteRelatedPerson(relatedPersonId,request)
    then((res)=>{
      return deletePatient(patientId,request)
    })
    .then((res)=>{
      return Promise.resolve(patientCreationResponse)
    })
    .catch((err)=>{
      return Promise.resolve(patientCreationResponse)
    })
  }else if(errMsg === 'Failed to create Encounter'){
    return deleteEpisodeOfCare(episodeOfCareId,request)
    .then((res)=>{
      return relatedPersonProcessor.deleteRelatedPerson(relatedPersonId,request)
    })
    then((res)=>{
      return deletePatient(patientId,request)
    })
    .then((res)=>{
      return Promise.resolve(patientCreationResponse)
    })
    .catch((err)=>{
      return Promise.resolve(patientCreationResponse)
    })
  }else if(errMsg === 'Failed to update devices'){
    return deleteEncounter(encounterId,request)
    .then((res)=>{
      return deleteEpisodeOfCare(episodeOfCareId,request)
    })
    .then((res)=>{
      return relatedPersonProcessor.deleteRelatedPerson(relatedPersonId,request)
    })
    then((res)=>{
      return deletePatient(patientId,request)
    })
    .then((res)=>{
      return Promise.resolve(patientCreationResponse)
    })
    .catch((err)=>{
      return Promise.resolve(patientCreationResponse)
    })
  }else{
      return Promise.resolve(patientCreationResponse)
  }
}

function createFhirPatient(patientData,request){
  return createPatient(patientData,request)
  .then((response) => {
    patientData.fhirId = response.id;
    return relatedPersonProcessor.createRelatedPerson(patientData,request);
  })
  .then((response)=>{
    patientData.relatedPersonId = response.id;
    return createEpisodeOfCare(patientData.fhirId,patientData.fhirOrgId,request);
  })
  .then((response) => {
    patientData.episodeOfCareId = response.id;
    return locationProcessor.getFhirLocation(patientsData.bedId,request)
  })
  .then((response)=>{
    patientData.locationId = response.resource.identifier[0].value;
    var encounterData = {
      locationId : patientData.locationId,
      patientId : patientData.fhirId,
      identifier : patientData.ipno,
      episodeOfCareId : patientData.episodeOfCareId,
      orgId : patientData.fhirOrgId,
      status : "arrived"
    };
    return createEncounter(encounterData,request);
  })
  .then((response) => {
    patientData.admittedDate = response.admittedDate;
    patientData.encounterId = response.id;
    return deviceProcessor.updatePatientDevices(request,patientData.bedId,patientData.fhirId,"patient-creation-update");
  })
  .then((response) => {
    response.patientFhirId = patientData.fhirId;
    response.admittedDate = patientData.admittedDate;
    response.encounterId = patientData.encounterId;
    response.episodeOfCareId = patientData.episodeOfCareId;
    response.relatedPersonId = patientData.relatedPersonId;
    response.action = "Fhir patient created";
    return Promise.resolve(response);
  })
  .catch((error) => {
    return revertPatientCreation({error:error, patientId:patientData.fhirId, episodeOfCareId:patientData.episodeOfCareId, encounterId:patientData.encounterId, relatedPersonId:patientData.relatedPersonId, request:request})
  })
}

function dischargePatient(patientData,request){
    return getEncounterByIdentifier(patientData.ipno,status='arrived',request)
    .then((response => {
        if(response.id){
          patientData.encounterData = JSON.parse(JSON.stringify(response));
          var encounterData = response;
          if(patientData.status === "Discharged"){
            encounterData.status = "finished";
          }
          return updateEncounter(encounterData,patientData.endDate,request, patientData.appointmentId);
        }else{
          Promise.reject("Failed to get encounter data");
        } 
    }))
    .catch((error) => {
        return Promise.reject(error);
    });
}

function updateDischargedPatientLocationDevices(bedId,patientId,request){
    return deviceProcessor.updatePatientDevices(request,bedId,patientId,"patient-discharged-location-update")
    .then((response) => {
        return Promise.resolve(response);
    })
    .catch((error) => {
       return Promise.reject(error.action);
    });
}

function updateFhirPatient(patientData,request){
    var patientReadmittedDate,patientEncounterId;
    return updatePatient(patientData,request)
     .then((response) => {
      if(patientData.relatedPersonId){
        return relatedPersonProcessor.updateRelatedPerson(patientData,request)
      }else{
        return Promise.resolve(response);
      }
     })
     .then((response)=>{
       if(patientData.status === "Discharged" || patientData.endDate){
            return dischargePatient(patientData,request);
        }else{
            if(patientData.currentBedId){
              return deviceProcessor.updatePatientDevices(request,patientData.bedId,patientData.fhirId,"patient-existing-location-update",patientData.currentBedId);
            }else{
              return Promise.resolve(response);
            }
        }
     })
     .then((response) => {
         if(response.action === "encounter updated"){
           return updateDischargedPatientLocationDevices(patientData.bedId,patientData.fhirId,request);
         }else{
             if(!patientData.encounterId){
                var encounterData = {
                    patientId: patientData.fhirId,
                    identifier: patientData.ipno,
                    episodeOfCareId: patientData.episodeOfCareId,
                    orgId: patientData.fhirOrgId,
                    status: "arrived"
                };
                return createEncounter(encounterData,request);
             }else{
               return Promise.resolve(response);
             }
         }
     })
     .then((response) => {
         if(response.action === "encounter created"){
            patientReadmittedDate = response.admittedDate;
            patientEncounterId = response.id;
            return deviceProcessor.updatePatientDevices(request,patientData.bedId,patientData.fhirId,"patient-creation-update"); 
         }else{
            return Promise.resolve(response); 
         }
     })
     .then((response) => {
         if(!patientData.encounterId){
             response.admittedDate = patientReadmittedDate;
             response.encounterId = patientEncounterId;
          }
         return Promise.resolve(response);
     })
     .catch((error) => {
         return Promise.reject(error);
     });
}

function getAllPatients(request){
    var fhirserviceurl = 'Encounter?status=arrived&_include=Encounter:patient';
    var responseMessage = {"error" : "Failed to get all patients",
                           "errorAction" : "get all patients error"
                          };

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };  
    return fhirRepoCallHandler(requestInfo,prepareAllPatientsResponse,responseMessage);
    
}

function prepareUnknownPatient(fhirData,responseMessage){
  let response = {}
  response.id = fhirData.id
  return response;
}
//these function will create unknow resource required when new hospital is created
function createUnknownPatient(fhirOrgId,request){
    var fhirServiceUrl = 'Patient';
    var responseMessage = {"success" : "Successfully patient created",
                            "error"  : "Failed to create patient"};

    var unknown_patient = JSON.parse(JSON.stringify(fhirResources.unknown_patient));
    unknown_patient.managingOrganization.reference = "Organization/" + fhirOrgId;
    
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : unknown_patient,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareUnknownPatient,responseMessage);
}

function prepareSucessData(fhirData,responseMessage){
  return responseMessage.success;
}

function deleteUnknownPatient(patientId,request){
    var fhirServiceUrl = `Patient/${patientId}`;
    var responseMessage = {"success" : "Successfully patient deleted",
                            "error"  : "Failed to delete patient"};
    var requestInfo = {
        requestMethod : 'DELETE',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareSucessData,responseMessage);
}

function prepareGetUnknownPatient(fhirData,responseMessage){
    let response = {}
    if(fhirData.entry){
       response.id = fhirData.entry[0].resource.id;
    }
    return response;
}

function getUnknownPatient(fhirOrgId,request){
    var fhirServiceUrl = `Patient?organization=${fhirOrgId}`;
    var responseMessage = {"success" : "Successfully got patient",
                            "error"  : "Failed to get patient"};

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareGetUnknownPatient,responseMessage);
}

function deleteUnknownPatientData(fhirOrgId,request){
    return getUnknownPatient(fhirOrgId,request)
    .then((response)=>{
        if(response.id){
            return deleteUnknownPatient(response.id,request)
        }else{
            return Promise.reject('Failed to delete patient');
        }
    })
    .catch((error)=>{
        return Promise.reject('Failed to delete patient');
    })
}

function deleteUpdateFhirHISPatient(patientData, request){
  return updatePatient(patientData, request)
  .then((response)=>{
    if(patientData.relatedPersonId){
      return relatedPersonProcessor.updateRelatedPerson(patientData,request)
    }else{
      return Promise.resolve(response);
    }
  })
  .then((response)=>{
    return getEncounterByIdentifier(patientData.ipno,status='planned',request)
  })
  .then((response => {
      if(response.id){
        patientData.encounterData = JSON.parse(JSON.stringify(response));
        var encounterData = response;
        encounterData.status = "planned";
        return updateEncounter(encounterData, null, request, null);
      }else{
        Promise.reject("Failed to get encounter data");
      } 
  }))
  .then((response)=>{
    return updateDischargedPatientLocationDevices(patientData.bedId,patientData.fhirId,request);
  })
  .catch((error)=>{
    return Promise.reject("Failed to update fhir patient");
  })
}

function revertUpdatedFhirHISPatient({error, patientOldData, request}){
  let errMsg = error.action ? error.action : error;
  let msg = "Failed to update fhir patient";
  if(errMsg === 'Failed to get encounter data' || errMsg === 'Failed to update Encounter'){
    return updateDischargedPatientLocationDevices(patientOldData.bedId,patientOldData.fhirId,request)
    .then((res)=>{
      if(patientOldData.relatedPersonId){
        return relatedPersonProcessor.updateRelatedPerson(patientOldData,request)
      }else{
        return Promise.resolve(response);
      }
    })
    .then((res)=>{
      return updatePatient(patientOldData, request)
    })
    .then((res)=>{
      return Promise.reject(msg);
    })
    .catch((err)=>{
      return Promise.reject(msg);
    })
  }else if(errMsg === 'Failed to update Related Person'){
    return updateDischargedPatientLocationDevices(patientOldData.bedId,patientOldData.fhirId,request)
    .then((res)=>{
      return updatePatient(patientOldData, request)
    })
    .then((res)=>{
      return Promise.reject(msg);
    })
    .catch((err)=>{
      return Promise.reject(msg);
    })
  }else if(errMsg === 'Failed to update devices'){
    return updatePatient(patientOldData, request)
    .then((res)=>{
      return Promise.reject(msg);
    })
    .catch((err)=>{
      return Promise.reject(msg);
    })
  }else{
    return Promise.reject(msg);
  }
}

function updateFhirHISPatient(patientData, request, patientOldData){
  return updatePatient(patientData, request)
  .then((response)=>{
    return deviceProcessor.updatePatientDevices(request,patientData.bedId,patientData.fhirId,"patient-creation-update");
  })
  .then((response)=>{
    if(patientData.relatedPersonId){
      return relatedPersonProcessor.updateRelatedPerson(patientData,request)
    }else{
      return Promise.resolve(response);
    }
  })
  .then((response)=>{
    return getEncounterByIdentifier(patientData.ipno,status='planned',request)
  })
  .then((response) => {
      if(response.id){
        patientData.encounterData = JSON.parse(JSON.stringify(response));
        var encounterData = response;
        if(patientData.status === "Admitted"){
          encounterData.status = "arrived";
        }
        return updateEncounter(encounterData, null, request, null);
      }else{
        return Promise.reject("Failed to get encounter data");
      } 
  })
  .catch((error)=>{
    return revertUpdatedFhirHISPatient({error:error, patientOldData:patientOldData, request:request});
  })
}

function getHISPatients(orgId, request){
  let patientsData;
  return getPatientsByOrgIdAnddStatus(orgId,'planned',request)
  .then((response)=>{
    patientsData = JSON.parse(JSON.stringify(response));
    return relatedPersonProcessor.getAllRelatedPersons(request)
  })
  .then((response)=>{
    if(patientsData.length){
      patientsData.forEach((patient)=>{
        let relatedPerson = response.find(item=> item.patientId === patient.fhirId)
        if(relatedPerson){
          patient['relatedPerson'] = relatedPerson;
        }
      });
      return Promise.resolve(patientsData);
    }else{
      return Promise.resolve(patientsData);
    }
  })
  .catch((error)=>{
    return Promise.reject('Failed to get HIS Patients')
  })
}

module.exports = {
  createFhirPatient : createFhirPatient,
  updateFhirPatient : updateFhirPatient,
  getPatientByIdentifier : getPatientByIdentifier,
  getAllPatients : getAllPatients,
  updatePatient : updatePatient,
  dischargePatient : dischargePatient,
  updateEncounter : updateEncounter,
  getPatientWithEOCByIdentifier: getPatientWithEOCByIdentifier,
  createUnknownPatient : createUnknownPatient,
  deleteUnknownPatient : deleteUnknownPatient,
  getUnknownPatient : getUnknownPatient,
  deleteUnknownPatientData : deleteUnknownPatientData,
  getPatientsByOrgIdAnddStatus : getPatientsByOrgIdAnddStatus,
  updateFhirHISPatient : updateFhirHISPatient,
  deleteUpdateFhirHISPatient : deleteUpdateFhirHISPatient,
  getHISPatients : getHISPatients,
  deletePatientFhirResources : deletePatientFhirResources
};