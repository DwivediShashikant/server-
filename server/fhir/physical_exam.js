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

function createClinicalDocumentPhysicalExam(clinicalDocData, request) {
    var fhirServiceUrl = 'Observation';
    var responseMessage = {
        "success": "Successfully created Clinical Documentation Physical Exam Data",
        "error": "Failed to create Clinical Documentation Physical Exam Data"
    };
    var clinicalDocObservation = fhirResources.clinicalDocObservationPhysicalExam;
    var clinicalData = clinicalDocData.physicalExamData;
    var patientData = clinicalDocData.patientData;
    var effectiveDate = clinicalDocData.effectiveDate;
    var practitionerData = clinicalDocData.practitionerData;
    clinicalDocObservation.subject.reference = "Patient/" + patientData.id;
    clinicalDocObservation.encounter.reference = "Encounter/" + patientData.encounterId;
    clinicalDocObservation.effectiveDateTime = effectiveDate;
    clinicalDocObservation.performer[0].reference = "Practitioner/" + practitionerData.id;
    clinicalDocObservation.performer[0].display = practitionerData.name;
    clinicalDocObservation.component[0].valueString = (clinicalData.generalExamination == null ? '' : clinicalData.generalExamination);
    clinicalDocObservation.component[1].valueString = (clinicalData.headEyeEnt == null ? '' : clinicalData.headEyeEnt);
    clinicalDocObservation.component[2].valueString = (clinicalData.pulse == null ? '' : clinicalData.pulse);
    clinicalDocObservation.component[3].valueString = (clinicalData.bloodPressure == null ? '' : clinicalData.bloodPressure);
    clinicalDocObservation.component[4].valueString = (clinicalData.temperature == null ? '' : clinicalData.temperature);
    clinicalDocObservation.component[5].valueString = (clinicalData.height == null ? '' : clinicalData.height);
    clinicalDocObservation.component[6].valueString = (clinicalData.weight == null ? '' : clinicalData.weight);
    clinicalDocObservation.component[7].valueString = (clinicalData.jugularVenousPressure == null ? '' : clinicalData.jugularVenousPressure);
    clinicalDocObservation.component[8].valueString = (clinicalData.cardioVascular == null ? '' : clinicalData.cardioVascular);
    clinicalDocObservation.component[9].valueString = (clinicalData.respiratorySystem == null ? '' : clinicalData.respiratorySystem);
    clinicalDocObservation.component[10].valueString = (clinicalData.centralNervousSystem == null ? '' : clinicalData.centralNervousSystem);
    clinicalDocObservation.component[11].valueString = (clinicalData.otherSystem == null ? '' : clinicalData.otherSystem);
    var requestInfo = {
        requestMethod: 'POST',
        requestUrl : fhirServiceUrl,
        requestData: clinicalDocObservation,
        request: request
    };

    return fhirRepoCallHandler(requestInfo, preparePhysicalExamData, responseMessage);
}

function updateClinicalDocumentPhysicalExam(clinicalDocData, request) {
    var responseMessage = {
        "success": "Updated Clinical Documentation Physical Exam Data",
        "error": "Failed to update Clinical Documentation Physical Exam Data"
    };
    var clinicalDocObservation = fhirResources.clinicalDocObservationPhysicalExam;

    var clinicalData = clinicalDocData.physicalExamData;
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
    clinicalDocObservation.component[0].valueString = (clinicalData.generalExamination == null ? '' : clinicalData.generalExamination);
    clinicalDocObservation.component[1].valueString = (clinicalData.headEyeEnt == null ? '' : clinicalData.headEyeEnt);
    clinicalDocObservation.component[2].valueString = (clinicalData.pulse == null ? '' : clinicalData.pulse);
    clinicalDocObservation.component[3].valueString = (clinicalData.bloodPressure == null ? '' : clinicalData.bloodPressure);
    clinicalDocObservation.component[4].valueString = (clinicalData.temperature == null ? '' : clinicalData.temperature);
    clinicalDocObservation.component[5].valueString = (clinicalData.height == null ? '' : clinicalData.height);
    clinicalDocObservation.component[6].valueString = (clinicalData.weight == null ? '' : clinicalData.weight);
    clinicalDocObservation.component[7].valueString = (clinicalData.jugularVenousPressure == null ? '' : clinicalData.jugularVenousPressure);
    clinicalDocObservation.component[8].valueString = (clinicalData.cardioVascular == null ? '' : clinicalData.cardioVascular);
    clinicalDocObservation.component[9].valueString = (clinicalData.respiratorySystem == null ? '' : clinicalData.respiratorySystem);
    clinicalDocObservation.component[10].valueString = (clinicalData.centralNervousSystem == null ? '' : clinicalData.centralNervousSystem);
    clinicalDocObservation.component[11].valueString = (clinicalData.otherSystem == null ? '' : clinicalData.otherSystem);
     var requestInfo = {
        requestMethod: 'PUT',
        requestUrl : fhirServiceUrl,
        requestData: clinicalDocObservation,
        request: request
    };
    return fhirRepoCallHandler(requestInfo, preparePhysicalExamData, responseMessage);
}

function getClinicalDocumentPhysicalExam(patientId, encounterId, request) {
    var responseMessage = {
        "success": "Loaded Clinical Documentation Physical Exam Data",
        "error": "Failed to load Clinical Documentation Physical Exam Data"
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
    var physicalExamResponse = {};
    
    if (fhirdata.entry) {
        var physicalExam = fhirdata.entry.find(data => data.resource.meta.tag[1].code === "vs.pe");
        if (physicalExam && physicalExam.resource.meta.tag[1].code==="vs.pe") {
            var physicalExamResource = physicalExam.resource;
            physicalExamResponse = preparePhysicalExamData(physicalExamResource, responseMessage);
        }
    }

    return physicalExamResponse;    
}

function preparePhysicalExamData(fhirData, responseMessage) {
    var physicalExamData = fhirData;
    var clinicalDocDataOutput = {};
    clinicalDocDataOutput.id = physicalExamData.id;
    clinicalDocDataOutput.createdDate = physicalExamData.meta.lastUpdated;
    clinicalDocDataOutput.fhirLogicalId = physicalExamData.id;
    clinicalDocDataOutput.patientId = physicalExamData.subject.reference.split('/')[1];
    clinicalDocDataOutput.encounterId = physicalExamData.encounter.reference.split('/')[1];
    clinicalDocDataOutput.generalExamination = physicalExamData.component[0].valueString;
    clinicalDocDataOutput.headEyeEnt = physicalExamData.component[1].valueString;
    clinicalDocDataOutput.pulse = physicalExamData.component[2].valueString;
    clinicalDocDataOutput.bloodPressure = physicalExamData.component[3].valueString;
    clinicalDocDataOutput.temperature = physicalExamData.component[4].valueString;
    clinicalDocDataOutput.height = physicalExamData.component[5].valueString;
    clinicalDocDataOutput.weight = physicalExamData.component[6].valueString;
    clinicalDocDataOutput.jugularVenousPressure = physicalExamData.component[7].valueString;
    clinicalDocDataOutput.cardioVascular = physicalExamData.component[8].valueString;
    clinicalDocDataOutput.respiratorySystem = physicalExamData.component[9].valueString;
    clinicalDocDataOutput.centralNervousSystem = physicalExamData.component[10].valueString;
    clinicalDocDataOutput.otherSystem = physicalExamData.component[11].valueString;
    return clinicalDocDataOutput;
}


module.exports = {
    getClinicalDocumentPhysicalExam: getClinicalDocumentPhysicalExam,
    createClinicalDocumentPhysicalExam: createClinicalDocumentPhysicalExam,
    updateClinicalDocumentPhysicalExam: updateClinicalDocumentPhysicalExam,
};