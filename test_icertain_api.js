const express = require('express');
const bodyParser = require('body-parser');
const http = require('request-promise');
const config = require('./server/config');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function iCertainLogin(userName, sessionId, sessionToken) {
    let tenantName = userName.split('@')[1];
    let userId = userName.split('@')[0];
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).icertainServiceUrl + '/app/loginsession';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            'Authorization': 'Bearer ' + sessionToken
        },
        body: { "username": userId, "sessionId": sessionId },
        resolveWithFullResponse: true,
        json: true
    };

    //return new Promise((resolve, reject) => {
    http(options)
        .then(function (response) {
            console.log("response:" + JSON.stringify(response));
            //resolve(response);
        })
        .catch(function (err) {
            console.log("iCertain service error:" + JSON.stringify(err));
            //reject(err);
        });
    //});
}

//removing session id from iCertain
function iCertainLogOut(tenantName,sessionId,token) {
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).icertainServiceUrl + '/app/logoutsession';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: { "sessionId": sessionId },
        resolveWithFullResponse: true,
        json: true
    };

    //return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                console.log("response:" + JSON.stringify(response));
                //resolve(response);
            })
            .catch(function (err) {
                console.log("iCertain service error:" + JSON.stringify(err));
                //reject(err);
            });
    //});
}

//create iCertain user
function createiCertainUser(tenantName,token) {
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).icertainServiceUrl + '/app/maintainuser';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: {"username":"test.icertainuser","password":"icertain","firstName":"user","middleName":"","lastName":"icertain","email":"example@mail.com","hospCode":"other"},
        resolveWithFullResponse: true,
        json: true
    };

    //return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                console.log("response:" + JSON.stringify(response));
                //resolve(response);
            })
            .catch(function (err) {
                console.log("iCertain service error:" + JSON.stringify(err));
                //reject(err);
            });
    //});
}

//update iCertain user
function updateiCertainUser(tenantName,token) {
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).icertainServiceUrl + '/app/maintainuser';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: {"username":"test.icertainuser","firstName":"user","middleName":"update","lastName":"icertain","email":"example@mail.com","hospCode":"other"},
        resolveWithFullResponse: true,
        json: true
    };

    //return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                console.log("response:" + JSON.stringify(response));
                //resolve(response);
            })
            .catch(function (err) {
                console.log("iCertain service error:" + JSON.stringify(err));
                //reject(err);
            });
    //});
}

//update iCertain user
function deleteiCertainUser(tenantName,token) {
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).icertainServiceUrl + '/app/deleteuser';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: {"username":"test.icertainuser"},
        resolveWithFullResponse: true,
        json: true
    };

    //return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                console.log("response:" + JSON.stringify(response));
                //resolve(response);
            })
            .catch(function (err) {
                console.log("iCertain service error:" + JSON.stringify(err));
                //reject(err);
            });
    //});
}


//create iCertain patient
function createiCertainPatient(tenantName,token) {
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).icertainServiceUrl + '/maintainpatient';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: {"firstName":"Patient-1","middleName":"","lastName":"test1","gender":"Male","ctnID":"300400","dischargeDT":"0000-00-00 00:00:00","userAdmit":"test","height":"","bloodType":"O","adminDT":"2017-03-17 14:19:32","codeStatus":"Unknown","weight":"","hospCode":"other","age":"45"},
        resolveWithFullResponse: true,
        json: true
    };

    //return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                console.log("response:" + JSON.stringify(response));
                //resolve(response);
            })
            .catch(function (err) {
                console.log("iCertain service error:" + JSON.stringify(err));
                //reject(err);
            });
    //});
}

//update iCertain patient
function updateiCertainPatient(tenantName,token) {
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).icertainServiceUrl + '/maintainpatient';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: {"firstName":"Patient-1","middleName":"","lastName":"testupdate","gender":"Male","ctnID":"300400","dischargeDT":"0000-00-00 00:00:00","userAdmit":"test","height":"","bloodType":"O","adminDT":"2017-03-17 14:19:32","codeStatus":"Unknown","weight":"","hospCode":"other","age":"45"},
        resolveWithFullResponse: true,
        json: true
    };

    //return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                console.log("response:" + JSON.stringify(response));
                //resolve(response);
            })
            .catch(function (err) {
                console.log("iCertain service error:" + JSON.stringify(err));
                //reject(err);
            });
    //});
}

//discharge iCertain patient
function dischargeiCertainPatient(tenantName,token) {
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).icertainServiceUrl + '/dischargepatient';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: {"ctnID":"300400","dischargeDT":"2017-03-17 15:20:32","hospCode":"other"},
        resolveWithFullResponse: true,
        json: true
    };

    //return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                console.log("response:" + JSON.stringify(response));
                //resolve(response);
            })
            .catch(function (err) {
                console.log("iCertain service error:" + JSON.stringify(err));
                //reject(err);
            });
    //});
}


//iCertainLogin("hospital.doctor.tennur@kauveryhealthcare.com", "cv8ed5Az_PrB_LwyWpMJa-aOcifx3qtU", "ed793f90-a257-3bbe-84fd-70dda0455216");

//iCertainLogOut("kauveryhealthcare.com","cv8ed5Az_PrB_LwyWpMJa-aOcifx3qtU","ed793f90-a257-3bbe-84fd-70dda0455216");

//createiCertainUser("kauveryhealthcare.com","70189972-476e-3c37-a6b5-df07f20e1d2c");

//updateiCertainUser("kauveryhealthcare.com","70189972-476e-3c37-a6b5-df07f20e1d2c");

//deleteiCertainUser("kauveryhealthcare.com","70189972-476e-3c37-a6b5-df07f20e1d2c");

//createiCertainPatient("kauveryhealthcare.com","ed793f90-a257-3bbe-84fd-70dda0455216");

//updateiCertainPatient("kauveryhealthcare.com","ed793f90-a257-3bbe-84fd-70dda0455216");

//dischargeiCertainPatient("kauveryhealthcare.com","ed793f90-a257-3bbe-84fd-70dda0455216");