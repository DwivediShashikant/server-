const http = require('request-promise');
const fhirResources = require('./resources');
const moment = require('moment-timezone');
const bodyParser = require('body-parser');
const common = require('../common');
const config = require('../config');
const orgTimeZone = config.getAppTimeZone();

function fhirErrorHandler(error){
    console.log("error:"+JSON.stringify(error));
    var errorResponse = {"status" : 500,
                         "statustext" : "Internal server error"};
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

function createClinicalDocumentHistory(clinicalDocData,request) {
    var fhirServiceUrl = 'Observation';
    var responseMessage = {
        "success": "Successfully created Clinical Documentation History Data",
        "error": "Failed to create Clinical Documentation History Data"
    };
    var clinicalDocObservation = fhirResources.clinicalDocObservationHistory;
    var clinicalData = clinicalDocData.historyFormData;
    var patientData = clinicalDocData.patientData;
    var effectiveDate = clinicalDocData.effectiveDate;
    var practitionerData = clinicalDocData.practitionerData;
    clinicalDocObservation.subject.reference = "Patient/" + patientData.id;
    clinicalDocObservation.encounter.reference = "Encounter/" + patientData.encounterId;
    clinicalDocObservation.effectiveDateTime = effectiveDate;
    clinicalDocObservation.performer[0].reference = "Practitioner/" + practitionerData.id;
    clinicalDocObservation.performer[0].display = practitionerData.name;
    clinicalDocObservation.component[0].valueString = (clinicalData.presentingComplaint == null ? '' : clinicalData.presentingComplaint);
    clinicalDocObservation.component[1].valueString = (clinicalData.historyOfPresentingComplaint == null ? '' : clinicalData.historyOfPresentingComplaint);
    clinicalDocObservation.component[2].valueString = (clinicalData.pastMedicalHistory == null ? '' : clinicalData.pastMedicalHistory);
    clinicalDocObservation.component[3].valueString = (clinicalData.familyHistory == null ? '' : clinicalData.familyHistory);
    clinicalDocObservation.component[4].valueString = (clinicalData.smokingAlcoholHistory == null ? '' : clinicalData.smokingAlcoholHistory);
    clinicalDocObservation.component[5].valueString = (clinicalData.occupationalHistory == null ? '' : clinicalData.occupationalHistory);
    clinicalDocObservation.component[6].valueString = (clinicalData.socialHistory == null ? '' : clinicalData.socialHistory);
    var requestInfo = {
        requestMethod: 'POST',
        requestUrl : fhirServiceUrl,
        requestData: clinicalDocObservation,
        request: request
    };
    
    return fhirRepoCallHandler(requestInfo, prepareHistoryData, responseMessage);
}

function updateClinicalDocumentHistory(clinicalDocData,request) {
    var responseMessage = {
        "success": "Updated Clinical Documentation History Data",
        "error": "Failed to update Clinical Documentation History Data"
    };
    var clinicalDocObservation = fhirResources.clinicalDocObservationHistory;
    var clinicalData = clinicalDocData.historyFormData;
    var patientData = clinicalDocData.patientData;
    var effectiveDate = clinicalDocData.effectiveDate;
    var practitionerData = clinicalDocData.practitionerData;

    var fhirServiceUrl = 'Observation/' + clinicalData.fhirLogicalId;
    clinicalDocObservation.subject.reference = "Patient/" + patientData.id;
    clinicalDocObservation.encounter.reference = "Encounter/" + patientData.encounterId;
    clinicalDocObservation.effectiveDateTime = effectiveDate;
    clinicalDocObservation.id = clinicalData.fhirLogicalId;
    clinicalDocObservation.performer[0].reference = "Practitioner/" + practitionerData.id;
    clinicalDocObservation.performer[0].display = practitionerData.name;
    clinicalDocObservation.component[0].valueString = (clinicalData.presentingComplaint == null ? '' : clinicalData.presentingComplaint);
    clinicalDocObservation.component[1].valueString = (clinicalData.historyOfPresentingComplaint == null ? '' : clinicalData.historyOfPresentingComplaint);
    clinicalDocObservation.component[2].valueString = (clinicalData.pastMedicalHistory == null ? '' : clinicalData.pastMedicalHistory);
    clinicalDocObservation.component[3].valueString = (clinicalData.familyHistory == null ? '' : clinicalData.familyHistory);
    clinicalDocObservation.component[4].valueString = (clinicalData.smokingAlcoholHistory == null ? '' : clinicalData.smokingAlcoholHistory);
    clinicalDocObservation.component[5].valueString = (clinicalData.occupationalHistory == null ? '' : clinicalData.occupationalHistory);
    clinicalDocObservation.component[6].valueString = (clinicalData.socialHistory == null ? '' : clinicalData.socialHistory);
     var requestInfo = {
        requestMethod: 'PUT',
        requestUrl : fhirServiceUrl,
        requestData: clinicalDocObservation,
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareHistoryData, responseMessage);
}

function getClinicalDocumentHistory(patientId, encounterId, request) {
    var responseMessage = {
        "success": "Loaded Clinical Documentation History Data",
        "error": "Failed to load Clinical Documentation History Data"
    };
    var fhirServiceUrl = 'Observation?_tag=cm_patient_clinical_doc&code=cm_patient_clinical_doc&category=cm_patient_clinical_doc&subject=Patient/' + patientId + '&encounter=Encounter/' + encounterId;
     var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    
    return fhirRepoCallHandler(requestInfo, prepareSuccessData, responseMessage);
}

function prepareSuccessData(fhirdata, responseMessage) {
    var historyDataResponse = {};
    
    if (fhirdata.entry) {
        var history = fhirdata.entry.find(data => data.resource.meta.tag[1].code === "vs.hy");
        if (history && history.resource.meta.tag[1].code==="vs.hy") {
            var historyResource = history.resource;
            historyDataResponse = prepareHistoryData(historyResource, responseMessage);
        } 
    }

    return historyDataResponse;    
}

function prepareHistoryData(fhirdata, responseMessage) {
    var historyData = fhirdata;
    clinicalDocDataOutput = {};
    clinicalDocDataOutput.id = historyData.id;
    clinicalDocDataOutput.createdDate = historyData.meta.lastUpdated;
    clinicalDocDataOutput.fhirLogicalId = historyData.id;
    clinicalDocDataOutput.patientId = historyData.subject.reference.split('/')[1];
    clinicalDocDataOutput.encounterId = historyData.encounter.reference.split('/')[1];
    clinicalDocDataOutput.presentingComplaint = historyData.component[0].valueString;
    clinicalDocDataOutput.historyOfPresentingComplaint = historyData.component[1].valueString;
    clinicalDocDataOutput.pastMedicalHistory = historyData.component[2].valueString;
    clinicalDocDataOutput.familyHistory = historyData.component[3].valueString;
    clinicalDocDataOutput.smokingAlcoholHistory = historyData.component[4].valueString;
    clinicalDocDataOutput.occupationalHistory = historyData.component[5].valueString;
    clinicalDocDataOutput.socialHistory = historyData.component[6].valueString;
    return clinicalDocDataOutput;
}


module.exports = {
    createClinicalDocumentHistory: createClinicalDocumentHistory,
    getClinicalDocumentHistory: getClinicalDocumentHistory,
    updateClinicalDocumentHistory: updateClinicalDocumentHistory,
};