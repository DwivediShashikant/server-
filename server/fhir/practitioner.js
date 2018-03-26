const http = require('request-promise');
const bodyParser = require('body-parser');
const fhirResources = require('./resources');
const common = require('../common');

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
             http(options)
                 .then(function(response) {
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

function preparesuccessdata(fhirdata,responseMessage){
    return responseMessage.success;
}

function preparePractitionerResponse(fhirOrgData){
    var practitionerResponse = {};
    if(fhirOrgData.entry){
       practitionerResponse.name = fhirOrgData.entry[0].resource.name.given[0];
       practitionerResponse.id = fhirOrgData.entry[0].resource.id;
       practitionerResponse.fhirOrgId = fhirOrgData.entry[0].resource.practitionerRole[0].managingOrganization.reference.split('/')[1];
    }
    return practitionerResponse;
}

function prepareFhirPractitionerData(practitionerData){
   var practitioner = fhirResources.practitioner;
   practitioner.identifier[0].value = practitionerData.id;
   practitioner.name.given[0] = practitionerData.firstName + " " + practitionerData.lastName;
   practitioner.telecom[0].value = practitionerData.mobile;
   practitioner.telecom[1].value = practitionerData.email;
   practitioner.practitionerRole[0].managingOrganization.reference = "Organization/" + practitionerData.fhirHospitalId;
   var practitionerRole = (practitionerData.userType === 'HOSPITAL_DOCTOR') ? 'Doctor' : 'Nurse';
   practitioner.practitionerRole[0].role.coding[0].code = practitionerRole;
   practitioner.practitionerRole[0].role.coding[0].display = practitionerRole;
   practitioner.qualification[0].code.text = practitionerData.qualification;

   return practitioner;
}

function preparePractitionersList(practitionersData){
    var practitionersList = [];
    if(practitionersData.entry){
        for(var dataIndex in practitionersData.entry){
           var practitioner = {};
           var practitionerData = practitionersData.entry[dataIndex].resource;
           practitioner.id = practitionerData.id;
           practitioner.name = practitionerData.name.given[0];
           practitionersList.push(practitioner);
        }
    }
    return practitionersList;
}

function createPractitioner(practitionerData,request) {
    var fhirserviceurl = 'Practitioner';
    var responseMessage = {"success" : "successfully created Practitioner",
                          "error" : "Failed to create Practitioner"};
    
    var fhirPractitioner = prepareFhirPractitionerData(practitionerData);

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirserviceurl,
        requestData : fhirPractitioner,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);

}

function updatePractitioner(practitionerData,request) {
    var fhirserviceurl = 'Practitioner/'+practitionerData.fhirId;
    var responseMessage = {"success" : "successfully updated Practitioner",
                          "error" : "Failed to update Practitioner"};
    
    var fhirPractitioner = prepareFhirPractitionerData(practitionerData);
    fhirPractitioner.id = practitionerData.fhirId;

    var requestInfo = {
        requestMethod : 'PUT',
        requestUrl : fhirserviceurl,
        requestData : fhirPractitioner,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);

}

function deletePractitioner(fhirRepoUrl,practitionerId) {
    var fhirserviceurl = 'Practitioner/' + practitionerId;
    var responseMessage = {"success" : "successfully deleted Practitioner",
                          "error" : "Failed to delete Practitioner"};

    var requestInfo = {
        requestMethod : 'DELETE',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function getPractitionerByIdentifier(identifier,request){
    var fhirserviceurl = 'Practitioner?identifier=' + identifier;
    var responseMessage = {"error" : "Failed to get Practitioner data"};

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparePractitionerResponse,responseMessage);
}

function getPractionerByRoleAndOrg(role,fhirOrgId,request){
   var fhirserviceurl = 'Practitioner?role=' + role + '&organization=' + fhirOrgId;
   var responseMessage = {"error" : "Failed to get Practitioners data"};

   var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparePractitionersList,responseMessage);
}



module.exports = {
  createPractitioner: createPractitioner,
  updatePractitioner: updatePractitioner,
  deletePractitioner: deletePractitioner,
  getPractitionerByIdentifier : getPractitionerByIdentifier,
  getPractionerByRoleAndOrg : getPractionerByRoleAndOrg
};