const express = require('express');
const bodyParser = require('body-parser');
const http = require('request-promise');
const moment = require('moment-timezone');
const atob = require('atob');
const config = require('../config');
const common = require('../common');
let orgTimeZone = config.getAppTimeZone();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function createiCertainPatient(patientData, admittedDate, fhirOrgId, userId, request) {
    return new Promise((resolve, reject) => {
            common.prepareCommonApiManagerRequest({request:request,sessionInfo:request.user,identifier:'iCertain'})
            .then((response) => {
                let apiUrl = response.apiUrl + '/maintainpatient';
                let options = {
                    method: 'POST',
                    uri: apiUrl,
                    rejectUnauthorized: false,
                    headers: {
                        'Authorization': response.request.headers['Authorization']
                    },
                    body: { "firstName": patientData.name.split(':')[0], "middleName": "", "lastName": patientData.name.split(':')[1], "gender": patientData.gender, "ctnID": patientData.mrn, "dischargeDT": "0000-00-00 00:00:00", "userAdmit": userId+'@'+request.headers["x-tennantid"], "height": "", "bloodType": "", "adminDT": moment(admittedDate).tz(orgTimeZone).format("YYYY-MM-DD HH:mm:ss"), "codeStatus": "Unknown", "weight": "", "hospCode": patientData.hospitalId, "age": "" },
                    resolveWithFullResponse: true,
                    json: true
                };

                //console.log("icertain create patient request:" + JSON.stringify(options.body));

                http(options)
                    .then(function (response) {
                        //console.log("icertain create patient response:" + JSON.stringify(response));
                        if(response.body.success === "true"){
                            resolve("iCertain patient created");
                        }else{
                            console.log("iCertain service error:" + response.body.message);
                            reject("Failed to create iCertain patient");
                        }
                    })
                    .catch(function (err) {
                        console.log("iCertain service error:" + JSON.stringify(err));
                        reject("Failed to create iCertain patient");
                    });
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function updateiCertainPatient(patientData, fhirOrgId, request) {
    return new Promise((resolve, reject) => {
            common.prepareCommonApiManagerRequest({request:request,sessionInfo:request.user,identifier:'iCertain'})
            .then((response) => {
                let apiUrl = response.apiUrl + '/maintainpatient';
                let options = {
                    method: 'POST',
                    uri: apiUrl,
                    rejectUnauthorized: false,
                    headers: {
                        'Authorization': response.request.headers['Authorization']
                    },
                    body: { "firstName": patientData.name, "middleName": "", "lastName": "", "gender": patientData.gender, "ctnID": patientData.mrn, "dischargeDT": "0000-00-00 00:00:00", "userAdmit": patientData.userId+'@'+request.headers["x-tennantid"], "height": "", "bloodType": "", "adminDT": moment(patientData.admittedDate).tz(orgTimeZone).format("YYYY-MM-DD HH:mm:ss"), "codeStatus": "Unknown", "weight": "", "hospCode": patientData.hospitalId, "age": "" },
                    resolveWithFullResponse: true,
                    json: true
                };

                //console.log("icertain update patient request:" + JSON.stringify(options.body));

                http(options)
                    .then(function (response) {
                        // console.log("icertain update patient response:" + JSON.stringify(response));
                        if(response.body.success === "true"){
                            resolve("iCertain patient updated");
                        }else{
                            console.log("iCertain service error:" + response.body.message);
                            reject("Failed to update iCertain patient");
                        }
                    })
                    .catch(function (err) {
                        console.log("iCertain service error:" + JSON.stringify(err));
                        reject("Failed to update iCertain patient");
                    });

            })
            .catch((error) => {
                reject(error);
            });
    });
}

function admitiCertainPatient(patientData, fhirOrgId, request){
    return new Promise((resolve, reject) => {
            common.prepareCommonApiManagerRequest({request:request,sessionInfo:request.user,identifier:'iCertain'})
            .then((response) => {
                let apiUrl = response.apiUrl + '/admitpatient';
                let options = {
                    method: 'POST',
                    uri: apiUrl,
                    rejectUnauthorized: false,
                    headers: {
                        'Authorization': response.request.headers['Authorization']
                    },
                    body: {"ctnID":patientData.mrn,"adminDT":moment(patientData.admittedDate).tz(orgTimeZone).format("YYYY-MM-DD HH:mm:ss"),"hospCode":patientData.hospitalId},
                    resolveWithFullResponse: true,
                    json: true
                };

                //console.log("icertain admit patient request:" + JSON.stringify(options.body));

                http(options)
                    .then(function (response) {
                        //console.log("icertain admit patient response:" + JSON.stringify(response));
                        if(response.body.success === "true"){
                            resolve("iCertain patient admitted");
                        }else{
                            console.log("iCertain service error:" + response.body.message);
                            reject("Failed to admit iCertain patient");
                        }
                    })
                    .catch(function (err) {
                        console.log("iCertain service error:" + JSON.stringify(err));
                        reject("Failed to admit iCertain patient");
                    });
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function dischargeiCertainPatient(patientData, fhirOrgId, request) {
    return new Promise((resolve, reject) => {
            common.prepareCommonApiManagerRequest({request:request,sessionInfo:request.user,identifier:'iCertain'})
            .then((response) => {
                let apiUrl = response.apiUrl + '/dischargepatient';
                let options = {
                    method: 'POST',
                    uri: apiUrl,
                    rejectUnauthorized: false,
                    headers: {
                        'Authorization': response.request.headers['Authorization']
                    },
                    body: { "ctnID": patientData.mrn, "dischargeDT": moment().tz(orgTimeZone).format("YYYY-MM-DD HH:mm:ss"), "hospCode": patientData.hospitalId },
                    resolveWithFullResponse: true,
                    json: true
                };

                //console.log("icertain discharge patient request:" + JSON.stringify(options.body));

                http(options)
                    .then(function (response) {
                        //console.log("icertain discharge patient response:" + JSON.stringify(response));
                        if(response.body.success === "true"){
                            resolve("iCertain patient discharged");
                        }else{
                            console.log("iCertain service error:" + response.body.message);
                            reject("Failed to discharge iCertain patient");
                        }
                    })
                    .catch(function (err) {
                        console.log("iCertain service error:" + JSON.stringify(err));
                        reject("Failed to discharge iCertain patient");
                    });
            })
            .catch((error) => {
                reject(error);
            });
    });
}


module.exports = {
    createiCertainPatient: createiCertainPatient,
    updateiCertainPatient: updateiCertainPatient,
    dischargeiCertainPatient: dischargeiCertainPatient,
    admitiCertainPatient: admitiCertainPatient
};