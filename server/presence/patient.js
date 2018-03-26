const express = require('express');
const bodyParser = require('body-parser');
const http = require('request-promise');
const moment = require('moment-timezone');
const patientProcessor = require('../fhir/patient');
const flowSheetProcessor = require('../fhir/flowsheet');
var relatedPersonProcessor = require('../fhir/related_person');
const iCertainPatientApi = require('../icertain/patient');
var deviceProcessor = require('../fhir/device');
const common = require('../common');
const config = require('../config');
const fhirRepoUrl = config.getServicesUrl().fhirRepoUrl;
let orgTimeZone = config.getAppTimeZone();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function presenceServiceHandler(requestInfo) {
    return common.prepareCommonApiManagerRequest({request:requestInfo.request,sessionInfo:requestInfo.request.user,identifier:'presence'})
    .then((response) => {
        let options = {
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

        if (requestInfo.requestData) {
            options.body = requestInfo.requestData
        }

        return new Promise((resolve, reject) => {
            http(options)
                .then(function (response) {
                    if (requestInfo.action) {
                        resolve(requestInfo.action);
                    } else {
                        resolve(response);
                    }
                })
                .catch(function (err) {
                    console.log("Presence/iCertain service error:" + JSON.stringify(err));
                    reject(requestInfo.errorMessage);
                });
        });

    }).catch((error) => {
        return new Promise((resolve, reject) => { reject(error) });
    });

}

function getAllPatientsByHospitalId(hospitalId, request) {
    let createRequestInfo = {
        requestMethod: 'GET',
        requestUrl: 'patient/all/hospital/' + hospitalId,
        requestData: '',
        request: request,
        errorMessage: "Failed to get all pateints by hospital id"
    };
    return presenceServiceHandler(createRequestInfo);
}

function createPresencePatient(presencePatientData, request) {
    return getAllPatientsByHospitalId(presencePatientData.hospitalId, request)
        .then((response) => {
            let patients = response.body;
            let patientOccupied = patients.find(patient => patient.status === 'Admitted' && patient.bedId === presencePatientData.bedId);
            if (patientOccupied) {
                return Promise.reject("Selected bed is already occupied");
            } else {
                let createRequestInfo = {
                    requestMethod: 'POST',
                    requestUrl: 'patient',
                    requestData: presencePatientData,
                    request: request,
                    errorMessage: "Failed to create presence patient"
                };
                return presenceServiceHandler(createRequestInfo);
            }
        })
        .catch((error) => {
            return Promise.reject(error);
        });
}

function updatePresencePatient(presencePatientData, request) {

    let createRequestInfo = {
        requestMethod: 'PUT',
        requestUrl: 'patient/' + presencePatientData.id,
        requestData: presencePatientData,
        request: request,
        errorMessage: "Failed to update presence patient"
    };

    return presenceServiceHandler(createRequestInfo);
}

function deletePresencePatient(patientId, request) {

    let deleteRequestInfo = {
        requestMethod: 'DELETE',
        requestUrl: 'patient/' + patientId,
        requestData: '',
        request: request,
        action: "deleted presence patient",
        errorMessage: "Failed to delete presence patient"
    };

    return presenceServiceHandler(deleteRequestInfo);
}

function deletePresenceFhirPatient(presencePatientId, fhirPatientData, request) {
    return deletePresencePatient(presencePatientId, request)
        .then((response) => {
            return patientProcessor.deletePatientFhirResources(fhirPatientData.patientFhirId, fhirPatientData.episodeOfCareId, fhirPatientData.encounterId, request);
        })
        .catch((error) => {
            return Promise.reject("Failed to delete user");
        });
}

function createPatient(patientData, fhirOrgId, request) {
    let fhirPatientData;
    let userId = patientData.userId;
    return createPresencePatient(patientData, request)
        .then((response) => {
            patientData.id = response.headers.id;
            patientData.fhirOrgId = fhirOrgId;
            return patientProcessor.createFhirPatient(patientData, request);
        })
        .catch((error) => {
            return Promise.reject(error);
        })
        .then((response) => {
            if (response.statusText && response.statusText === "Fhir patient creation failed") {
                return deletePresencePatient(patientData.id, request);
            } else if (response.action && response.action === "Fhir patient created") {
                fhirPatientData = response;
                if (request.user.userInfo.scope.indexOf('ICERTAIN_PAT_WRITE') !== -1) {
                    return iCertainPatientApi.createiCertainPatient(patientData, fhirPatientData.admittedDate, fhirOrgId, userId, request);
                }
                else {
                    return Promise.resolve(response);
                }
            } else {
                return Promise.resolve("Patient creation failed");
            }
        })
        .catch((error) => {
            if (error === "Fhir patient creation failed") {
                return deletePresencePatient(patientData.id, request);
            } else if (error === "Failed to create iCertain patient") {
                return deletePresenceFhirPatient(patientData.id, fhirPatientData, request);
            }
            else {
                return Promise.reject(error);
            }
        })
        .then((response) => {
            if ((response.action && response.action === "Fhir patient created") || response === "iCertain patient created") {
                flowSheetProcessor.prepareFlowSheetForAdmittedPatient(fhirPatientData.patientFhirId, fhirPatientData.admittedDate, fhirPatientData.encounterId);
                flowSheetProcessor.prepareChartDataForAdmittedPatient(fhirPatientData.patientFhirId, fhirPatientData.admittedDate, fhirPatientData.encounterId);
                return Promise.resolve("Patient created successfully");
            } else {
                var patientCreationResponse = {
                    status: 500,
                    statusText: "Patient creation failed"
                };
                return Promise.resolve(patientCreationResponse);
            }
        })
        .catch((error) => {
            console.log("patient creation error:" + error);
            if (error === "Selected bed is already occupied") {
                return Promise.reject(error);
            } else {
                return Promise.reject("Failed to create patient");
            }
        });
}

function revertUpdatedPatientDetails({error,patientOldData,fhirOrgId,request}){
    let errMsg = 'Failed to update patient';

    if(error === 'Failed to update presence patient'){
        return patientProcessor.updateFhirPatient(patientOldData, request)
        .then((res)=>{
            return iCertainPatientApi.updateiCertainPatient(patientOldData, fhirOrgId, request)
        })
        .then((res)=>{
             return Promise.reject(errMsg)
        })
        .catch((err)=>{
            return Promise.reject(errMsg)
        })
    }else if(error === 'Failed to update devices'){
        return patientProcessor.updatePatient(patientOldData, request)
        .then((res)=>{
            if(patientOldData.relatedPersonId){
                return relatedPersonProcessor.updateRelatedPerson(patientOldData,request)
            }else{
                return Promise.resolve(res)
            }
        })
        .then((res)=>{
            return iCertainPatientApi.updateiCertainPatient(patientOldData, fhirOrgId, request)
        })
        .then((res)=>{
             return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else if(error === 'Failed to update Related Person'){
        return patientProcessor.updatePatient(patientOldData, request)
        .then((res)=>{
            return iCertainPatientApi.updateiCertainPatient(patientOldData, fhirOrgId, request)
        })
        .then((res)=>{
             return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else if(error === 'Failed to update fhir patient'){
        return iCertainPatientApi.updateiCertainPatient(patientOldData, fhirOrgId, request)
        .then((res)=>{
            return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else{
        return Promise.reject(errMsg);
    }
}

function revertDischargePatientDetails({error,patientOldData,fhirOrgId,request}){
    let errMsg = 'Failed to update patient';
    
    if(error === 'Failed to update presence patient'){
        return deviceProcessor.updatePatientDevices(patientOldData.bedId,patientOldData.fhirId,"patient-creation-update",request)
        .then((res)=>{
            return patientProcessor.updateEncounter(patientOldData.encounterData,endDate=null,request)
        })
        .then((res)=>{
            return patientProcessor.updatePatient(patientOldData, request)
        })
        .then((res)=>{
            return iCertainPatientApi.updateiCertainPatient(patientOldData, fhirOrgId, request)
        })
        .then((res)=>{
             return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else if(error === 'Failed to update devices'){
        return patientProcessor.updateEncounter(patientOldData.encounterData,endDate=null,request)
        .then((res)=>{
            return patientProcessor.updatePatient(patientOldData, request)
        })
        .then((res)=>{
            return iCertainPatientApi.updateiCertainPatient(patientOldData, fhirOrgId, request)
        })
        .then((res)=>{
             return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else if(error === 'encounter update error'){
        return patientProcessor.updatePatient(patientOldData, request)
        .then((res)=>{
            return iCertainPatientApi.updateiCertainPatient(patientOldData, fhirOrgId, request)
        })
        .then((res)=>{
             return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else if(error === 'Failed to update fhir patient'){
        return iCertainPatientApi.updateiCertainPatient(patientOldData, fhirOrgId, request)
        .then((res)=>{
            return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else{
        return Promise.reject(errMsg);
    }
}

function updateIcertainPatient({patientNewData,fhirOrgId,request}){
    if (request.user.userInfo.scope.indexOf('ICERTAIN_PAT_WRITE') !== -1) {
        if (patientNewData.status === 'Discharged') {
            return iCertainPatientApi.dischargeiCertainPatient(patientNewData, fhirOrgId, request);
        } else if(!patientNewData.encounterId){
            return iCertainPatientApi.admitiCertainPatient(patientNewData, fhirOrgId, request);
        } else {
            return iCertainPatientApi.updateiCertainPatient(patientNewData, fhirOrgId, request);
        }
    }else{
        return Promise.resolve("resolved");
    }
}
function updatePatient(patientData, patientFhirID, fhirOrgId, request) {
    let fhirPatientData;
    let patientNewData = JSON.parse(JSON.stringify(patientData['newData']));
    let patientOldData = patientData['oldData'] ? patientData['oldData'] : '';
    patientNewData.fhirId = patientFhirID;
    patientNewData.fhirOrgId = fhirOrgId;
    if(patientOldData){
        patientOldData.fhirId = patientFhirID;
        patientOldData.fhirOrgId = fhirOrgId;
        patientOldData.ipno = patientNewData.ipno;
        patientOldData.encounterId = patientNewData.encounterId;
        patientOldData.admittedDate = patientNewData.admittedDate;
        patientOldData.dateOfBirth = patientNewData.dateOfBirth;
    }
    return updateIcertainPatient({patientNewData:patientNewData, fhirOrgId:fhirOrgId, request:request})
        .then((response) => {
            return patientProcessor.updateFhirPatient(patientNewData, request);
        })
        .then((response) => {
            fhirPatientData = response;
            return updatePresencePatient(patientNewData, request)
        })
        .then((response) => {
            if (patientNewData.status === 'Discharged') {
                flowSheetProcessor.deleteFlowsheet(patientFhirID);
            }
            if (!patientNewData.encounterId) {
                flowSheetProcessor.prepareFlowSheetForAdmittedPatient(patientFhirID, fhirPatientData.admittedDate, fhirPatientData.encounterId);
                flowSheetProcessor.prepareChartDataForAdmittedPatient(patientFhirID, fhirPatientData.admittedDate, fhirPatientData.encounterId);
            }
            return Promise.resolve(response);
        })
        .catch((error) => {
            if(patientNewData.status === 'Discharged'){
                patientOldData.encounterData = patientNewData.encounterData;
                return revertDischargePatientDetails({error:error,patientOldData:patientOldData,fhirOrgId:fhirOrgId,request:request});
            }else if(patientOldData){
                return revertUpdatedPatientDetails({error:error,patientOldData:patientOldData,fhirOrgId:fhirOrgId,request:request});
            }else{
                return Promise.reject("Failed to update patient");
            }
        });
}

function getFhirPatientData(identifier, request) {
    return patientProcessor.getPatientByIdentifier(identifier, request);
}

function getFhirPatientDataWithEOC(identifier, request) {
    return patientProcessor.getPatientWithEOCByIdentifier(identifier, request);
}

function revertHISPatientDetails({error,patientOldData,fhirOrgId,patientPresenceId,request}){
    let errMsg = 'Failed to Admit the HIS patient';
    
    if(error === "Failed to create iCertain patient"){
        patientOldData.fhirOrgId = fhirOrgId;
        return patientProcessor.deleteUpdateFhirHISPatient(patientOldData, request)
        .then((res)=>{
            return deletePresencePatient(patientPresenceId, request)
        })
        .then((res)=>{
            return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else if(error === 'Failed to update fhir patient'){
        return deletePresencePatient(patientPresenceId, request)
        .then((res)=>{
            return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else{
        return Promise.reject(errMsg);
    }
}


function createHISPatient(patientData, fhirOrgId, request){
    let userId = patientData.userId;
    let patientPresenceId;
    let patientNewData = JSON.parse(JSON.stringify(patientData['newData']));
    let patientOldData = JSON.parse(JSON.stringify(patientData['oldData']));
    patientOldData.bedId = patientNewData.bedId;
    return createPresencePatient(patientNewData, request)
        .then((response) => {
            patientNewData.id = response.headers.id;
            patientPresenceId = response.headers.id;
            patientNewData.fhirOrgId = fhirOrgId;
            return patientProcessor.updateFhirHISPatient(patientNewData, request, patientOldData);
        })
        .then((response) => {
            if (request.user.userInfo.scope.indexOf('ICERTAIN_PAT_WRITE') !== -1) {
                return iCertainPatientApi.createiCertainPatient(patientNewData, patientNewData.admittedDate, fhirOrgId, userId, request);
            }
            else {
                return Promise.resolve(response);
            }
        })
        .then((response) => {
            flowSheetProcessor.prepareFlowSheetForAdmittedPatient(patientNewData.fhirId, patientNewData.admittedDate, patientNewData.encounterId);
            flowSheetProcessor.prepareChartDataForAdmittedPatient(patientNewData.fhirId, patientNewData.admittedDate, patientNewData.encounterId);
            return Promise.resolve("Patient created successfully");
        })
        .catch((error) => {
            return revertHISPatientDetails({error:error, patientOldData:patientOldData, fhirOrgId:fhirOrgId, patientPresenceId:patientPresenceId, request:request});
        });
}

module.exports = {
  createPatient : createPatient,
  updatePatient : updatePatient,
  getFhirPatientData : getFhirPatientData,
  getFhirPatientDataWithEOC: getFhirPatientDataWithEOC,
  createHISPatient : createHISPatient
};