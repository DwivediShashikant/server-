var http = require('request-promise');
var moment = require('moment-timezone');
const bodyParser = require('body-parser');
var fhirResources = require('./resources');
const common = require('../common');

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

function preparesuccessdata(fhirdata,responseMessage){
  return responseMessage.success;
}

function prepareRelatedPersonsResponse(fhirData){
  let relatedPersonsData = [];
  if(fhirData.entry && fhirData.entry.length > 0){
    fhirData.entry.forEach((person)=>{
      let relatedPerson = {};
      relatedPerson['relatedPersonId'] = person.resource.id;
      relatedPerson['patientId'] = person.resource.patient.reference.split('/')[1];
      relatedPerson['name'] = (person.resource.name && person.resource.name.family) ? person.resource.name.family[0] : undefined;
      relatedPerson['relationship'] = (person.resource.relationship && person.resource.relationship.coding[0]) ? person.resource.relationship.coding[0].code : undefined;
      relatedPerson['phoneNumber'] = (person.resource.telecom && person.resource.telecom[0]) ? person.resource.telecom[0].value : undefined;
      relatedPerson['addressLine'] = (person.resource.address && person.resource.address[0] && person.resource.address[0].line) ? person.resource.address[0].line[0] : undefined;
      relatedPerson['city'] = (person.resource.address && person.resource.address[0]) ? person.resource.address[0].city : undefined;
      relatedPerson['state'] = (person.resource.address && person.resource.address[0]) ? person.resource.address[0].state : undefined;
      relatedPerson['pin'] = (person.resource.address && person.resource.address[0]) ? person.resource.address[0].postalCode : undefined;
      relatedPersonsData.push(relatedPerson);
    })
  }
  return relatedPersonsData;    
}

function getAllRelatedPersons(request){
  var fhirserviceurl = 'RelatedPerson';
  var responseMessage = {"error" : "Failed to get Related Person"
                        };

  var requestInfo = {
      requestMethod : 'GET',
      requestUrl : fhirserviceurl,
      requestData : '',
      request : request
  };  
  return fhirRepoCallHandler(requestInfo,prepareRelatedPersonsResponse,responseMessage);
}

function prepareRelatedPersonData(relatedPersonData){
  var relatedPerson = fhirResources.relatedPerson;
  relatedPerson.name.family[0] = relatedPersonData.relatedPersonName ? relatedPersonData.relatedPersonName : '';
  relatedPerson.patient.reference = `Patient/${relatedPersonData.fhirId}`;
  relatedPerson.telecom[0].value = relatedPersonData.relatedPersonPhoneNumber ? relatedPersonData.relatedPersonPhoneNumber : '';
  relatedPerson.relationship.coding[0].code = relatedPersonData.relatedPersonRelationship ? relatedPersonData.relatedPersonRelationship : '';
  relatedPerson.address[0].line[0] = relatedPersonData.relatedPersonAddressLine ? relatedPersonData.relatedPersonAddressLine : '';
  relatedPerson.address[0].city = relatedPersonData.relatedPersonCity ? relatedPersonData.relatedPersonCity : '';
  relatedPerson.address[0].state = relatedPersonData.relatedPersonState ? relatedPersonData.relatedPersonState : '';
  relatedPerson.address[0].postalCode = relatedPersonData.relatedPersonPin ? relatedPersonData.relatedPersonPin : '';
  return relatedPerson;
}

function prepareCreateRelatedPersonResponse(fhirdata){
  let data = {};
  data['id'] = fhirdata.id;
  return data;
}

function createRelatedPerson(relatedPersonData,request) {
    var fhirserviceurl = 'RelatedPerson';
    var responseMessage = {"success" : "successfully created Related Person",
                          "error" : "Failed to create Related Person",
                         };
    
    var relatedPerson = prepareRelatedPersonData(relatedPersonData);

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirserviceurl,
        requestData : relatedPerson,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareCreateRelatedPersonResponse,responseMessage);
}


function updateRelatedPerson(relatedPersonData,request) {
    var fhirserviceurl = `RelatedPerson/${relatedPersonData.relatedPersonId}`;
    var responseMessage = {"success" : "successfully updated Related Person",
                          "error" : "Failed to update Related Person"};
    
    var relatedPerson = prepareRelatedPersonData(relatedPersonData);
    relatedPerson.id = relatedPersonData.relatedPersonId;

    var requestInfo = {
        requestMethod : 'PUT',
        requestUrl : fhirserviceurl,
        requestData : relatedPerson,
        request : request
    };
    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function deleteRelatedPerson(relatedPersonId,request){
    var fhirServiceUrl = `RelatedPerson/${relatedPersonId}`;
    var responseMessage = {"success" : "Successfully Realted Person deleted",
                            "error"  : "Failed to delete Realted Person"};
    var requestInfo = {
        requestMethod : 'DELETE',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function prepareRelatedPersonResponse(fhirData){
  let relatedPerson = {};
  if(fhirData.entry && fhirData.entry.length){
      relatedPerson['relatedPersonId'] = fhirData.entry[0].resource.id;
      relatedPerson['patientId'] = fhirData.entry[0].resource.patient.reference.split('/')[1];
      relatedPerson['name'] = (fhirData.entry[0].resource.name && fhirData.entry[0].resource.name.family) ? fhirData.entry[0].resource.name.family[0] : undefined;
      relatedPerson['relationship'] = (fhirData.entry[0].resource.relationship && fhirData.entry[0].resource.relationship.coding[0]) ? fhirData.entry[0].resource.relationship.coding[0].code : undefined;
      relatedPerson['phoneNumber'] = (fhirData.entry[0].resource.telecom && fhirData.entry[0].resource.telecom[0]) ? fhirData.entry[0].resource.telecom[0].value : undefined;
      relatedPerson['addressLine'] = (fhirData.entry[0].resource.address && fhirData.entry[0].resource.address[0] && fhirData.entry[0].resource.address[0].line) ? fhirData.entry[0].resource.address[0].line[0] : undefined;
      relatedPerson['city'] = (fhirData.entry[0].resource.address && fhirData.entry[0].resource.address[0]) ? fhirData.entry[0].resource.address[0].city : undefined;
      relatedPerson['state'] = (fhirData.entry[0].resource.address && fhirData.entry[0].resource.address[0]) ? fhirData.entry[0].resource.address[0].state : undefined;
      relatedPerson['pin'] = (fhirData.entry[0].resource.address && fhirData.entry[0].resource.address[0]) ? fhirData.entry[0].resource.address[0].postalCode : undefined;
  }
  return relatedPerson;    
}

function getRelatedPersonByPatientId(relatedPersonId,request){
  var fhirserviceurl = `RelatedPerson?patient=${relatedPersonId}`;
  var responseMessage = {"error" : "Failed to get Related Person"
                        };

  var requestInfo = {
      requestMethod : 'GET',
      requestUrl : fhirserviceurl,
      requestData : '',
      request : request
  };  
  return fhirRepoCallHandler(requestInfo,prepareRelatedPersonResponse,responseMessage);
}

module.exports = {
  getAllRelatedPersons : getAllRelatedPersons,
  createRelatedPerson : createRelatedPerson,
  updateRelatedPerson : updateRelatedPerson,
  deleteRelatedPerson : deleteRelatedPerson,
  getRelatedPersonByPatientId : getRelatedPersonByPatientId
};