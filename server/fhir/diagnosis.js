const http = require('request-promise');
const fhirResources = require('./resources');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
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

function prepareDiagnosisNotes(diagnosisData){
    var diagnosisNotes = [];
    if(diagnosisData.entry){ 
        diagnosisData.entry.forEach((data)=>{
            var diagnosisNote = {};
            if(data.resource.resourceType == "Procedure" && data.resource.notes){
                diagnosisNote.createdDate = data.resource.performedDateTime;
                diagnosisNote.practitionerId = data.resource.performer[0].actor.reference.split('/')[1];
                diagnosisNote.name = data.resource.performer[0].actor.display;
                diagnosisNote.note = data.resource.notes[0].text;
                diagnosisNotes.push(diagnosisNote);
            }
        });
    }

    diagnosisNotes.sort((first,second) => {
        var firstDateTime = moment(first.createdDate).tz(orgTimeZone);
        var secondDateTime = moment(second.createdDate).tz(orgTimeZone);
        return secondDateTime - firstDateTime;
    });
    diagnosisNotes.forEach((notes)=>{
        notes.createdDate = moment(notes.createdDate).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    })

    return diagnosisNotes;
}

function getDiagnosis(patientId,encounterId,request) {
    var  fhirServiceUrl = 'Patient/' + patientId + '/Procedure?_tag=cm_patient_diagnosis&code=cm_patient_diagnosis&encounter=Encounter/' + encounterId;
    var responseMessage = {"success" : "successfully got the diagnosis notes",
                                                "error" : "Failed to get diagnosis notes"};

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
   
    return fhirRepoCallHandler(requestInfo,prepareDiagnosisNotes,responseMessage);

}

function prepareDiagnosisData(fhirdata){
    var diagnosis = fhirdata;
    var diagnosisNote = {};
    if (diagnosis.resourceType == "Procedure" && diagnosis.notes) 
    {
        diagnosisNote.createdDate = moment(diagnosis.performedDateTime).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
        diagnosisNote.practitionerId = diagnosis.performer[0].actor.reference.split('/')[1];
        diagnosisNote.name = diagnosis.performer[0].actor.display;
        diagnosisNote.note = diagnosis.notes[0].text;
    }
    return diagnosisNote;
}

function createDiagnosis(diagnosisData,request) {
    var fhirServiceUrl = 'Procedure';
    var responseMessage = {"success" : "successfully created diagnosis note",
                          "error" : "Failed to create diagnosis note"};
    var diagnosis = fhirResources.procedure;
    diagnosis.subject.reference = "Patient/" + diagnosisData.patientId;
    diagnosis.encounter.reference = "Encounter/" + diagnosisData.encounterId;
    diagnosis.meta.tag[0].code = "cm_patient_diagnosis";
    diagnosis.meta.tag[0].display = "Diagnosis";
    diagnosis.code.coding[0].code  = "cm_patient_diagnosis";
    diagnosis.code.coding[0].display = "Diagnosis";
    diagnosis.performer[0].actor.reference = "Practitioner/" + diagnosisData.practitionerId;
    diagnosis.performer[0].actor.display =  diagnosisData.name;
    diagnosis.notes[0].text = diagnosisData.note;
    diagnosis.performedDateTime = moment(diagnosisData.createdDate).tz(orgTimeZone).format();

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : diagnosis,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareDiagnosisData,responseMessage);
}

module.exports = {
  getDiagnosis: getDiagnosis,
  createDiagnosis: createDiagnosis
};