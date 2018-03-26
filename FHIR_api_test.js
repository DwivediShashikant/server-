const express = require('express');
const bodyParser = require('body-parser');
const http = require('request-promise');
const config = require('./server/config');
var request = require('request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function FhirRequest(tenantName,sessionToken) {
    // let tenantName = userName.split('@')[1];
    // let userId = userName.split('@')[0];
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).fhirServiceUrl + 'Procedure';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            "Authorization": "Bearer 69b81589-fb8c-3403-9fc9-56ec2b873292",
                "accept": "application/json, text/plain, */*",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "en-US,en;q=0.9",
                "charset": "UTF-8",
                "connection": "close",
                "content-type": "application/json",
                "cookie": "connect.sid=s%3AbqXgplvJLFUEkEINS3S8JaTiCXvKwrWC.qoijrcIgyNIoByRBYVGis11e%2BxChuJu%2F6G2n2g1X%2BPI",
                "host": "localhost:4200",
                "origin": "http://localhost:4200",
                "referer": "http://localhost:4200/patients",
                "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36",
                "x-tennantid": "critinext.com"
        },
        body: {"resourceType":"Procedure","meta":{"tag":[{"system":"http://example.org/codes/tags","code":"cm_patient_diagnosis","display":"Diagnosis"}]},"subject":{"reference":"Patient/879b7400-28c8-486e-b1e4-6e4434ff894e"},"performedDateTime":"2017-11-16T14:46:16+05:30","status":"completed","code":{"coding":[{"code":"cm_patient_diagnosis","display":"Diagnosis"}]},"performer":[{"actor":{"reference":"Practitioner/24455548-5a75-4389-a43c-1713c9147500","display":"Nirmala K Nurse Alwar"}}],"encounter":{"reference":"Encounter/966be8fc-76eb-4006-8243-f3c62c420381"},"notes":[{"text":"test"}]},
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
            console.log("FHIR service error:" + JSON.stringify(err));
            //reject(err);
        });
    //});
}



FhirRequest("critinext.com","5370615c-a3ba-3fe0-9c00-e3534c28110f");