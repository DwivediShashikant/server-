const http = require('request-promise');
const httpRequest = require('request');
const fhirResources = require('./resources');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
const common = require('../common');
const config = require('../config');
const orgTimeZone = config.getAppTimeZone();
var fs = require('fs');

function fhirErrorHandler(error,responseMessage){
    console.log("Fhir Error:"+JSON.stringify(error));
     var errorResponse = responseMessage.error;
    return errorResponse;
}

function fhirRepoCallHandler(requestInfo,fhirdatahandler,responseMessage){
    return common.prepareCommonApiManagerRequest({request:requestInfo.request,sessionInfo:requestInfo.request.user,identifier:'fhir'})
    .then((response)=>{
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
        if(requestInfo.requestData){
            let requestData = requestInfo.requestData;
            //defines the AWS bucketName
            if(requestData['tenantname']){
                let tenantConfig = config.getTenantConfig(requestData['tenantname']);
                requestData['tenantname'] = tenantConfig['docStoreName'];
            }
            options.body = requestData;
        }
        return new Promise((resolve, reject) => {
             http(options)
                 .then(function(response) {
                     var resolevedresp = fhirdatahandler(response.body,responseMessage);
                     resolve(resolevedresp);
                 })
                 .catch(function(error) {
                     var errorResponse = fhirErrorHandler(error,responseMessage);
                     reject(errorResponse);
                     
                 });
         });
    })
    .catch((error)=>{
        return new Promise((resolve, reject) => {reject(error)});
    })
}


function prepareDocumentTypesList(fhirData){
    return fhirData.entry[0].resource.compose.include[0].concept;
}


function getDocumentTypesList(request){
    var fhirServiceUrl = 'ValueSet?_tag=cm_filetypes';
    var responseMessage = {"success" : "Successfully got the Document types",
                           "error" : "Failed to get the Document Types"};
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareDocumentTypesList,responseMessage);
}

function prepareDocumentList(documentData){
    documentData.sort((first,second) => {
        var firstDateTime = moment(first.uploadedOnDate).tz(orgTimeZone);
        var secondDateTime = moment(second.uploadedOnDate).tz(orgTimeZone);
        return secondDateTime - firstDateTime;
    });
    return documentData;
}

function getDocumentsList(documentData,request) {
    var fhirServiceUrl = 's3/listfiles';
    var responseMessage = {"success" : "Successfully got the Documents List",
                           "error" : "Failed to get the Documents List"};
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : documentData,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareDocumentList,responseMessage);
}

function prepareDocumentData(documentData){
    return documentData;
}

function prepareLogoData(logoData){
    return logoData;
}

function getDocument(documentData,request) {
    var fhirServiceUrl = 's3/getfile';
    var responseMessage = {"success" : "Successfully got the Document",
                           "error" : "Failed to get the Document"};
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : documentData,
        request : request
    };
    
    return fhirRepoCallHandler(requestInfo,prepareDocumentData,responseMessage);
}

function getLogo(documentData,request) {
    var fhirServiceUrl = 's3/getlogo';
    var responseMessage = {"success" : "Successfully got the Logo",
                           "error" : "Failed to get the Logo"};
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : documentData,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareLogoData,responseMessage);
}


function deleteDocument(documentData,request){
    var fhirServiceUrl = 's3/deletefile';
    var responseMessage = {"success" : "Successfully deleted the Document",
                           "error" : "Failed to delete the Document"};
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : documentData,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareDocumentData,responseMessage);
}

module.exports = {
  getDocumentTypesList : getDocumentTypesList,
  getDocumentsList : getDocumentsList,
  getDocument      : getDocument,
  getLogo          : getLogo,
  deleteDocument   : deleteDocument
};