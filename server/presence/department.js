const express = require('express');
const bodyParser = require('body-parser');
const http = require('request-promise');
const common = require('../common');

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

function getDepartmentByHospitalId(hospitalId, request){
    let createRequestInfo = {
        requestMethod: 'GET',
        requestUrl: 'dept/all/hospital/'+ hospitalId,
        requestData: '',
        request: request,
        errorMessage: "Failed to get all pateints by hospital id"
    };
    return presenceServiceHandler(createRequestInfo);
}

module.exports = {
    getDepartmentByHospitalId : getDepartmentByHospitalId
}

