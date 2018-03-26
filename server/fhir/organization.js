const http = require('request-promise');
const bodyParser = require('body-parser');
const fhirResources = require('./resources');
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
    //return fhirdata;
}

function prepareOrganizationResponse(fhirOrgData){
    var fhirOrgResponse = {};
    if(fhirOrgData.entry){
       fhirOrgResponse.name = fhirOrgData.entry[0].name;
       fhirOrgResponse.id = fhirOrgData.entry[0].resource.id;
       fhirOrgResponse.orgId = fhirOrgData.entry[0].resource.partOf.reference.split("/")[1];
    }
    return fhirOrgResponse;
}

function prepareFhirOrganizationData(organizationData){
   var organization = fhirResources.organization;
    organization.identifier[0].value = organizationData.id;
    organization.text.div = '<div>'+ organizationData.name +'</div>';
    organization.type.coding[0].display = organizationData.name;
    organization.name = organizationData.name;
    organization.telecom[0].value = organizationData.phone;
    organization.telecom[1].value = organizationData.email;
    organization.address[0].line[0] = organizationData.addressline;
    organization.address[0].city = organizationData.city;
    organization.address[0].postalCode = organizationData.pin;
    organization.address[0].state = organizationData.state;
    organization.partOf.reference = "Organization/" + organizationData.mainOrgId;

    return organization;
}

function prepareCreateOrganizationResponse(fhirData,responseMessage){
    let response = {}
    response.id = fhirData.id
    return response;
}

function createOrganization(organizationData,request) {
    var fhirserviceurl = 'Organization';
    var responseMessage = {"success" : "successfully created Organization",
                          "error" : "Failed to create Organization"};
    
    var fhirOrganization = prepareFhirOrganizationData(organizationData);
    
    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirserviceurl,
        requestData : fhirOrganization,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareCreateOrganizationResponse,responseMessage);
}


function getOrganizationByIdentifier(identifier,request){
    var fhirserviceurl = 'Organization?identifier=' + identifier;
    var responseMessage = {"error" : "Failed to get organization data"};
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };  
    return fhirRepoCallHandler(requestInfo,prepareOrganizationResponse,responseMessage);
}

function updateOrganization(organizationData,request) {
    var fhirserviceurl = 'Organization/' + organizationData.fhirOrgId;
    var responseMessage = {"success" : "successfully updated organization",
                          "error" : "Failed to update organization"};
    
    var fhirOrganization = prepareFhirOrganizationData(organizationData);
    fhirOrganization.id = organizationData.fhirOrgId;

    var requestInfo = {
        requestMethod : 'PUT',
        requestUrl : fhirserviceurl,
        requestData : fhirOrganization,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

function deleteOrganization(fhirOrgId,request) {
    var fhirserviceurl = 'Organization/' + fhirOrgId;
    var responseMessage = {"success" : "successfully deleted organization",
                          "error" : "Failed to delete organization"};

    var requestInfo = {
        requestMethod : 'DELETE',
        requestUrl : fhirserviceurl,
        requestData : '',
        request : request
    };

    return fhirRepoCallHandler(requestInfo,preparesuccessdata,responseMessage);
}

module.exports = {
  createOrganization : createOrganization,
  updateOrganization : updateOrganization,
  deleteOrganization : deleteOrganization,
  getOrganizationByIdentifier : getOrganizationByIdentifier
};