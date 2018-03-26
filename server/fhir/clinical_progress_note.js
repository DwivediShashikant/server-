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

function createClinicalProgressNote(progressData,request){
    var fhirServiceUrl = 'Observation';
    var responseMessage = {"success" : "Successfully created progress note",
                            "error"  : "Failed to create progress note"};
    var progressNote = fhirResources.observation
    progressNote.meta.tag[0].code = "cm_doctor_progress_note";
    progressNote.meta.tag[0].display = "Progress Note Observation:";
    progressNote.text.div = "<div>" + progressData.note + "</div>";
    progressNote.category.coding[0].code = "cm_doctor_progress_note";
    progressNote.code.coding[0].code = "cm_doctor_progress_note";
    progressNote.subject.reference = "Patient/" + progressData.patientId;
    progressNote.encounter.reference = "Encounter/" + progressData.encounterId;
    progressNote.performer[0].reference = "Practitioner/" + progressData.practitionerId;
    progressNote.performer[0].display = progressData.practitionerName;
    progressNote.effectiveDateTime = moment(progressData.createdDate).tz(orgTimeZone).format();
    
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : progressNote,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareProgressNoteData,responseMessage);
}

function prepareProgressNoteData(fhirData){
    var progress = fhirData;
    var progressNote = {};
    progressNote.createdDate = moment(progress.effectiveDateTime).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    progressNote.practitionerId = progress.performer[0].reference.split('/')[1];
    progressNote.name = progress.performer[0].display;
    progressNote.note = progress.text.div.replace(/(<([^>]+)>)/ig, "");

    return progressNote;
}


function getClinicalProgressNote(patientId,encounterId,request) {
    var fhirServiceUrl = 'Patient/' + patientId + '/Observation?_tag=cm_doctor_progress_note&code=cm_doctor_progress_note&category=cm_doctor_progress_note&encounter=' + encounterId;
    var responseMessage = {"success" : "Successfully got the progress notes",
                           "error" : "Failed to get progress notes"};

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareProgressNotes,responseMessage);
}

function prepareProgressNotes(progressData){
    var progressNotes = [];
    if(progressData.entry){
        for (var progressEntries of progressData.entry) {
            var progress = progressEntries.resource;
            var progressNote = {};
            progressNote.createdDate = progress.effectiveDateTime;
            progressNote.practitionerId = progress.performer[0].reference.split('/')[1];
            progressNote.name = progress.performer[0].display;
            progressNote.note = progress.text.div.replace(/(<([^>]+)>)/ig, "");
            progressNotes.push(progressNote);     
       }
    }
    progressNotes.sort((first,second) => {
        var firstDateTime = moment(first.createdDate).tz(orgTimeZone);
        var secondDateTime = moment(second.createdDate).tz(orgTimeZone);
        return secondDateTime - firstDateTime;
    });
    progressNotes.forEach((notes)=>{
        notes.createdDate = moment(notes.createdDate).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    })

    return progressNotes;
}

module.exports = {

  createClinicalProgressNote : createClinicalProgressNote,
  getClinicalProgressNote : getClinicalProgressNote
};