const express = require('express');
const bodyParser = require('body-parser');
const http = require('request-promise');
const locationProcessor = require('../fhir/location');
const deviceProcessor = require('../fhir/device');

const common = require('../common');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function presenceServiceHandler(requestInfo) {
    return common.prepareCommonApiManagerRequest({ request: requestInfo.request, sessionInfo: requestInfo.request.user, identifier: 'presence' })
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
                        resolve(response);
                    })
                    .catch(function (err) {
                        console.log("Presence service error:" + JSON.stringify(err));
                        reject("presence error");
                    });
            });

        }).catch((error) => {
            return new Promise((resolve, reject) => { reject(error) });
        });
}


function deletePresenceBed(bedId, request) {

    var deleteRequestInfo = {
        requestMethod: 'DELETE',
        requestUrl: 'bed/' + bedId,
        requestData: '',
        request: request
    };

    return presenceServiceHandler(deleteRequestInfo);
}

function updatePresenceBed(presenceBedData, request) {

    var createRequestInfo = {
        requestMethod: 'PUT',
        requestUrl: 'bed/' + presenceBedData.id,
        requestData: presenceBedData,
        request: request
    };

    return presenceServiceHandler(createRequestInfo);
}

function createPresenceBed(presenceBedData, request) {
    var createRequestInfo = {
        requestMethod: 'POST',
        requestUrl: 'bed',
        requestData: presenceBedData,
        request: request
    };
    return presenceServiceHandler(createRequestInfo);
}

function createBed(BedData, request) {
    return createPresenceBed(BedData, request)
        .then((response) => {
            BedData.id = response.headers.id;
            return locationProcessor.createFhirLocation(BedData, request);
        })
        .catch((error) => {
            return Promise.reject(error);
        })
        .then((response) => {
            if (response.status && response.statusText === "Fhir location creation failed") {
                return deletePresenceBed(BedData.id, request);
            } else {
                return Promise.resolve("bed created");
            }
        })
        .catch((error) => {
            if (error === "fhir error") {
                return deletePresenceBed(BedData.id, request);
            } else {
                return Promise.reject(error);
            }
        })
        .then((response) => {
            if (response === "bed created") {
                return Promise.resolve("Bed created successfully");
            } else {
                var bedCreationResponse = {
                    status: 500,
                    statusText: "Bed creation failed"
                };
                return Promise.resolve(bedCreationResponse);
            }
        })
        .catch((error) => {
            return Promise.reject("Failed to create bed");
        });
}

function revertUpdatedBedDetail({error,bedOldData,request}){
  let errMsg = "Failed to update Bed";
  error = (error && error.action) ? error.action : error;
  if(error === 'Failed to update devices' || error === 'Failed to get the Location'){
      return updatePresenceBed(bedOldData, request)
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

function updateBed(bedData, request) {
  let bedNewData = bedData['newData'];
  let bedOldData = bedData['bedOldData'];
  var fhirLocationId;
    return updatePresenceBed(bedNewData, request)
        .then((response) => {
          return locationProcessor.getFhirLocation(bedNewData.id, request)
        })
        .then((response) => {
          fhirLocationId = response.resource.id;
          return deviceProcessor.updateDeviceLicenseStatus(request, bedNewData.licenses, bedNewData.devices, fhirLocationId, bedNewData.name, bedNewData.fhirOrgId, "update", bedNewData.patientId);
        })
        .catch((error) => {
          if(bedOldData){
            return revertUpdatedBedDetail({error:error,bedOldData:bedOldData,request:request})
          }else{
            return Promise.reject(error);
          }
        });
}

function getPresenceBedByID(bedId,request){

  var createRequestInfo = {
      requestMethod : 'GET',
      requestUrl : 'bed/'+bedId,
      requestData : '',
      request : request
  };
  return presenceServiceHandler(createRequestInfo);

}

function revertDeletedBedDetail({error,bedId,fhirOrgId,devices,request}){
  let errMsg = "Failed to delete Bed";
  let presenceBedData;
  if(error === 'presence error'){
    return getPresenceBedByID(bedId,request)
    .then((res)=>{
      presenceBedData = res.body;
      presenceBedData.devices = [];
      if(devices && devices.length){
        presenceBedData.devices = devices;
      }
      presenceBedData.fhirOrgId = fhirOrgId;
      return locationProcessor.createFhirLocation(presenceBedData,request);
    })
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

function deleteBed(bedId, fhirOrgId, request) {
    return locationProcessor.getFhirLocation(bedId, request)
        .then((response) => {
          fhirLocationId = response.resource.id;
          return locationProcessor.deleteFhirLocation(bedId, fhirLocationId, request);
        })
        .then((response) => {
          devices = response;
          return deletePresenceBed(bedId, request);
        })
        .catch((error) => {
            return revertDeletedBedDetail({error:error,bedId:bedId,fhirOrgId:fhirOrgId,devices:devices,request:request})
        })
}

module.exports = {
    createBed: createBed,
    updateBed: updateBed,
    deleteBed: deleteBed
};