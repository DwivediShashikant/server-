const http = require('request-promise');
const bodyParser = require('body-parser');
const fhirResources = require('./resources');
const deviceProcessor = require('./device');
const common = require('../common');

function fhirErrorHandler(error, responseMessage) {
    console.log("Fhir Error:" + JSON.stringify(error));
    var errorResponse = responseMessage.error;
    return errorResponse;
}

function fhirRepoCallHandler(requestInfo, fhirdatahandler, responseMessage) {
    return common.prepareCommonApiManagerRequest({ request: requestInfo.request, sessionInfo: requestInfo.request.user, identifier: 'fhir' })
        .then((response) => {
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

            if (requestInfo.requestData) {
                options.body = requestInfo.requestData
            }
            return new Promise((resolve, reject) => {
                http(options)
                    .then(function (response) {
                        var resolevedresp = fhirdatahandler(response.body, responseMessage);
                        resolve(resolevedresp);
                    })
                    .catch(function (error) {
                        var errorResponse = fhirErrorHandler(error, responseMessage);
                        reject(errorResponse);

                    });
            });
        })
        .catch((error) => {
            return new Promise((resolve, reject) => { reject(error) });
        })
}

function prepareDeleteLocationResponse(fhirdata, responseMessage) {
    return responseMessage.success;
}

function prepareCreateLocationResponse(fhirdata, responseMessage) {
    return fhirdata;
}

function prepareFhirLocationData(locationData, fhirOrgId) {
    var location = fhirResources.location;
    location.identifier[0].value = locationData.id;
    location.name = locationData.name;
    location.managingOrganization.reference = "Organization/" + fhirOrgId;

    return location;
}

function deleteLocation(fhirLocationId, request) {
    var fhirserviceurl = 'Location/' + fhirLocationId;
    var responseMessage = {
        "success": "successfully deleted location",
        "error": "Failed to delete location"
    };

    var requestInfo = {
        requestMethod: 'DELETE',
        requestUrl: fhirserviceurl,
        requestData: '',
        request: request
    };

    return fhirRepoCallHandler(requestInfo, prepareDeleteLocationResponse, responseMessage);
}

function createLocation(locationData, fhirOrgId, request) {
    var fhirserviceurl = 'Location';
    var responseMessage = {
        "success": "successfully created Location",
        "error": "Failed to create Location"
    };

    var fhirLocation = prepareFhirLocationData(locationData, fhirOrgId);

    var requestInfo = {
        requestMethod: 'POST',
        requestUrl: fhirserviceurl,
        requestData: fhirLocation,
        request: request
    };

    return fhirRepoCallHandler(requestInfo, prepareCreateLocationResponse, responseMessage);
}

function createFhirLocation(locationDetails, request) {
    var fhirLocationId;
    return createLocation(locationDetails, locationDetails.fhirOrgId, request)
        .then((response) => {
            fhirLocationId = response.id;
            if (locationDetails.devices.length > 0) {
                return deviceProcessor.updateDeviceLicenseStatus(request,locationDetails.licenses, locationDetails.devices, fhirLocationId, locationDetails.name, locationDetails.fhirOrgId, "create");
            } else {
                return Promise.resolve("Successfully updated devices");
            }
        })
        .catch((error) => {
            if (error === "Failed to update devices") {
                return deleteLocation(fhirLocationId, request);
            } else {
                return Promise.reject(error);
            }
        })
        .then((response) => {
            if (response === "Successfully updated devices") {
                return Promise.resolve("Fhir location created");
            } else {
                var locationCreationResponse = {
                    status: 500,
                    statusText: "Fhir location creation failed"
                };
                return Promise.resolve(locationCreationResponse);
            }
        })
        .catch((error) => {
            console.log("Error:" + error);
            return Promise.reject("fhir error");
        });
}

function revertDeletedFhirDevices(request,locationDevices){
    return deviceProcessor.updateDevices(request,locationDevices)
    .then((res)=>{
        return Promise.reject('Failed to update devices');
    })
    .catch((res)=>{
        return Promise.reject('Failed to update devices');
    })
}

function deleteFhirLocation(locationIndentifier, locationFhirId, request) {
    var fhirOrgId;
    var locationDevices;
    var locationLicenses;
    var oldLocationDevices;
    return deviceProcessor.getAllDevicesByLocationIdentifier(locationIndentifier, request)
        .then((response) => {
            locationDevices  = response;
            oldLocationDevices = JSON.parse(JSON.stringify(response));
            if (locationDevices.length > 0) {
                locationDevices.forEach((item)=>{
                    let statusIndex = item.resource.meta.tag.findIndex(item=>item.code === 'not-available')
                    if(statusIndex >= 0){
                        item.resource.meta.tag[statusIndex].code = 'available';
                        item.resource.meta.tag[statusIndex].display = 'License Available';
                    }
                    if(item.resource && item.resource.location){
                        delete item.resource.location;
                    }
                    if(item.resource && item.resource.patient){
                        delete item.resource.patient;
                    }
                })
            }
            return deviceProcessor.getAllLicensesByLocationIdentifier(request,locationIndentifier, "all-data");
        })
        .then((response) => {
            var locationLicenses = response;
            oldLocationDevices = oldLocationDevices.concat(JSON.parse(JSON.stringify(locationLicenses)))
            if (locationLicenses.length > 0) {
                locationLicenses.forEach((item)=>{
                    let statusIndex = item.resource.meta.tag.findIndex(item=>item.code === 'not-available')
                    if(statusIndex >= 0){
                        item.resource.meta.tag[statusIndex].code = 'available';
                        item.resource.meta.tag[statusIndex].display = 'License Available';
                    }
                    if(item.resource && item.resource.location){
                        delete item.resource.location;
                    }
                })
                var devices = locationLicenses.concat(locationDevices);
                return deviceProcessor.updateDevices(request,devices);
            } else {
                return Promise.resolve("No liecenses for location");
            }
        })
        .then((response) => {
            return deleteLocation(locationFhirId, request);
        })
        .then((res)=>{
           return Promise.resolve(oldLocationDevices);
        })
        .catch((error) => {
            if(error === 'Failed to delete location'){
                return revertDeletedFhirDevices(request,oldLocationDevices);
            }else{
                return Promise.reject(error);
            }
        });
}

function prepareGetLocationResponse(fhirdata, responseMessage) {
    return fhirdata.entry[0];
}

function getFhirLocation(locationIndentifier, request) {
    var fhirserviceurl = 'Location?identifier=' + locationIndentifier;
    var responseMessage = {
        "success": "successfully got the Location",
        "error": "Failed to get the Location"
    };


    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirserviceurl,
        requestData: '',
        request: request
    };

    return fhirRepoCallHandler(requestInfo, prepareGetLocationResponse, responseMessage);
}

module.exports = {
    createFhirLocation: createFhirLocation,
    deleteFhirLocation: deleteFhirLocation,
    getFhirLocation: getFhirLocation
};