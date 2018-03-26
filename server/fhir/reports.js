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

function getDischargedPatientsByOrganization(organizationId, request) {
    var fhirServiceUrl = "Composition?status=final&attester=" + organizationId + " &_include=Composition:encounter&_include=Composition:patient"
    var responseMessage = {"success" : "Got discharged patients list of the organization sccussfully!",
                           "error" : "Failed to get discharged patients list"};
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareDischargedPatientList,responseMessage);
}

function prepareDischargedPatientList(fhirData, responseMessage) {
    let patientsData = [];
    if (fhirData.entry && fhirData.entry.length > 0) {
        patientsData.patientList = fhirData.entry.filter(entry => entry.resource.resourceType === 'Patient');
        patientsData.encounterList = fhirData.entry.filter(entry => entry.resource.resourceType === 'Encounter');
        patientsData.compositionList = fhirData.entry.filter(entry => entry.resource.resourceType === 'Composition');
        patientsData.patientList.forEach((patient) => {
            let encounters = patientsData.encounterList.filter(_encounter => _encounter.resource.patient.reference.split('/')[1] === patient.resource.id);
            encounters.forEach((encounter) => {
                let patientResponse = {};
                let composition = patientsData.compositionList.find(_composition => _composition.resource.encounter.reference.split('/')[1] === encounter.resource.id);
                patientResponse.documentRefrenceId = composition.resource.section.find((selectionEntry) => selectionEntry.title === "Pdf Attachment").entry[0].reference.split('/')[1];
                patientResponse.id = patient.resource.id;
                patient.resource.name[0].family = patient.resource.name[0].family || [];
                if(patient.resource.name[0].family[0]===undefined){
                    patient.resource.name[0].family[0]= "";
                }else{}
                patientResponse.name = patient.resource.name[0].given[0] + " " + patient.resource.name[0].family[0];
                patientResponse.mrn = patient.resource.identifier[0].value;
                patientResponse.pid = patient.resource.identifier[1].value;
                patientResponse.telecom = patient.resource.telecom[0].value;
                patientResponse.birthDate = moment(patient.resource.birthDate).format("YYYY-MM-DD");
                patientResponse.gender = patient.resource.gender;
                patientResponse.ipn = encounter.resource.identifier[0].value;
                patientResponse.encounterId = encounter.resource.id;
                patientResponse.admittedDate = moment(encounter.resource.period.start).format("YYYY-MM-DD HH:mm:ss");
                patientResponse.orgId = encounter.resource.serviceProvider.reference.split('/')[1];
                patientResponse.episodeOfCareId = encounter.resource.episodeOfCare[0].reference.split('/')[1];
                patientResponse.dischargedDate = moment(encounter.resource.period.end).format("YYYY-MM-DD HH:mm:ss");
                patientsData.push(patientResponse)
            });
        })
    }

    patientsData.sort((first, second) => {
      var firstDate = moment(first.dischargedDate).tz(this.orgTimeZone);
      var secondDate = moment(second.dischargedDate).tz(this.orgTimeZone);
      return secondDate - firstDate;
    });

    patientsData.forEach((date)=>{
        date.dischargedDate = moment(date.dischargedDate).tz(orgTimeZone).format("YYYY-MM-DD HH:mm:ss");

    })
    return patientsData;
}

function getDischargedPatientPdfByDocumentRefId(documentRefrenceId, request) {
    var fhirServiceUrl = "DocumentReference/" + documentRefrenceId;
    var responseMessage = {"success" : "Got document reference of discharged patient",
                           "error" : "Failed to get document reference"};
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    return fhirRepoCallHandler(requestInfo,prepareDocumentReference,responseMessage);
}

function prepareDocumentReference(fhirData, responseMessage)
{
    let binaryPdfLinkId = fhirData.content[0].attachment.url.split('Binary/')[1];
    return binaryPdfLinkId;
}

function getBinaryPdfData(binaryPdfLinkId, request) {
    var fhirServiceUrl = "Binary/" + binaryPdfLinkId;
    var responseMessage = {"success" : "Got document reference of discharged patient",
                           "error" : "Failed to get document reference"};
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    return fhirRepoCallHandler(requestInfo,prepareBinaryPdfData,responseMessage);
}

function prepareBinaryPdfData(fhirData, responseMessage)
{
    let binaryData = {};
    binaryData.contentType = fhirData.contentType;
    binaryData.binaryContent = fhirData.content;
    return binaryData;
}


module.exports = {
    getDischargedPatientsByOrganization: getDischargedPatientsByOrganization,
    getDischargedPatientPdfByDocumentRefId: getDischargedPatientPdfByDocumentRefId,
    getBinaryPdfData: getBinaryPdfData
};