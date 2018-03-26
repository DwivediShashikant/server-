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

function createDoctorNotes(notesData,request){
    var fhirServiceUrl = 'Communication';
    var responseMessage = {"success" : "Successfully created doctor notes",
                            "error"  : "Failed to create doctor notes"};
    var doctorNotes = fhirResources.notes;
    doctorNotes.sender.reference = "Practitioner/" + notesData.practitionerId;
    doctorNotes.sender.display = notesData.practitionerName;
    doctorNotes.payload[0].contentString = notesData.notes;
    doctorNotes.sent = notesData.createdDate;
    doctorNotes.subject.reference = "Patient/" + notesData.patientId;
    doctorNotes.encounter.reference = "Encounter/" + notesData.encounterId;

    var requestInfo = {
        requestMethod : 'POST', 
        requestUrl : fhirServiceUrl,
        requestData : doctorNotes,
        request : request
    };
    
    return fhirRepoCallHandler(requestInfo,prepareDoctorNote,responseMessage);
}

function prepareDoctorNote(fhirData){
    var doctorNotes = fhirData;
    var doctorNotesData = {};
    doctorNotesData.name = doctorNotes.sender.display;
    doctorNotesData.notes = doctorNotes.payload[0].contentString;
    doctorNotesData.createdDate = moment(doctorNotes.sent).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    
    return doctorNotesData;
}

function getDoctorNotes(patientId,encounterId,request){
    var fhirServiceUrl = "Communication?encounter=" + encounterId + "&patient=" + patientId;
    var responseMessage = {"success" : "Successfully got the doctor's notes",
                           "error" : "Failed to get doctor's notes"};
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
   
    return fhirRepoCallHandler(requestInfo,prepareDoctorNotes,responseMessage);
}

function prepareDoctorNotes(doctorNotes){
    var doctorNotesData = [];
     if(doctorNotes.entry){  
        for (var doctorNoteEntries of doctorNotes.entry) {
            var doctorNote = doctorNoteEntries.resource;
            var doctorNoteData = {};
            doctorNoteData.name = doctorNote.sender.display;
            doctorNoteData.notes = doctorNote.payload[0].contentString;
            doctorNoteData.createdDate = doctorNote.sent
            doctorNotesData.push(doctorNoteData);      
       }
    }
    doctorNotesData.sort((first,second) => {
        var firstDateTime = moment(first.createdDate).tz(orgTimeZone);
        var secondDateTime = moment(second.createdDate).tz(orgTimeZone);
        return secondDateTime-firstDateTime;
    });
    doctorNotesData.forEach((date)=>{
        date.createdDate = moment(date.createdDate).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    });
    
     return doctorNotesData;
}

module.exports = {

    createDoctorNotes : createDoctorNotes,
    getDoctorNotes : getDoctorNotes
};