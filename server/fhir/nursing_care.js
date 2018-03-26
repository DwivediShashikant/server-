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

function prepareNursingCareNotes(nursingData){
    var nursingCareNotes = [];
    if(nursingData.entry){
        var nursingEntries = nursingData.entry;  
        for (var entriesIndex=0,  entriesLength=nursingEntries.length; entriesIndex < entriesLength; entriesIndex++) {
            var nursing = nursingEntries[entriesIndex].resource;
            var nursingCareNote = {};
            if(nursing.resourceType == "Observation" && nursing.extension){
                nursingCareNote.id = nursing.id;
                nursingCareNote.practitionerId = nursing.performer[0].reference.split('/')[1];
                nursingCareNote.bodySite = nursing.bodySite.coding[0].display;
                nursingCareNote.dateofInsertion = nursing.extension[0].valuePeriod.start;
                nursingCareNote.plannedDateOfRemoval = nursing.extension[0].valuePeriod.end;
                nursingCareNote.actualDateOfRemoval = nursing.extension[2].valueDateTime ;
                nursingCareNote.size = nursing.extension[1].valueString;
                nursingCareNote.catheterType = nursing.component[0].code.coding[0].display;
                nursingCareNote.catheterId = nursing.component[0].code.coding[0].id;
                nursingCareNote.catheterCode = nursing.component[0].code.coding[0].code;
                nursingCareNotes.push(nursingCareNote);
            }
        }
    }
    return nursingCareNotes;
}

function prepareSuccessData(fhirdata,responseMessage){
    var careDataList = [];
    var careData = fhirdata;
    var lastCareData = {};
    if(careData.resourceType == "Observation" && careData.extension){
        lastCareData.id = careData.id;
        lastCareData.catheterType = careData.component[0].code.coding[0].display; 
        lastCareData.bodySite = careData.bodySite.coding[0].display;
        lastCareData.dateofInsertion = careData.extension[0].valuePeriod.start;
        lastCareData.plannedDateOfRemoval = careData.extension[0].valuePeriod.end;
        lastCareData.size = careData.extension[1].valueString;
        lastCareData.actualDateOfRemoval = careData.extension[2].valueDateTime;
        careDataList.push(lastCareData);
    } 
    return careDataList;
}

function prepareNursingDeviceList(nursingData){
    var nursingDevices = [];
    if(nursingData.entry){
        var nursingEntries = nursingData.entry;  
        for (var entriesIndex=0,  entriesLength=nursingEntries.length; entriesIndex < entriesLength; entriesIndex++) {
            var nursing = nursingEntries[entriesIndex].resource;
            if(nursing.resourceType == "ValueSet" && nursing.compose){
                // var devices = nursing.compose.include[0].concept;
                // for (var devicesIndex=0,  devicesLength=devices.length; devicesIndex < devicesLength; devicesIndex++){
                //     var nursingDeviceNote = {};
                //     nursingDeviceNote.name = devices[devicesIndex].display;
                //     nursingDeviceNote.code = devices[devicesIndex].id;
                //     nursingDevices.push(nursingDeviceNote);
                // }
                nursingDevices = nursing.compose.include[0].concept;
            }
        }
    }
    return nursingDevices;
}

function getNursingCare(patientId,encounterId,request) {
    var fhirServiceUrl = 'Patient/' + patientId + '/Observation?_tag=cm_catheter_type,cm_patient_nsng_care&code=cm_patient_nsng_care&category=cm_patient_nsng_care&encounter=' + encounterId;
    
    var responseMessage = {"success" : "Successfully got the nursing care notes",
                            "error" : "Failed to get nursing care notes"};
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    
    return fhirRepoCallHandler(requestInfo,prepareNursingCareNotes,responseMessage);
}

function getNursingDevices(request) {
    var fhirServiceUrl ='ValueSet?_tag=cm_catheter_type';

    var responseMessage = {"success" : "Successfully got the nursing devices",
                           "error" : "Failed to get nursing devices"};

    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };    
    return fhirRepoCallHandler(requestInfo,prepareNursingDeviceList,responseMessage);
}

function createNursingCare(nursingData,request) {
    var fhirServiceUrl = 'Observation';
    var responseMessage = { "success" : "Successfully created nursing care",
                           "error" : "Failed to create nursing care" };
    let nursing = prepareNursingCareData(nursingData);
    var requestInfo = {
        requestMethod: 'POST',
        requestUrl : fhirServiceUrl,
        requestData: nursing,
        request: request
    };
    return fhirRepoCallHandler(requestInfo,prepareSuccessData,responseMessage);
}

function updateNursingCare(nursingData, nursingCareId, request){
    var fhirServiceUrl = 'Observation/' + nursingCareId;
    var responseMessage = {"success" : "Successfully updated nursing care",
                          "error" : "Failed to update nursing care"};
    let nursing = prepareNursingCareData(nursingData);
    nursing.id = nursingData.id;
    nursing.meta.versionId = nursingData.id;
    
    var requestInfo = {
        requestMethod: 'PUT',
        requestUrl : fhirServiceUrl,
        requestData: nursing,
        request: request
    };
    return fhirRepoCallHandler(requestInfo,prepareSuccessData,responseMessage);

}

function prepareNursingCareData(nursingData){
    var nursing = fhirResources.nursingCare;
    nursing.category.coding[0].code = "cm_patient_nsng_care";
    nursing.code.coding[0].code = "cm_patient_nsng_care"
    nursing.category.coding[1].code = "cm_catheter_type";
    nursing.code.coding[1].code = "cm_catheter_type"
    nursing.subject.reference = "Patient/" + nursingData.patientId;
    nursing.encounter.reference = "Encounter/" + nursingData.encounterId;
    nursing.performer[0].reference = "Practitioner/" + nursingData.practitionerId;
    nursing.effectiveDateTime = moment().tz(orgTimeZone).format();
    nursing.component[0].code.coding[0].id = nursingData.catheterId;
    nursing.component[0].code.coding[0].code = nursingData.catheterCode;
    nursing.component[0].code.coding[0].display = nursingData.catheterType;
    nursing.bodySite.coding[0].display = nursingData.bodySite;
    nursing.extension[0].valuePeriod.start = nursingData.dateofInsertion;
    nursing.extension[0].valuePeriod.end = nursingData.plannedDateOfRemoval;
    nursing.extension[1].valueString = nursingData.size;
    nursing.extension[2].valueDateTime = nursingData.actualDateOfRemoval;
    return nursing;
}

module.exports = {
    createNursingCare : createNursingCare,
    getNursingCare    : getNursingCare,
    getNursingDevices : getNursingDevices,
    updateNursingCare : updateNursingCare 
};