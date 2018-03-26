const http = require('request-promise');
const bodyParser = require('body-parser');
const fhirResources = require('./resources');
const common = require('../common');
const config = require('../config');
const licenseConfig = config.getLicenseConfig();
const deviceTypeCodes = config.getDeviceTypeCodes();

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

function preparesuccessdata(fhirdata, responseMessage) {
    return responseMessage.success;
}

function prepareLocationDevicesList(locationDevicesData) {
    var locationDevicesList = [];
    if (locationDevicesData.entry) {
        var deviceList = locationDevicesData.entry.filter(
            devicesDataEntry => {
                if (devicesDataEntry.resource.meta.tag) {
                    return devicesDataEntry.resource.meta.tag.some(
                        tag => tag.code === config.getLicenseConfig().find(license => license.type === "device").tag)
                }
            });
       if(deviceList.length > 0){
        locationDevicesList = deviceList;
       }
    }
    return locationDevicesList;
}

function prepareDeviceData(deviceData) {
    return deviceData;
}

function prepareLocationLicensesData(licensesData, responseMessage) {
    var licenseTagsData = config.getLicenseConfig();
    var locationLicensesData = [];
    if (licensesData.entry) {
        var locationLicenses = licensesData.entry.filter(licenseData => licenseData.resource.resourceType === "Device");
        if (locationLicenses.length > 0) {
            for (var licenseTagData of licenseTagsData) {
                var licenses = locationLicenses.filter((licenseData) => licenseData.resource.meta.tag.some((tag) => tag.code === licenseTagData.tag))
                    .filter((licenseData) => licenseData.resource.meta.tag.some((tag) => tag.code === "not-available"));
                if (licenses.length > 0) {
                    licenseTagData.id = licenses[0].resource.id;
                    locationLicensesData.push(licenseTagData);
                }
            }
        }
    }
    return locationLicensesData;
}

function prepareLocationLicensesAllData(licensesData, responseMessage) {
    var licenseTagsData = config.getLicenseConfig();
    var locationLicensesData = [];
    if (licensesData.entry) {
        var locationLicenses = licensesData.entry.filter(licenseData => licenseData.resource.resourceType === "Device");
        if (locationLicenses.length > 0) {
            for (var licenseTagData of licenseTagsData) {
                var licenses = locationLicenses.filter((licenseData) => licenseData.resource.meta.tag.some((tag) => tag.code === licenseTagData.tag))
                    .filter((licenseData) => licenseData.resource.meta.tag.some((tag) => tag.code === "not-available"));
                if (licenses.length > 0) {
                    locationLicensesData = locationLicensesData.concat(licenses);
                }
            }
        }
    }
    return locationLicensesData;
}

function prepareUpdatedDevicesStatus(devicesData, responseMessage) {
    return responseMessage.success
}

function prepareLicenseAvailability(licensesData, responseMessage) {
    var licenseTagsData = responseMessage.licenseTagsData;
    var license;
    var licenseAvailabilityData = [];
    if (licensesData.entry) {
        for (var licenseTagData of licenseTagsData) {
            licenseTagData.available = isLicenseAvailable(licensesData.entry, licenseTagData.tag);
            licenseTagData.enable = false;
            licenseAvailabilityData.push(licenseTagData);
        }
    }
    return licenseAvailabilityData;
}


function prepareAvailableLicensesResponse(licensesData, responseMessage) {
    var availableLicenses = [];
    if (licensesData.entry) {
        availableLicenses = licensesData.entry.filter((licenseData) => licenseData.resource.meta.tag.some((tag) => tag.code === "available"));
    }
    return availableLicenses;
}

function prepareDeviceTransactionData(device, fhirLocationId, locationName, isEnable, patientId) {

    var deviceTransaction = {
        "resource": {},
        "request": {
            "method": "",
            "url": ""
        }
    };

    var tagStatusIndex = device.meta.tag.findIndex(tag => tag.code === "available" || tag.code === "not-available");

    if (isEnable) {
        device.meta.tag[tagStatusIndex].code = "not-available";
        device.meta.tag[tagStatusIndex].display = "License not Available";
        device.location = { "reference": "Location/" + fhirLocationId,
                            "display": locationName
                          };
        if(patientId){
            var deviceTag = licenseConfig.find(license => license.type === "device").tag;
            isDeviceTag = device.meta.tag.find(tag => tag.code === deviceTag);
            if(isDeviceTag){
                device.patient = { "reference": "Patient/" + patientId };
            }
        }
    } else {
        device.meta.tag[tagStatusIndex].code = "available";
        device.meta.tag[tagStatusIndex].display = "License Available";
        if (device.location) {
            delete device.location;
        }
        if (device.patient) {
            delete device.patient;
        }
    }

    deviceTransaction.resource = device;
    deviceTransaction.request.method = "PUT";
    deviceTransaction.request.url = "Device/" + device.id;

    return deviceTransaction;
}

function isLicenseAvailable(licensesData, licenseTag) {
    var licenses = licensesData.filter((licenseData) => licenseData.resource.meta.tag.some((tag) => tag.code === licenseTag))
        .filter((licenseData) => licenseData.resource.meta.tag.some((tag) => tag.code === "available"));
    if (licenses.length > 0) {
        return true;
    } else {
        return false;
    }
}

function getAllDevicesByLocationIdentifier(locationIdentifier, request) {

    var fhirserviceurl = 'Device?_tag=not-available&_include=Device:location&location.identifier=' + locationIdentifier;
    var responseMessage = { "error": "Failed to get location devices" };

    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirserviceurl,
        requestData: '',
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareLocationDevicesList, responseMessage);
}

function getAllLicensesByLocationIdentifier(request,locationIdentifier, responseType) {
    var licenseTagsData = config.getLicenseConfig();
    var licenseTags = "";
    for (var licenseData of licenseTagsData) {
        licenseTags = licenseTags + "," + licenseData.tag;
    }

    var responseMessage = {
        "error": "Failed to get location liecenses"
    };
    var fhirserviceurl = 'Device?_tag=' + licenseTags.substring(1) + '&_include=Device:location&location.identifier=' + locationIdentifier;
    var responseMessage = { "error": "Failed to get location licenses" };
    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirserviceurl,
        requestData: '',
        request: request
    };
    if(responseType === "all-data"){
        return fhirRepoCallHandler(requestInfo, prepareLocationLicensesAllData, responseMessage);
    } else{
        return fhirRepoCallHandler(requestInfo, prepareLocationLicensesData, responseMessage);
    }
}

function getDeviceById(deviceId, fhirOrgId, request) {
    var fhirserviceurl = 'Device/' + deviceId + '?organization=Organization/' + fhirOrgId;
    var responseMessage = { "error": "Failed to get device data" };

    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirserviceurl,
        requestData: '',
        request: request
    };

    return fhirRepoCallHandler(requestInfo, prepareDeviceData, responseMessage);
}

function updateDevices(request, devices) {
    var devicesUpdateBundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": []
    };
    for (var device of devices) {
        var deviceTransaction = {
            "resource": device.resource,
            "request": {
                "method": "PUT",
                "url": "Device/" + device.resource.id
            }
        };
        devicesUpdateBundle.entry.push(deviceTransaction);
    }

    var responseMessage = {
        "success": "Successfully updated devices",
        "error": "Failed to update devices"
    };

    var fhirserviceurl = '';

    var requestInfo = {
        requestMethod: 'POST',
        requestUrl: fhirserviceurl,
        requestData: devicesUpdateBundle,
        request: request
    };

    return fhirRepoCallHandler(requestInfo, preparesuccessdata, responseMessage);
}

function updatePatientDevices(request, newLocationIdentifier, patientId, updateAction, existingLocationIdentifier) {
    return getAllDevicesByLocationIdentifier(newLocationIdentifier, request)
        .then((response) => {
            var newLocationDevices = response;
            if (newLocationDevices.length > 0) {
                var locationId = newLocationDevices[0].locationId;
                for (var dataIndex in newLocationDevices) {
                    if (updateAction === "patient-creation-update" || updateAction === "patient-new-location-update" || updateAction === "patient-existing-location-update") {
                        newLocationDevices[dataIndex].resource.patient = { "reference": "Patient/" + patientId };
                    } else if (updateAction === "patient-discharged-location-update") {
                        delete newLocationDevices[dataIndex].resource.patient;
                    }
                }
                if(existingLocationIdentifier){
                    return getAllDevicesByLocationIdentifier(existingLocationIdentifier, request)
                           .then((response) => {
                            var existingLocationDevices = response;
                            if (existingLocationDevices.length > 0) {
                                for (var dataIndex in existingLocationDevices) {
                                  delete existingLocationDevices[dataIndex].resource.patient;
                                }
                                var devices = newLocationDevices.concat(existingLocationDevices);
                                return updateDevices(request, devices);
                            }else{
                                var devices = newLocationDevices;
                                return updateDevices(request, devices);   
                            }
                           })
                           .catch(() => {
                            var errorMessage = "Failed to get devices data";
                            return Promise.reject(errorMessage);
                           });
                }else{
                    var devices = newLocationDevices;
                    return updateDevices(request, devices);
                } 
            }else if(existingLocationIdentifier){
              return getAllDevicesByLocationIdentifier(existingLocationIdentifier, request)
               .then((response) => {
                var existingLocationDevices = response;
                if (existingLocationDevices.length > 0) {
                    for (var dataIndex in existingLocationDevices) {
                      delete existingLocationDevices[dataIndex].resource.patient;
                    }
                    var devices = existingLocationDevices;
                    return updateDevices(request, devices);
                }else{
                    var reponseMessage = "Successfully updated devices";
                    return Promise.resolve(reponseMessage)  
                }
               })
               .catch(() => {
                var errorMessage = "Failed to get devices data";
                return Promise.reject(errorMessage);
               });
            }else {
              var reponseMessage = "Successfully updated devices";
              return Promise.resolve(reponseMessage)
            }
        })
        .then((response) => {
            var reponseMessage = { action: response };
            return Promise.resolve(reponseMessage);
        })
        .catch((error) => {
            var reponseMessage = { action: "Failed to update devices" };
            return Promise.reject(reponseMessage);
        });
}

function getAvailableLicenses(licensesTagsToEnable, fhirOrgId, request) {
    var licenseTags = "";
    for (var licenseData of licensesTagsToEnable) {
        licenseTags = licenseTags + "," + licenseData.tag;
    }
    var fhirserviceurl = 'Device?_tag=' + licenseTags.substring(1) + '&organization=Organization/' + fhirOrgId;
    var responseMessage = {
        "error": "Failed to get availabile licenses"
    };

    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirserviceurl,
        requestData: '',
        request: request
    };

    return fhirRepoCallHandler(requestInfo, prepareAvailableLicensesResponse, responseMessage);
}

function updateDeviceRequestHandler(deviceUpdateRequestData, request) {
    var responseMessage = {
        "success": "Successfully updated devices",
        "error": "Failed to update devices"
    };

    var fhirserviceurl = '';

    var requestInfo = {
        requestMethod: 'POST',
        requestUrl: fhirserviceurl,
        requestData: deviceUpdateRequestData,
        request: request
    };

    return fhirRepoCallHandler(requestInfo, prepareUpdatedDevicesStatus, responseMessage);
}

function updateDeviceStatusById(request, DevicesToUpdate, deviceTransactions, fhirLocationId, locationName, fhirOrgId, action, patientId) {
    var deviceTransactionsBundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": []
    };
    var deviceTransactionData;
    deviceTransactionsBundle.entry = deviceTransactions;
    var getDevicesDataPromises = [];
    for (var deviceData of DevicesToUpdate) {
        getDevicesDataPromises.push(getDeviceById(deviceData.id, fhirOrgId, request));
    }
    return Promise.all(getDevicesDataPromises)
        .then(response => {
            var devicesDataToUpdate = response;
            for (var updateDeviceData of DevicesToUpdate) {
                var deviceData = devicesDataToUpdate.find(device => device.id === updateDeviceData.id);
                var isDeviceEnabled;
                if (action === "update" || action === "create") {
                    isDeviceEnabled = updateDeviceData.enable;
                } else if (action === "delete") {
                    isDeviceEnabled = false;
                }
                deviceTransactionData = prepareDeviceTransactionData(JSON.parse(JSON.stringify(deviceData)), fhirLocationId, locationName, isDeviceEnabled, patientId);
                deviceTransactionsBundle.entry.push(deviceTransactionData);
            }
            return updateDeviceRequestHandler(deviceTransactionsBundle, request);
        })
        .catch(error => {
            return Promise.reject('Failed to update devices');
        });
}

function updateDeviceLicenseStatus(request,licensesTagData, DevicesData, fhirLocationId, locationName, fhirOrgId, action, patientId) {
    var deviceTransactionsBundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": []
    };
    var deviceTransactionData;
    if (action === "create" || action === "update") {
        var licensesTagsToEnable = licensesTagData.filter(licenseTagData => licenseTagData.enable == true && !licenseTagData.id);
        if (licensesTagsToEnable.length > 0) {
            return getAvailableLicenses(licensesTagsToEnable, fhirOrgId, request)
                .then((response) => {
                  var DevicesToUpdate = [];
                    var availableLicenses = response;
                    if (availableLicenses.length > 0) {
                        for (var licenseTagData of licensesTagsToEnable) {
                            if (!isLicenseAvailable(availableLicenses, licenseTagData.tag)) {
                                return Promise.reject("License not available for " + licenseTagData.name);
                            }
                        }
                    } else {
                        return Promise.reject("Licenses are not available");
                    }

                    for (var licenseTagData of licensesTagsToEnable) {
                        var license = availableLicenses.filter((licenseData) => licenseData.resource.meta.tag.some((tag) => tag.code === licenseTagData.tag))[0];
                        deviceTransactionData = prepareDeviceTransactionData(JSON.parse(JSON.stringify(license.resource)), fhirLocationId, locationName, licenseTagData.enable);
                        deviceTransactionsBundle.entry.push(deviceTransactionData);
                    }
                    if (action === "update") {
                        DevicesToUpdate = licensesTagData.filter(licenseTagData => licenseTagData.id);
                        if (DevicesToUpdate.length > 0) {
                            if(DevicesData.length > 0){
                                DevicesToUpdate = DevicesToUpdate.concat(DevicesData);
                            }
                            return updateDeviceStatusById(request, DevicesToUpdate, deviceTransactionsBundle.entry, fhirLocationId, locationName, fhirOrgId, action, patientId);
                        } else {
                            if(DevicesData.length > 0){
                                DevicesToUpdate = DevicesToUpdate.concat(DevicesData);
                                return updateDeviceStatusById(request, DevicesToUpdate, deviceTransactionsBundle.entry, fhirLocationId, locationName, fhirOrgId, action, patientId);
                            }else{
                                return updateDeviceRequestHandler(deviceTransactionsBundle, request);
                            }
                        }
                    } else {
                        if(DevicesData.length > 0){
                            DevicesToUpdate = DevicesToUpdate.concat(DevicesData);
                            return updateDeviceStatusById(request, DevicesToUpdate, deviceTransactionsBundle.entry, fhirLocationId, locationName, fhirOrgId, action, patientId);
                        }else{
                            return updateDeviceRequestHandler(deviceTransactionsBundle, request);
                        }
                    }
                })
                .then((response) => {
                    return Promise.resolve("Successfully updated devices");
                })
                .catch((error) => {
                    console.log("Error while updating devices:" + error);
                    return Promise.reject("Failed to update devices");
                });
        } else if (action === "update") {
            var DevicesToUpdate = [];
            DevicesToUpdate = licensesTagData.filter(licenseTagData => licenseTagData.id);
            if (DevicesToUpdate.length > 0) {
                if(DevicesData.length > 0){
                    DevicesToUpdate = DevicesToUpdate.concat(DevicesData);
                }
                return updateDeviceStatusById(request, DevicesToUpdate, deviceTransactionsBundle.entry, fhirLocationId, locationName, fhirOrgId, action, patientId);
            } else {
                return Promise.resolve("Successfully updated devices");
            }
        } else if (action === "create") {
            return Promise.resolve("Successfully updated devices");
        }
    }
    else {
        var DevicesToUpdate = [];
        DevicesToUpdate = licensesTagData.filter(licenseTagData => licenseTagData.id);
        if (DevicesToUpdate.length > 0) {
            if(DevicesData.length > 0){
                DevicesToUpdate = DevicesToUpdate.concat(DevicesData);
            }
            return updateDeviceStatusById(request, DevicesToUpdate, deviceTransactionsBundle.entry, fhirLocationId, locationName, fhirOrgId, action, patientId);
        } else {
            return Promise.resolve("Successfully updated licenses");
        }
    }
}

function prepareDevicesList(devicesData) {
    var devicesList = [];
    if (devicesData.entry) {
        for (var deviceTypeCode of deviceTypeCodes) {
            var devices = devicesData.entry.filter((deviceData) => deviceData.resource.type.coding.some((deviceType) => deviceType.code === deviceTypeCode.code));
            if (devices.length > 0) {
                var deviceTypeData = {};
                deviceTypeData.type = devices[0].resource.type.coding.filter(typeData => typeData.code === deviceTypeCode.code)[0].display;
                deviceTypeData.associate = deviceTypeCode.associate;
                deviceTypeData.devices = [];
                for (var device of devices) {
                    var deviceData = {};
                    deviceData.id = device.resource.id;
                    deviceData.name = device.resource.type.coding[0].display;
                    deviceData.status = device.resource.meta.tag.filter((statusTag) => statusTag.code === "not-available" || statusTag.code === "available")[0].code;
                    if (deviceData.status === "not-available") {
                        deviceData.locationId = device.resource.location.reference.split("/")[1];
                        deviceData.locationName = device.resource.location.display;
                    }
                    deviceTypeData.devices.push(deviceData);
                }
                devicesList.push(deviceTypeData);
            }
        }
    }
    return devicesList;
}


function getAllDevicesByOrg(fhirOrgId, request) {
    var deviceTag = licenseConfig.find(license => license.type === "device").tag;
    var fhirserviceurl = 'Device?_tag=' + deviceTag + '&organization=Organization/' + fhirOrgId;
    var responseMessage = { "error": "Failed to get devices" };
    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirserviceurl,
        requestData: '',
        request: request
    };

    return fhirRepoCallHandler(requestInfo, prepareDevicesList, responseMessage);
}

function checkLicenseAvailabilityByOrg(fhirOrgId, request) {
    var licenseTags = "";
    var licenseTagsData = licenseConfig.filter(configData => configData.type !== "device");
    for (var licenseData of licenseTagsData) {
        licenseTags = licenseTags + "," + licenseData.tag;
    }
    var fhirserviceurl = 'Device?_tag=' + licenseTags.substring(1) + '&organization=Organization/' + fhirOrgId;
    var responseMessage = {
        "error": "Failed to check license availability",
        "licenseTagsData": licenseTagsData
    };

    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirserviceurl,
        requestData: '',
        request: request
    };

    return fhirRepoCallHandler(requestInfo, prepareLicenseAvailability, responseMessage);
}

function prepareUnknownDevice(fhirData,responseMessage){
  let response = {}
  response.id = fhirData.id
  return response;
}
//these function will create unknow resource required when new hospital is created
function createUnknownDevice(fhirOrgId,request){
    var fhirServiceUrl = 'Device';
    var responseMessage = {"success" : "Successfully device created",
                            "error"  : "Failed to create device"};

    var unknown_device = JSON.parse(JSON.stringify(fhirResources.unknown_device));
    unknown_device.owner.reference = "Organization/" + fhirOrgId;
    
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : unknown_device,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareUnknownDevice,responseMessage);
}

function prepareSucessData(fhirData,responseMessage){
  return responseMessage.success;
}

function deleteUnknownDevice(deviceId,request){
    var fhirServiceUrl = `Device/${deviceId}`;
    var responseMessage = {"success" : "Successfully device deleted",
                            "error"  : "Failed to delete device"};
    var requestInfo = {
        requestMethod : 'DELETE',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    return fhirRepoCallHandler(requestInfo,prepareSucessData,responseMessage);
}

function prepareGetUnknownDevice(fhirData,responseMessage){
    let response = {}
    if(fhirData.entry){
       response.id = fhirData.entry[0].resource.id;
    }
    return response;
}

function getUnknownDevice(fhirOrgId,request){
    var fhirServiceUrl = `Device?organization=${fhirOrgId}`;
    var responseMessage = {"success" : "Successfully got device",
                            "error"  : "Failed to get device"};
                            
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareGetUnknownDevice,responseMessage);
}

function deleteUnknownDeviceData(fhirOrgId,request){
    return getUnknownDevice(fhirOrgId,request)
    .then((response)=>{
        if(response.id){
            return deleteUnknownDevice(response.id,request)
        }else{
            return Promise.reject('Failed to delete device');
        }
    })
    .catch((error)=>{
        return Promise.reject('Failed to delete device');
    })
}

module.exports = {
    getAllDevicesByOrg: getAllDevicesByOrg,
    checkLicenseAvailabilityByOrg: checkLicenseAvailabilityByOrg,
    getAllDevicesByLocationIdentifier: getAllDevicesByLocationIdentifier,
    getAllLicensesByLocationIdentifier: getAllLicensesByLocationIdentifier,
    updatePatientDevices: updatePatientDevices,
    updateDeviceLicenseStatus: updateDeviceLicenseStatus,
    updateDevices: updateDevices,
    createUnknownDevice : createUnknownDevice,
    deleteUnknownDevice : deleteUnknownDevice,
    getUnknownDevice : getUnknownDevice,
    deleteUnknownDeviceData : deleteUnknownDeviceData
};