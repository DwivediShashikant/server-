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

function prepareProcedureNotes(procedureData) {
    var procedureNotes = [];
    if (procedureData.entry) {
        procedureData.entry.forEach((pdata)=>{
            var procedureNote = {};
            if (pdata.resource.resourceType == "Procedure" && pdata.resource.notes) {
                procedureNote.createdDate = pdata.resource.performedDateTime;
                procedureNote.practitionerId = pdata.resource.performer[0].actor.reference.split('/')[1];
                procedureNote.name = pdata.resource.performer[0].actor.display;
                procedureNote.note = pdata.resource.notes[0].text;
                procedureNotes.push(procedureNote);
            }
        })
    }
    procedureNotes.sort((first,second) => {
        var firstDateTime = moment(first.createdDate).tz(orgTimeZone);
        var secondDateTime = moment(second.createdDate).tz(orgTimeZone);
        return secondDateTime - firstDateTime;
    });

    procedureNotes.forEach((notes)=>{
        notes.createdDate = moment(notes.createdDate).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    })
    return procedureNotes;
}

function getProcedure(patientId, encounterId,request) {
   var fhirServiceUrl = 'Patient/' + patientId + '/Procedure?code=cm_patient_procedures&_tag=cm_patient_procedures&encounter=Encounter/' + encounterId;
    
    var responseMessage = {"success" : "successfully got the diagnosisProcedure notes",
                                                "error" : "Failed to get Procedure notes"};

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    
    return fhirRepoCallHandler(requestInfo,prepareProcedureNotes,responseMessage);
}

function prepareProceduredata(fhirdata, responseMessage) {
    var procedure = fhirdata;
    var procedureNote = {};
    if (procedure.resourceType == "Procedure" && procedure.notes) {
        procedureNote.createdDate = moment(procedure.performedDateTime).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
        procedureNote.practitionerId = procedure.performer[0].actor.reference.split('/')[1];
        procedureNote.name = procedure.performer[0].actor.display;
        procedureNote.note = procedure.notes[0].text;
    }
    return procedureNote;
}

function createProcedure(procedureData,request) {
    var fhirServiceUrl =  'Procedure';
    var responseMessage = {
        "success": "successfully created procedure notes",
        "error": "Failed to create procedure notes"
    };
    
    var procedure = fhirResources.procedure;
    procedure.subject.reference = "Patient/" + procedureData.patientId;
    procedure.encounter.reference = "Encounter/" + procedureData.encounterId;
    procedure.meta.tag[0].code = "cm_patient_procedures";
    procedure.meta.tag[0].display = "Procedure";
    procedure.code.coding[0].code  = "cm_patient_procedures";
    procedure.code.coding[0].display = "Procedure";
    procedure.performer[0].actor.reference = "Practitioner/" + procedureData.practitionerId;
    procedure.performer[0].actor.display =  procedureData.name;
    procedure.notes[0].text = procedureData.note;
    procedure.performedDateTime = moment(procedureData.createdDate).tz(orgTimeZone).format();

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : procedure,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareProceduredata,responseMessage);
}

module.exports = {
    getProcedure: getProcedure,
    createProcedure: createProcedure
};