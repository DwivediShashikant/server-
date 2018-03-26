const http = require('request-promise');
const fhirResources = require('./resources');
const moment = require('moment-timezone');
const bodyParser = require('body-parser');
const common = require('../common');
const config = require('../config');
const orgTimeZone = config.getAppTimeZone();

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
            options.body = requestInfo.requestData
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

function createCarePlan(carePlanData,request){
    var fhirServiceUrl = 'CarePlan';
    var responseMessage = {"success" : "Successfully created care plan note",
                            "error"  : "Failed to create care plan note"};
    var carePlan = fhirResources.carePlan
    carePlan.identifier[0].value = carePlanData.encounterId;
    carePlan.subject.reference = 'Patient/' + carePlanData.patientId;
    carePlan.period.start = moment(carePlanData.createdDate).tz(orgTimeZone).format();
    carePlan.period.end = moment(carePlanData.createdDate).tz(orgTimeZone).format();
    carePlan.author[0].reference = 'Practitioner/' + carePlanData.practitionerId;
    carePlan.author[0].display = carePlanData.practitionerName;
    carePlan.description = carePlanData.note;

    var requestInfo = {
        requestMethod : 'POST', 
        requestUrl : fhirServiceUrl,
        requestData : carePlan,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareCarePlanData,responseMessage);
}

function prepareCarePlanData(fhirData){
    var carePlan = fhirData;
    var carePlanNote = {};
    carePlanNote.createdDate = moment(carePlan.period.start).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    carePlanNote.practitionerId = carePlan.author[0].reference.split('/')[1];
    carePlanNote.name = carePlan.author[0].display;
    carePlanNote.note = carePlan.description;
        
    return carePlanNote;
}

function getCarePlan(patientId,admittedDate,createdDate,request) {
    var fhirServiceUrl = 'CarePlan?patient='+ patientId +'&date=gt' + admittedDate + '&date=lt' + createdDate;
    var responseMessage = {"success" : "Successfully got the care plan notes",
                           "error" : "Failed to get care plan notes"};
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    
    return fhirRepoCallHandler(requestInfo,prepareCarePlanNotes,responseMessage);
}

function prepareCarePlanNotes(carePlanData){
    var carePlanNotes = [];
    if(carePlanData.entry){  
        for (var carePlanEntries of carePlanData.entry) {
            var carePlan = carePlanEntries.resource;
            var carePlanNote = {};
            carePlanNote.createdDate = carePlan.period.start;
            carePlanNote.practitionerId = carePlan.author[0].reference.split('/')[1];
            carePlanNote.name = carePlan.author[0].display;
            carePlanNote.note = carePlan.description.replace(/\n/g,',');
            carePlanNotes.push(carePlanNote);      
       }
    }
    carePlanNotes.sort((first,second) => {
        var firstDateTime = moment(first.createdDate).tz(orgTimeZone);
        var secondDateTime = moment(second.createdDate).tz(orgTimeZone);
        return secondDateTime-firstDateTime;
    });
    carePlanNotes.forEach((date)=>{
        date.createdDate = moment(date.createdDate).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    });
    
    return carePlanNotes;
}

module.exports = {

  createCarePlan : createCarePlan,
  getCarePlan : getCarePlan
};