const http = require('request-promise');
const fhirResources = require('./resources');
const moment = require('moment-timezone');
const bodyParser = require('body-parser');
const common = require('../common');
const config = require('../config');
const orgTimeZone = config.getAppTimeZone();

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

function createMeds(medsData,request){
    var fhirServiceUrl = 'Observation';
    var responseMessage = {"success" : "Successfully created meds note",
                            "error"  : "Failed to create meds note"};
    var medsNote = fhirResources.observation
    medsNote.meta.tag[0].code = "cm_meds_administration_note";
    medsNote.meta.tag[0].display = "Meds Note Observation:";
    medsNote.text.div = "<div>" + medsData.note + "</div>";
    medsNote.category.coding[0].code = "cm_meds_administration_note";
    medsNote.code.coding[0].code = "cm_meds_administration_note";
    medsNote.subject.reference = "Patient/" + medsData.patientId;
    medsNote.encounter.reference = "Encounter/" + medsData.encounterId;
    medsNote.performer[0].reference = "Practitioner/" + medsData.practitionerId;
    medsNote.performer[0].display = medsData.practitionerName;
    medsNote.effectiveDateTime = moment(medsData.createdDate).tz(orgTimeZone).format();
    
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : medsNote,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareMedsNote,responseMessage);
}

function prepareMedsNote(fhirData){
    var meds = fhirData;
    var medsNote = {};
    medsNote.createdDate = moment(meds.effectiveDateTime).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    medsNote.practitionerId = meds.performer[0].reference.split('/')[1];
    medsNote.name = meds.performer[0].display;
    medsNote.note = meds.text.div.replace(/(<([^>]+)>)/ig, "");

    return medsNote;
}


function getMeds(patientId,encounterId,request) {
    var fhirServiceUrl = 'Patient/' + patientId + '/Observation?_tag=cm_meds_administration_note&code=cm_meds_administration_note&category=cm_meds_administration_note&encounter=' + encounterId;
    var responseMessage = {"success" : "Successfully got the meds notes",
                           "error" : "Failed to get meds notes"};

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareMedsNotes,responseMessage);
}

function prepareMedsNotes(medsData){
    var medsNotes = [];
    if(medsData.entry){
        for (var medsEntries of medsData.entry) {
            var meds = medsEntries.resource;
            var medsNote = {};
            medsNote.createdDate = meds.effectiveDateTime;
            medsNote.practitionerId = meds.performer[0].reference.split('/')[1];
            medsNote.name = meds.performer[0].display;
            medsNote.note = meds.text.div.replace(/(<([^>]+)>)/ig, "");
            medsNotes.push(medsNote);     
       }
    }
    medsNotes.sort((first,second) => {
        var firstDateTime = moment(first.createdDate).tz(orgTimeZone);
        var secondDateTime = moment(second.createdDate).tz(orgTimeZone);
        return secondDateTime - firstDateTime;
    });
    medsNotes.forEach((medsData)=>{
        medsData.createdDate= moment(medsData.createdDate).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    });

    return medsNotes;
}

function prepareUnknownMedication(fhirData,responseMessage){
    let response = {}
    response.id = fhirData.id
    return response;
}
//these function will create unknow resource required when new hospital is created
function createUnknownMedication(fhirOrgId,request){
    var fhirServiceUrl = 'Medication';
    var responseMessage = {"success" : "Successfully medication created",
                            "error"  : "Failed to create medication"};

    var unknown_medication = JSON.parse(JSON.stringify(fhirResources.unknown_medication));
    unknown_medication.manufacturer.reference = "Organization/" + fhirOrgId;
    
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : unknown_medication,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareUnknownMedication,responseMessage);
}

function prepareSucessData(fhirData,responseMessage){
    return responseMessage.success;
}

function deleteUnknownMedication(medId,request){
    var fhirServiceUrl = `Medication/${medId}`;
    var responseMessage = {"success" : "Successfully medication deleted",
                            "error"  : "Failed to delete medication"};
    var requestInfo = {
        requestMethod : 'DELETE',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareSucessData,responseMessage);
}

function prepareGetUnknownMedication(fhirData,responseMessage){
    let response = {}
    if(fhirData.entry){
       response.id = fhirData.entry[0].resource.id;
    }
    return response;
}

function getUnknownMedication(fhirOrgId,request){
    var fhirServiceUrl = `Medication?manufacturer=${fhirOrgId}`;
    var responseMessage = {"success" : "Successfully got medication",
                            "error"  : "Failed to get medication"};

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareGetUnknownMedication,responseMessage);
}

function deleteUnknownMedicationData(fhirOrgId,request){
    return getUnknownMedication(fhirOrgId,request)
    .then((response)=>{
        if(response.id){
            return deleteUnknownMedication(response.id,request)
        }else{
            return Promise.reject('Failed to delete medication');
        }
    })
    .catch((error)=>{
        return Promise.reject('Failed to delete medication');
    })
}

module.exports = {
  createMeds : createMeds,
  getMeds : getMeds,
  createUnknownMedication:createUnknownMedication,
  deleteUnknownMedication : deleteUnknownMedication,
  getUnknownMedication : getUnknownMedication,
  deleteUnknownMedicationData : deleteUnknownMedicationData
};