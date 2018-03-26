const express = require('express');
const bodyParser = require('body-parser');
const http = require('request-promise');
const config = require('../config');
const common = require('../common');
const iCertainUserApi = require('../icertain/user');
const practitionerProcessor = require('../fhir/practitioner');

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
                    resolve(response);
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

function wso2ServiceHandler(requestInfo) {
    let userAdminServiceUrl = config.getServicesUrl().iamAdminServiceUrl;
    let options = {
        method: requestInfo.requestMethod,
        uri: userAdminServiceUrl,
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': 'urn:' + requestInfo.soapAction,
            'Authorization': 'Basic ' + config.getTenantConfig(requestInfo.requestHeaders["x-tennantid"]).iamAuthorisationKey
        }
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
                console.log("wso2 service error:" + JSON.stringify(err));
                reject(requestInfo.errorMessage);
            });
    });
}

function createPresenceUser(presenceUserData, request) {

    let createRequestInfo = {
        requestMethod: 'POST',
        requestUrl: 'user',
        requestData: presenceUserData,
        request: request,
        errorMessage: "Failed to create presence user"
    };

    return presenceServiceHandler(createRequestInfo);
}

function updatePresenceUser(presenceUserData, request) {

    let updateRequestInfo = {
        requestMethod: 'PUT',
        requestUrl: 'user/' + presenceUserData.id,
        requestData: presenceUserData,
        request: request,
        errorMessage: "Failed to update presence user"
    };
    return presenceServiceHandler(updateRequestInfo);
}

function deletePresenceUser(userId, request) {

    let deleteRequestInfo = {
        requestMethod: 'DELETE',
        requestUrl: 'user/' + userId,
        requestData: '',
        request: request,
        errorMessage: "Failed to delete presence user"
    };

    return presenceServiceHandler(deleteRequestInfo);
}

function createWSo2User(userData, request) {

    let wso2userData = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
        + 'xmlns:xsd="http://org.apache.axis2/xsd" '
        + 'xmlns:xsd1="http://common.mgt.user.carbon.wso2.org/xsd">'
        + '<soapenv:Header/>'
        + '<soapenv:Body>'
        + '<xsd:addUser>'
        + '<xsd:userName>' + userData.userID + '</xsd:userName>'
        + '<xsd:password>' + userData.password + '</xsd:password>'
        + '<xsd:roles>' + userData.userType + '</xsd:roles>'
        + '<xsd:claims>'
        + '<xsd1:claimURI>http://wso2.org/claims/UUID</xsd1:claimURI><xsd1:value>' + userData.id + '</xsd1:value>'
        + '</xsd:claims>'
        + '<xsd:claims>'
        + '<xsd1:claimURI>http://wso2.org/claims/Hospital</xsd1:claimURI><xsd1:value>' + userData.hospitalId + '</xsd1:value>'
        + '</xsd:claims>'
        + '<xsd:profileName>default</xsd:profileName>'
        + '</xsd:addUser>'
        + '</soapenv:Body>'
        + '</soapenv:Envelope>';

    let createRequestInfo = {
        requestMethod: 'POST',
        soapAction: 'addUser',
        requestData: wso2userData,
        requestHeaders: request.headers,
        errorMessage: "Failed to create wso2 user"
    };

    return wso2ServiceHandler(createRequestInfo);
}

function deleteWso2User(userName, request) {
    let wso2userDeleteData = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
        + 'xmlns:xsd="http://org.apache.axis2/xsd">'
        + '<soapenv:Header/>'
        + '<soapenv:Body>'
        + '<xsd:deleteUser>'
        + '<xsd:userName>' + userName + '</xsd:userName>'
        + '</xsd:deleteUser>'
        + '</soapenv:Body>'
        + '</soapenv:Envelope>';

    let deleteRequestInfo = {
        requestMethod: 'POST',
        soapAction: 'deleteUser',
        requestData: wso2userDeleteData,
        requestHeaders: request.headers,
        errorMessage: "Failed to delete wso2 user"
    };

    return wso2ServiceHandler(deleteRequestInfo);

}

function createUser(userData, request) {
    let isHospitalUser = false;
    if (userData.userType === 'HOSPITAL_DOCTOR' || userData.userType === 'HOSPITAL_NURSE') {
        isHospitalUser = true;
    }
    return createPresenceUser(userData, request)
        .then((response) => {
            userData.id = response.headers.id;
            return createWSo2User(userData, request);
        })
        .catch((error) => {
            return Promise.reject(error);
        })
        .then((response) => {
            if (request.user.userInfo.scope.indexOf('ICERTAIN_USER_WRITE') !== -1) {
                return iCertainUserApi.createiCertainUser(userData, request);
            } else {
                return Promise.resolve(response);
            }
        })
        .catch((error) => {
            return Promise.reject(error);
        })
        .then((response) => {
            if (isHospitalUser) {
                return practitionerProcessor.createPractitioner(userData, request);
            } else {
                return Promise.resolve("user created");
            }
        })
        .catch((error) => {
            if (error === "Failed to create presence user") {
                return Promise.reject("Failed to create user");
            } else if (error === "Failed to create wso2 user") {
                return deletePresenceUser(userData.id, request);
            } else if (isHospitalUser || error === "Failed to create iCertain user") {
                return deleteNonHospitalUser(userData.id, userData.userID, request);
            }
            else {
                return Promise.reject(error);
            }
        })
        .then((response) => {
            if (response === "user created" || (isHospitalUser && response === "successfully created Practitioner")) {
                return Promise.resolve("User created successfully");
            } else {
                let userCreationResponse = {
                    status: 500,
                    statusText: "Failed to create user"
                };
                return Promise.resolve(userCreationResponse);
            }
        })
        .catch((error) => {
            console.log("Request error:" + error);
            return Promise.reject("Failed to create user");
        });

}

function deleteNonHospitalUser(userId, userName, request) {
    return deletePresenceUser(userId, request)
        .then((response) => {
            return deleteWso2User(userName, request);
        })
        .catch((error) => {
            return Promise.reject("Failed to delete user");
        });
}

function deleteHospitalUser(userId, userName, fhirUserId, request) {
    return deletePresenceUser(userId, request)
        .then((response) => {
            return deleteWso2User(userName, request);
        })
        .catch((error) => {
            return Promise.reject(error);
        })
        .then((response) => {
            return practitionerProcessor.deletePractitioner(fhirUserId, request);
        })
        .catch((error) => {
            return Promise.reject(error);
        })
        .then((response) => {
            return Promise.resolve("Successfully deleted user");
        })
        .catch((error) => {
            return Promise.reject("Failed to delete user");
        });
}

function revertUpdateDetails({error,userOldData,request}){
    let errMsg = "Failed to update user";

    if(error === 'Failed to update Practitioner'){
        return updatePresenceUser(userOldData, request)
        .then((res)=>{
            if (request.user.userInfo.scope.indexOf('ICERTAIN_USER_WRITE') !== -1) {
                return iCertainUserApi.updateiCertainUser(userOldData, request);
            } else {
                return Promise.resolve("user updated successfully");
            }
        })
        .then((res)=>{
            return Promise.reject(errMsg);
        })
        .catch((err)=>{
            return Promise.reject(errMsg);
        })
    }else if(error === 'Failed to update iCertain user'){
        return updatePresenceUser(userOldData, request)
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

function updateUser(userData, request) {
    let userNewData = userData['newData'];
    let userOldData = userData['oldData'];
    if(userOldData){
        userOldData.zoomUserId = userNewData['zoomUserId'];
        userOldData.fhirHospitalId = userNewData['fhirHospitalId'];
        userOldData.fhirId = userNewData['fhirId'];
    }

    return updatePresenceUser(userNewData, request)
        .then((response) => {
            if (request.user.userInfo.scope.indexOf('ICERTAIN_USER_WRITE') !== -1) {
                return iCertainUserApi.updateiCertainUser(userNewData, request);
            } else {
                return Promise.resolve(response);
            }
        })
        .then((response) => {
            if (userNewData.userType === 'HOSPITAL_DOCTOR' || userNewData.userType === 'HOSPITAL_NURSE') {
                return practitionerProcessor.updatePractitioner(userNewData, request);
            } else {
                return Promise.resolve("Updated user sucessfully");
            }
        })
        .catch((error) => {
            if(userOldData){
                return revertUpdateDetails({error:error,userOldData:userOldData,request:request})
            }else{
                return Promise.reject("Failed to update user");
            }
        });
}

function deleteUser(userId, userName, fhirUserId, request) {
    if (request.user.userInfo.scope.indexOf('ICERTAIN_USER_WRITE') !== -1) {
        return iCertainUserApi.deleteiCertainUser(userName, request)
            .then((response) => {
                if (fhirUserId !== "notHospitalUser") {
                    return deleteHospitalUser(userId, userName, fhirUserId, request);
                } else {
                    return deleteNonHospitalUser(userId, userName, request);
                }
            })
            .catch((error) => {
                return Promise.reject("Failed to delete user");
            });
    } else {
        if (fhirUserId !== "notHospitalUser") {
            return deleteHospitalUser(userId, userName, fhirUserId, request);
        } else {
            return deleteNonHospitalUser(userId, userName, request);
        }
    }
}


module.exports = {
    createUser: createUser,
    updateUser: updateUser,
    deleteUser: deleteUser
};
