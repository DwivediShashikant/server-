const http = require('request-promise');
const fhirResources = require('./resources');
const moment = require('moment-timezone');
const bodyParser = require('body-parser');
const common = require('../common');
const config = require('../config');
const orgTimeZone = config.getAppTimeZone();

function fhirErrorHandler(error, responseMessage) {
    console.log("Fhir Error:" + JSON.stringify(error));
    var errorResponse = responseMessage.error;
    return errorResponse;
}

function fhirRepoCallHandler(requestInfo, fhirdatahandler, responseMessage) {
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
                    console.log('error',error)
                     var errorResponse = fhirErrorHandler(error,responseMessage);
                     reject(errorResponse);
                     
                 });
         });
    })
    .catch((error)=>{
        return new Promise((resolve, reject) => {reject(error)});
    })
}

function getDischargeSummary(patientid, encounterId, request) {
    var fhirServiceUrl = 'Composition?encounter=' + encounterId;
    var responseMessage = {
        "success": "successfully get the discharge summary",
        "error": "Failed to get discharge summary"
    };
    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirServiceUrl,
        requestData: '',
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareDischargeSummaryNotes, responseMessage);
}

function prepareDischargeSummaryNotes(dischargeSummaryData) {
    var dischargeSummaryNotes = [];
    if (dischargeSummaryData.entry) {
        var dischargeSummaryResource = dischargeSummaryData.entry[0].resource;
        var dischargeSummaryNote = {};
        dischargeSummaryNote.id = dischargeSummaryResource.id;
        dischargeSummaryNote.practitioner = dischargeSummaryResource.author[0].reference.split('/')[1];
        dischargeSummaryNote.problems = dischargeSummaryResource.section[0].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNote.pertinentInvestigations = dischargeSummaryResource.section[1].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNote.finalDiagnosisDiagnoses = dischargeSummaryResource.section[2].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNote.proceduresDone = dischargeSummaryResource.section[3].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNote.followUpInstructions = dischargeSummaryResource.section[4].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNotes.push(dischargeSummaryNote);
    }
    return dischargeSummaryNotes;
}

function createDischargeSummary(dischargeSummaryData, request) {
    var fhirServiceUrl = 'Composition';
    var responseMessage = {
        "success": "Discharge summary created successfully! ",
        "error": "Failed to create discharge summary"
    };

    var dischargeSummary = prepareDischargeSummaryDataForFhir(dischargeSummaryData);

    var requestInfo = {
        requestMethod: 'POST',
        requestUrl: fhirServiceUrl,
        requestData: dischargeSummary,
        request: request
    };

    return fhirRepoCallHandler(requestInfo, prepareDischargeSummarydata, responseMessage);
}

function updateDischargeSummary(dischargeSummaryData, request) {
    var fhirServiceUrl = 'Composition/' + dischargeSummaryData.id;
    var responseMessage = {
        "success": "Discharge Summary updated!",
        "error": "Failed to update Discharge Summary!"
    };

    var dischargeSummary = prepareDischargeSummaryDataForFhir(dischargeSummaryData);
    
    var requestInfo = {
        requestMethod: 'PUT',
        requestUrl: fhirServiceUrl,
        requestData: dischargeSummary,
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareDischargeSummarydata, responseMessage);
}

function prepareDischargeSummaryDataForFhir(dischargeSummaryData) 
{
    var dischargeSummary = Object.assign({}, fhirResources.composition);
    dischargeSummary.subject.reference = "Patient/" + dischargeSummaryData.patientData.id;
    dischargeSummary.status = "preliminary";
    if(dischargeSummaryData.id)
    {
        dischargeSummary.id = dischargeSummaryData.id;
    }
    dischargeSummary.encounter.reference = "Encounter/" + dischargeSummaryData.patientData.encounterId;
    dischargeSummary.author[0].reference = "Practitioner/" + dischargeSummaryData.practitionerData.id;
    dischargeSummary.custodian.reference = "Organization/" + dischargeSummaryData.practitionerData.fhirOrgId;
    dischargeSummary.attester[0].party.reference = "Organization/" + dischargeSummaryData.practitionerData.fhirOrgId;
    dischargeSummary.date = dischargeSummaryData.effectiveDate;
    dischargeSummary.section[0].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.problems + "</div>";
    dischargeSummary.section[1].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.pertinentInvestigations + "</div>";
    dischargeSummary.section[2].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.finalDiagnosisDiagnoses + "</div>";
    dischargeSummary.section[3].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.proceduresDone + "</div>";
    dischargeSummary.section[4].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.followUpInstructions + "</div>";
    return dischargeSummary;
}

function prepareDischargeSummarydata(fhirData, responseMessage) {
    var dischargeSummaryNotes = [];
    var dischargeSummary = fhirData;
    if (dischargeSummary.id) {
        var dischargeSummaryNote = {};
        dischargeSummaryNote.id = dischargeSummary.id;
        dischargeSummaryNote.practitioner = dischargeSummary.author[0].reference.split('/')[1];
        dischargeSummaryNote.problems = dischargeSummary.section[0].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNote.pertinentInvestigations = dischargeSummary.section[1].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNote.finalDiagnosisDiagnoses = dischargeSummary.section[2].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNote.proceduresDone = dischargeSummary.section[3].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNote.followUpInstructions = dischargeSummary.section[4].text.div.replace(/(<([^>]+)>)/ig, "");
        dischargeSummaryNotes.push(dischargeSummaryNote);
    }
    return dischargeSummaryNotes;
}


function getDocumentRefrence(patientid, encounterId, request) {
    var fhirServiceUrl = 'DocumentReference?encounter=' + encounterId;
    var responseMessage = {
        "success": "successfully get the Document Refrence",
        "error": "Failed to get Document Refrence"
    };
    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirServiceUrl,
        requestData: '',
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareDocumentRefrence, responseMessage);
}

function prepareDocumentRefrence(fhirData, responseMessage) {
    return fhirData;
}

function createDischargeSummaryPdf(dischargeSummaryData, request) {
    var fhirServiceUrl = 'create/DischargeSummary';
    var responseMessage = {
        "success": "Discharge summary pdf created successfully! ",
        "error": "Failed to create discharge summary pdf"
    };

    var dischargeSummary = Object.assign({}, fhirResources.composition);
    dischargeSummary.subject.reference = "Patient/" + dischargeSummaryData.patientData.id;
    dischargeSummary.status = "final";
    dischargeSummary.encounter.reference = "Encounter/" + dischargeSummaryData.patientData.encounterId;
    dischargeSummary.author[0].reference = "Practitioner/" + dischargeSummaryData.practitionerData.id;
    dischargeSummary.custodian.reference = "Organization/" + dischargeSummaryData.practitionerData.fhirOrgId;
    dischargeSummary.attester[0].party.reference = "Organization/" + dischargeSummaryData.practitionerData.fhirOrgId;
    dischargeSummary.date = dischargeSummaryData.effectiveDate;
    dischargeSummary.section[0].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.problems + "</div>";
    dischargeSummary.section[1].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.pertinentInvestigations + "</div>";
    dischargeSummary.section[2].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.finalDiagnosisDiagnoses + "</div>";
    dischargeSummary.section[3].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.proceduresDone + "</div>";
    dischargeSummary.section[4].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.followUpInstructions + "</div>";

    var requestInfo = {
        requestMethod: 'POST',
        requestUrl: fhirServiceUrl,
        requestData: dischargeSummary,
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareDischargeSummaryPdfData, responseMessage);
}

function prepareDischargeSummaryPdfData(fhirData, responseMessage) {
    return fhirData;
}

function createNextAppointment(appointmentData, request) {
    var fhirServiceUrl = 'Appointment';
    var responseMessage = {
        "success": "Appointment created successfully! ",
        "error": "Failed to create appointment"
    };
    var appointment = Object.assign({}, fhirResources.appointment);
    appointment.start = appointmentData.nextAppointmentDate;
    appointment.participant[0].actor.reference = "Patient/" + appointmentData.patientId;

    var requestInfo = {
        requestMethod: 'POST',
        requestUrl: fhirServiceUrl,
        requestData: appointment,
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareAppointmentData, responseMessage);
}

function prepareAppointmentData(fhirData, responseMessage) {
    var appointmentData = {};
    appointmentData.id = fhirData.id;
    return appointmentData;
}

function updateFinalDischargeSummary(dischargeSummaryData, request) {
    var fhirServiceUrl = 'create/DischargeSummary';
    var responseMessage = {
        "success": "Discharge summary pdf created successfully! ",
        "error": "Failed to create discharge summary pdf"
    };
    var dischargeSummary = Object.assign({}, fhirResources.composition);
    dischargeSummary.subject.reference = "Patient/" + dischargeSummaryData.patientData.id;
    dischargeSummary.id = dischargeSummaryData.dischargeSummaryFormData.id;
    dischargeSummary.status = "final";
    dischargeSummary.encounter.reference = "Encounter/" + dischargeSummaryData.patientData.encounterId;
    dischargeSummary.author[0].reference = "Practitioner/" + dischargeSummaryData.practitionerData.id;
    dischargeSummary.custodian.reference = "Organization/" + dischargeSummaryData.practitionerData.fhirOrgId;
    dischargeSummary.attester[0].party.reference = "Organization/" + dischargeSummaryData.practitionerData.fhirOrgId;
    dischargeSummary.date = dischargeSummaryData.effectiveDate;
    dischargeSummary.section[0].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.problems + "</div>";
    dischargeSummary.section[1].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.pertinentInvestigations + "</div>";
    dischargeSummary.section[2].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.finalDiagnosisDiagnoses + "</div>";
    dischargeSummary.section[3].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.proceduresDone + "</div>";
    dischargeSummary.section[4].text.div = "<div>" + dischargeSummaryData.dischargeSummaryFormData.followUpInstructions + "</div>";

    var requestInfo = {
        requestMethod: 'PUT',
        requestUrl: fhirServiceUrl,
        requestData: dischargeSummary,
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareDischargeSummaryPdfData, responseMessage);
}

module.exports = {
    getDischargeSummary: getDischargeSummary,
    createDischargeSummary: createDischargeSummary,
    updateDischargeSummary: updateDischargeSummary,
    getDocumentRefrence: getDocumentRefrence,
    createDischargeSummaryPdf: createDischargeSummaryPdf,
    updateFinalDischargeSummary: updateFinalDischargeSummary,
    createNextAppointment: createNextAppointment
};