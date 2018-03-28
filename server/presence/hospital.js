const express = require('express');
const bodyParser = require('body-parser');
const http = require('request-promise');
const organizationProcessor = require('../fhir/organization');
const medicationProcessor = require('../fhir/meds');
const patientProcessor = require('../fhir/patient');
const deviceProcessor = require('../fhir/device');

const common = require('../common');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function presenceServiceHandler(requestInfo){
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

    if(requestInfo.requestData){
        options.body = requestInfo.requestData
    }

    return new Promise((resolve, reject) => {
        http(options)
            .then(function(response) {
                resolve(response);
            })
            .catch(function(err) {
                console.log("Presence service error:"+JSON.stringify(err));
                reject("presence error");
            });
    });

  }).catch((error) => {
    return new Promise((resolve, reject) => {reject(error)});
  });
}

function createPresenceHospital(presenceHospitalData, request){
    var createRequestInfo = {
        requestMethod : 'POST',
        requestUrl : 'hospital',
        requestData : presenceHospitalData,
        request : request
    };
    return presenceServiceHandler(createRequestInfo);
}

function updatePresenceHospital(presenceHospitalData, request){

    var createRequestInfo = {
        requestMethod : 'PUT',
        requestUrl : 'hospital/'+ presenceHospitalData.id,
        requestData : presenceHospitalData,
        request : request
    };

    return presenceServiceHandler(createRequestInfo);
}

function deletePresenceHospital(hospitalId,request){

    var deleteRequestInfo = {
        requestMethod : 'DELETE',
        requestUrl : 'hospital/' + hospitalId,
        requestData : '',
        request : request
    };

    return presenceServiceHandler(deleteRequestInfo);   
}

function revertHospitalCreation({error,hospitalData,fhirOrgId,medicationId,patientId,request}){
  let errMsg = 'Failed to create hospital';

  if(error === 'Failed to create device'){
    return patientProcessor.deleteUnknownPatient(patientId,request)
    .then((res)=>{
      return medicationProcessor.deleteUnknownMedication(medicationId,request)
    })
    .then((res)=>{
      return organizationProcessor.deleteOrganization(fhirOrgId,request)
    })
    .then((res)=>{
      return deletePresenceHospital(hospitalData.id,request)
    })
    .then((res)=>{
         return Promise.reject(errMsg);
    })
    .catch((err)=>{
        return Promise.reject(errMsg);
    })
  }else if(error === 'Failed to create patient'){
    return medicationProcessor.deleteUnknownMedication(medicationId,request)
    .then((res)=>{
      return organizationProcessor.deleteOrganization(fhirOrgId,request)
    })
    .then((res)=>{
      return deletePresenceHospital(hospitalData.id,request)
    })
    .then((res)=>{
         return Promise.reject(errMsg);
    })
    .catch((err)=>{
        return Promise.reject(errMsg);
    })
  }else if(error === 'Failed to create medication'){
    return organizationProcessor.deleteOrganization(fhirOrgId,request)
    .then((res)=>{
      return deletePresenceHospital(hospitalData.id,request)
    })
    .then((res)=>{
         return Promise.reject(errMsg);
    })
    .catch((err)=>{
        return Promise.reject(errMsg);
    })
  }else if(error === 'Failed to create Organization'){
    return deletePresenceHospital(hospitalData.id,request)
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

function createHospital(hospitalData, mainOrgId, request){
  var fhirOrgId;
  var medicationId;
  var patientId;
   return createPresenceHospital(hospitalData,request)
   .then((response) => {
        hospitalData.id = response.headers.id;
        hospitalData.mainOrgId = mainOrgId;
        return organizationProcessor.createOrganization(hospitalData,request);
   })
   .then((response)=>{
    fhirOrgId = response.id;
    return medicationProcessor.createUnknownMedication(fhirOrgId,request)
   })
   .then((response)=>{
    medicationId = response.id;
    return patientProcessor.createUnknownPatient(fhirOrgId,request)
   })
   .then((response)=>{
    patientId = response.id;
    return deviceProcessor.createUnknownDevice(fhirOrgId,request)
   })
   .catch((error) => {
       return revertHospitalCreation({error:error,hospitalData:hospitalData,fhirOrgId:fhirOrgId,medicationId:medicationId,patientId:patientId,request:request})
   });
}

function getFhirOrgData(identifier,request){
    return organizationProcessor.getOrganizationByIdentifier(identifier,request);
}

function revertUpdatedHospitalDetail({error,hospitalOldData,request}){
  let errMsg = "Failed to update Hospital";

  if(error === 'Failed to update organization'){
      return updatePresenceHospital(hospitalOldData, request)
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

function updateHospital(hospitalData, fhirOrgId, mainOrgId, request){
  let hospitalNewData = hospitalData['newData'];
  let hospitalOldData = hospitalData['oldData'];
   return updatePresenceHospital(hospitalNewData,request)
   .then((response) => {
      hospitalNewData.fhirOrgId = fhirOrgId;
      hospitalNewData.mainOrgId = mainOrgId;
      return organizationProcessor.updateOrganization(hospitalNewData,request);
   })
   .catch((error) => {
      if(hospitalOldData){
        return revertUpdatedHospitalDetail({error:error,hospitalOldData:hospitalOldData,request:request});
      }else{
        return Promise.reject(error);
      }
   });
}

function getPresenceHospitalByID(hospitalId,request){

  var createRequestInfo = {
      requestMethod : 'GET',
      requestUrl : 'hospital/'+hospitalId,
      requestData : '',
      request : request
  };
  return presenceServiceHandler(createRequestInfo);

}


function reverDeletedHospitalDetail({error, hospitalId, fhirOrgId, tenantOrgId, request}){
  let errMsg = "Failed to delete Hospital";

  if(error === 'presence error'){
    getPresenceHospitalByID(hospitalId,request)
    .then((res)=>{
      let presenceHospitalData = res.body;
      presenceHospitalData.fhirOrgId = tenantOrgId;
      return organizationProcessor.createOrganization(hospitalData,request);
    })
    .then((res)=>{
      return deviceProcessor.createUnknownDevice(fhirOrgId,request)
    })
    .then((res)=>{
      return patientProcessor.createUnknownPatient(fhirOrgId,request)
    })
    .then((res)=>{
      return medicationProcessor.createUnknownMedication(fhirOrgId,request)
    })
    .then((res)=>{
      return Promise.reject(errMsg);
    })
    .catch((err)=>{
      return Promise.reject(errMsg);
    })
  }else if(error === 'Failed to delete organization'){
    return deviceProcessor.createUnknownDevice(fhirOrgId,request)
    .then((res)=>{
      return patientProcessor.createUnknownPatient(fhirOrgId,request)
    })
    .then((res)=>{
      return medicationProcessor.createUnknownMedication(fhirOrgId,request)
    })
    .then((res)=>{
      return Promise.reject(errMsg);
    })
    .catch((err)=>{
      return Promise.reject(errMsg);
    })
  }else if(error === 'Failed to delete device'){
    return patientProcessor.createUnknownPatient(fhirOrgId,request)
    .then((res)=>{
      return medicationProcessor.createUnknownMedication(fhirOrgId,request)
    })
    .then((res)=>{
      return Promise.reject(errMsg);
    })
    .catch((err)=>{
      return Promise.reject(errMsg);
    })
  }else if(error === 'Failed to delete patient'){
    return medicationProcessor.createUnknownMedication(fhirOrgId,request)
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

function deleteHospital(hospitalId, fhirOrgId, tenantOrgId, request){
  return medicationProcessor.deleteUnknownMedicationData(fhirOrgId,request)
  .then((response)=>{
    return patientProcessor.deleteUnknownPatientData(fhirOrgId,request);
  })
  .then((response)=>{
    return deviceProcessor.deleteUnknownDeviceData(fhirOrgId,request);
  })
  .then((response) => {
    return organizationProcessor.deleteOrganization(fhirOrgId,request);
  })
  .then((response) => {
    return deletePresenceHospital(hospitalId,request)
  })
  .catch((error) => {
    return reverDeletedHospitalDetail({error:error,hospitalId:hospitalId, fhirOrgId:fhirOrgId, tenantOrgId:tenantOrgId, request:request})
  });
}

function getHospitalbyId(hospitalId,request){
  let createRequestInfo = {
    requestMethod: 'GET',
    requestUrl: 'summaryreport/hospital/' + hospitalId,
    requestData: '',
    request: request,
    errorMessage: "Failed to get all hospital by hospital id"
  }
  return presenceServiceHandler(createRequestInfo);
}


module.exports = {
  createHospital : createHospital,
  getFhirOrgData : getFhirOrgData,
  updateHospital : updateHospital,
  deleteHospital : deleteHospital,
  getHospitalbyId : getHospitalbyId
};