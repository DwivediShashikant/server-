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


function prepareProgressNote(fhirData,responseMessage){
    var allData = fhirData;
    var progressNote = {};
    if(allData.resourceType==='Condition'){
        progressNote.practitionerId = allData.asserter.reference.split('/')[1];
        progressNote.name =  allData.asserter.display;
        progressNote.createdDate = moment(allData.onsetDateTime).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
        
    }else{
        progressNote.practitionerId = allData.performer[0].reference.split('/')[1];
        progressNote.name = allData.performer[0].display;
        progressNote.createdDate = moment(allData.effectiveDateTime).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    }
    progressNote.note = allData.text.div.replace(/(<([^>]+)>)/ig, "");

    return progressNote;
}

function prepareProgressNotes(progressData){
    var progressNotes = [];
    if(progressData.entry){
        for (var progressEntries of progressData.entry) {
            var progress = progressEntries.resource;
            var progressNote = {};
            if(progress.resourceType==='Condition'){
                progressNote.practitionerId = progress.asserter.reference.split('/')[1];
                progressNote.name =  progress.asserter.display;
                progressNote.createdDate =  moment(progress.onsetDateTime).format('MM/DD/YYYY HH:mm')
            }else{
                progressNote.practitionerId = progress.performer[0].reference.split('/')[1];
                progressNote.name = progress.performer[0].display;
                progressNote.createdDate =  moment(progress.effectiveDateTime).format('MM/DD/YYYY HH:mm');
            }
            progressNote.tagCode =  progress.meta.tag[0].code;
            progressNote.note = progress.text.div.replace(/(<([^>]+)>)/ig, "");
            progressNotes.unshift(progressNote);
        }
    }
    var progressNotes = progressNotes.sort((first, second) => {
        var firstDateTime = moment(first.createdDate).tz(orgTimeZone);
        var secondDateTime = moment(second.createdDate).tz(orgTimeZone);
        return firstDateTime-secondDateTime;
    });
    progressNotes.forEach((date)=>{
        date.createdDate = moment(date.createdDate).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    });
return progressNotes;

}


function createProgressNotesByCode(progressNotesResources,progress_notes){
    let progressNotes = [];
    progressNotesResources.forEach((code)=>{
        let note = {};
        note['tagName'] = code.tagName;
        note['tagCode'] = code.tagCode;
        note['progress_notes'] = [];

        //loop - push and remove the note object
        for(let noteIndex = progress_notes.length - 1; noteIndex >= 0; noteIndex--) {
            if(progress_notes[noteIndex].tagCode === code.tagCode) {
                note['progress_notes'].push(progress_notes[noteIndex]);
               progress_notes.splice(noteIndex, 1);
            }
        }
        progressNotes.push(note);

    })
    return progressNotes;
}


function getProgressNotes(patientId, encounterId, request){
    var responseMessage = {"success": "successfully got the progress notes",
                                         "error" : "Failed to get  progress notes"};

    let observationTagCodes = [];
    let conditionTagCodes = [];
    let progressNotesPromise = [];
    let fhirServiceUrl;

    //filter the code depends on resourceType
    fhirResources.progress_notes.filter((code)=>{
        if(code.resourceType === 'condition'){
            conditionTagCodes.push(code.tagCode);
        }else{
            observationTagCodes.push(code.tagCode)
        }
    });


    [observationTagCodes,conditionTagCodes].forEach((codes)=>{
        if(codes[0] === 'cm_patient_curr_pblms' ){
            fhirServiceUrl = 'Patient/' + patientId + '/Condition?_tag='+ codes +'&code='+ codes + '&category='+ codes  +'&encounter=' + encounterId;
        }else{
            fhirServiceUrl = 'Patient/' + patientId + '/Observation?_tag='+ codes +'&code='+ codes +'&category='+ codes +'&encounter=' + encounterId;
        }

        let requestInfo = {
            requestMethod : 'GET',
            requestUrl : fhirServiceUrl,
            requestData : '',
            request : request
        };

        let note = fhirRepoCallHandler(requestInfo,prepareProgressNotes,responseMessage)
        progressNotesPromise.push(note);
    });


    return new Promise((resolve,reject)=>{
        Promise.all([progressNotesPromise[0],progressNotesPromise[1]])
        .then((data)=>{
            let notesData = [];
            notesData = notesData.concat(data[0]);
            notesData = notesData.concat(data[1]);
            let progressNotes = createProgressNotesByCode(fhirResources.progress_notes,notesData) || []
            resolve(progressNotes);
        })
        .catch((error)=>{
            reject(error);
        })
    });
}

function createProgressNote( progressData,request){
    var responseMessage = {
        "success": "successfully created progress notes",
        "error": "Failed to create progress notes"
    };
    var progressNotes,fhirServiceUrl;
    if(progressData.code === 'cm_patient_curr_pblms'){
        progressNotes = fhirResources.condition;
        fhirServiceUrl = 'Condition';
        progressNotes.meta.tag[0].display = "Current Problems";
        progressNotes.patient.reference = "Patient/" + progressData.patientId;
        progressNotes.asserter.reference = "Practitioner/" + progressData.practitionerId;
        progressNotes.asserter.display =  progressData.name;
        progressNotes.onsetDateTime = moment(progressData.createdDate).tz(orgTimeZone).format();
    }else{
        progressNotes = fhirResources.observation;
        fhirServiceUrl = 'Observation';
        progressNotes.meta.tag[0].display = "Progress Notes Observation:";
        progressNotes.subject.reference = "Patient/" + progressData.patientId;
        progressNotes.performer[0].reference = "Practitioner/" + progressData.practitionerId;
        progressNotes.performer[0].display = progressData.name;
        progressNotes.effectiveDateTime = moment(progressData.createdDate).tz(orgTimeZone).format();
    }
    progressNotes.meta.tag[0].code = progressData.code;
    progressNotes.text.div = "<div>" + progressData.note + "</div>";
    progressNotes.category.coding[0].code = progressData.code;
    progressNotes.code.coding[0].code = progressData.code;
    progressNotes.code.coding[0].display = progressData.tagName;
    progressNotes.encounter.reference = "Encounter/" + progressData.encounterId;

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : progressNotes,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareProgressNote,responseMessage);
}
module.exports = {
  createProgressNote : createProgressNote,
  getProgressNotes : getProgressNotes
};