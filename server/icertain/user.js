const express = require('express');
const bodyParser = require('body-parser');
const http = require('request-promise');
const moment = require('moment-timezone');
const atob = require('atob');
const config = require('../config');
const common = require('../common');
const appTimeZone = config.getAppTimeZone();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


function createiCertainUser(userData, request) {
    return new Promise((resolve, reject) => {
            common.prepareCommonApiManagerRequest({request:request,sessionInfo:request.user,identifier:'iCertain'})
            .then((response) => {
                let apiUrl = response.apiUrl + '/app/maintainuser';
                let options = {
                    method: 'POST',
                    uri: apiUrl,
                    rejectUnauthorized: false,
                    headers: {
                        'Authorization': response.request.headers['Authorization']
                    },
                    body: { "username": userData.userID+'@'+request.headers["x-tennantid"], "password": userData.password, "firstName": userData.firstName, "middleName": "", "lastName": userData.lastName, "email": userData.email, "hospCode": "" },
                    resolveWithFullResponse: true,
                    json: true
                };
                //console.log("icertain create user request:"+JSON.stringify(options.body));
                http(options)
                    .then(function (response) {
                        //console.log("icertain create user response:" + JSON.stringify(response));
                        if(response.body.success === "true"){
                            resolve(response);
                        }else{
                            console.log("iCertain service error:" + response.body.message);
                            reject("Failed to create iCertain user");
                        }
                    })
                    .catch(function (err) {
                        console.log("iCertain service error:" + JSON.stringify(err));
                        reject("Failed to create iCertain user");
                    });
            })
            .catch((error) => {
                reject(error);
            });
    });
}



function updateiCertainUser(userData, request) {
    return new Promise((resolve, reject) => {
            common.prepareCommonApiManagerRequest({request:request,sessionInfo:request.user,identifier:'iCertain'})
            .then((response) => {
                let apiUrl = response.apiUrl + '/app/maintainuser';
                let options = {
                    method: 'POST',
                    uri: apiUrl,
                    rejectUnauthorized: false,
                    headers: {
                        'Authorization': response.request.headers['Authorization']
                    },
                    body: { "username": userData.userID+'@'+request.headers["x-tennantid"], "firstName": userData.firstName, "middleName": "", "lastName": userData.lastName, "email": userData.email, "hospCode": "" },
                    resolveWithFullResponse: true,
                    json: true
                };
                //console.log("icertain update user request:"+JSON.stringify(options.body));
                http(options)
                    .then(function (response) {
                        //console.log("icertain update user response:" + JSON.stringify(response));
                        if(response.body.success === "true"){
                            resolve(response);
                        }else{
                            console.log("iCertain service error:" + response.body.message);
                            reject("Failed to update iCertain user");
                        }
                    })
                    .catch(function (err) {
                        console.log("iCertain service error:" + JSON.stringify(err));
                        reject("Failed to update iCertain user");
                    });
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function deleteiCertainUser(userId, request) {
    return new Promise((resolve, reject) => {
            common.prepareCommonApiManagerRequest({request:request,sessionInfo:request.user,identifier:'iCertain'})
            .then((response) => {
                let apiUrl = response.apiUrl + '/app/deleteuser';
                let options = {
                    method: 'POST',
                    uri: apiUrl,
                    rejectUnauthorized: false,
                    headers: {
                        'Authorization': response.request.headers['Authorization']
                    },
                    body: { "username": userId+'@'+request.headers["x-tennantid"] , "hospCode": ""},
                    resolveWithFullResponse: true,
                    json: true
                };
                //console.log("icertain delete user request:"+JSON.stringify(options.body));
                http(options)
                    .then(function (response) {
                        //console.log("icertain delete user response:" + JSON.stringify(response));
                        if(response.body.success === "true"){
                            resolve(response);
                        }else{
                            console.log("iCertain service error:" + response.body.message);
                            reject("Failed to delete iCertain user");
                        }
                    })
                    .catch(function (err) {
                        console.log("iCertain service error:" + JSON.stringify(err));
                        reject("Failed to delete iCertain user");
                    });

            })
            .catch((error) => {
                reject(error);
            });
    });
}

module.exports = {
    createiCertainUser: createiCertainUser,
    updateiCertainUser: updateiCertainUser,
    deleteiCertainUser: deleteiCertainUser
};