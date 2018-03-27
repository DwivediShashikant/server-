const moment = require('moment-timezone');
const http = require('request-promise');
const bodyParser = require('body-parser');
const atob = require('atob');
const config = require('./config');
const appTimeZone = config.getAppTimeZone();
const proxy = require('express-request-proxy'); 

let socketIoConnection;


//common function to make http request
function makeHttpRequest(req,reqPath,sessionInfo,res, next,queryString){
  return prepareCommonApiManagerRequest({request:req,sessionInfo:sessionInfo,identifier:'api'})
 .then((response) => {
    let hospitalID = response.request.body.hospitalID;
    let targetUrl = response.apiUrl+reqPath+hospitalID;
    var options = {
      method: 'GET',
      uri: targetUrl,
      rejectUnauthorized: false,
      headers: {
         'Authorization': response.request.headers['Authorization'],
         'content-type': response.request.headers['content-type'],
         'x-tennantid': response.request.headers['x-tennantid']
      },
      resolveWithFullResponse: true,
      json: true
    };

  if(req.requestData){
    options.body = req.requestData
  }
  return new Promise((resolve, reject) => {
    http(options).then(function(response) {
        resolve(response.body);
      })
      .catch(function(error) {
        console.log('Error Occured');
          reject(error);
      });
  });

 }).catch((error) => {
     res.status(500).send(error);
 });
}

function refreshAuthToken(refreshToken, request) {
    let tokenRequestUrl = config.getServicesUrl().iamUrl+"/token";
    let options = {
        method: 'POST',
        uri: tokenRequestUrl,
        rejectUnauthorized: false,
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            scope: 'PRODUCTION'
        },
        headers: {
            'Authorization': 'Basic '+config.getTenantConfig(request.headers["x-tennantid"]).authorisationKey
        }
    };
    return new Promise((resolve, reject) => {
        http(options)
            .then(function(parseBody) {
                var response = JSON.parse(parseBody);
                resolve(response);
            })
            .catch(function(err) {
                reject(err);
            });
    });
}

function prepareFhirApiManagerRequest(requestInfo,sessionInfo){
  return new Promise((resolve, reject) => {
    if(sessionInfo && requestInfo){
      //var fhirApiUrl = config.getServicesUrl().iamUrl+config.getTenantConfig(request.headers["x-tennantid"]).fhirServiceUrl;
      let fhirApiUrl = config.getServicesUrl().fhirRepoUrl;
      let requestTime = moment().tz(appTimeZone);
      let tokenExpiryTime = moment(sessionInfo.tokenExpiryTime).tz(appTimeZone);
      if(requestTime >= tokenExpiryTime ){
           refreshAuthToken(sessionInfo.refreshtoken,requestInfo.request)
           .then((response) => {
              let decodedJwtToken = JSON.parse(atob(response.id_token.split('.')[1]));
              let value = 'Internal/everyone';
              let userRole = decodedJwtToken.Role.filter(role => role !== 'Internal/everyone')[0];
              let tokenExpirySeconds = response.expires_in;
              let tokenExpiryTime = moment().tz(appTimeZone);
              // tokenExpiryTime.add(2,'seconds');
              tokenExpiryTime.add(tokenExpirySeconds,'seconds');
              let sessionInfo = {
                  token: response.access_token,
                  refreshtoken: response.refresh_token,
                  tokenExpiryTime: tokenExpiryTime.format(),
                  userInfo: {
                     scope: response.scope,
                     uuid: decodedJwtToken.UUID,
                     role: userRole,
                     hospitalId: decodedJwtToken.Hospital ? decodedJwtToken.Hospital : ""
                  }
              }; 

              requestInfo.request.logIn(sessionInfo, function(err) {
                 if (err) { 
                   reject(err)
                   console.log("error while storing session info:"+err); 
                 }else{
                  // request.headers["Authorization"] = "Bearer " + sessionInfo.token;
                  let fhirApiManagerRequest = {
                                            "apiUrl" : fhirApiUrl,
                                            "request" : requestInfo
                                          };
                   resolve(fhirApiManagerRequest);
                 }
              });    
           })
           .catch((error)=>{
             if(error.statusCode && error.statusCode === 400){
               // request.headers["Authorization"] = "Bearer " + sessionInfo.token;
               let fhirApiManagerRequest = {
                                         "apiUrl" : fhirApiUrl,
                                         "request" : requestInfo
                                       };
                resolve(fhirApiManagerRequest);
             }else{
               console.log("referesh token error:"+JSON.stringify(error));
               reject(error)
             }
           });

      }else{
         // request.headers["Authorization"] = "Bearer " + sessionInfo.token;
         let fhirApiManagerRequest = {
                                   "apiUrl" : fhirApiUrl,
                                   "request" : requestInfo
                                 };
          resolve(fhirApiManagerRequest);
      }
    }else{
      //var fhirApiUrl = config.getServicesUrl().iamUrl+config.getTenantConfig(request.headers["x-tennantid"]).fhirServiceUrl;
      let fhirApiUrl = config.getServicesUrl().fhirRepoUrl;
      // request.headers["Authorization"] = "Bearer " + sessionInfo.token;
      let fhirApiManagerRequest = {
                                "apiUrl" : fhirApiUrl,
                                "request" : requestInfo
                              };
       resolve(fhirApiManagerRequest);
    }
  });
}

function prepareCommonApiManagerRequest({request,sessionInfo,identifier}){
  var apiUrl;
  if(identifier === 'api' || identifier === 'presence'){
    apiUrl = config.getServicesUrl().iamUrl+config.getTenantConfig(request.headers["x-tennantid"]).presenceServiceUrl;
    console.log('**apiUrl: ', apiUrl);
  }else if(identifier === 'fhir'){
    apiUrl = config.getServicesUrl().iamUrl+config.getTenantConfig(request.headers["x-tennantid"]).fhirServiceUrl;
  }else if(identifier === 'iCertain'){
    apiUrl = config.getServicesUrl().iamUrl+config.getTenantConfig(request.headers["x-tennantid"]).icertainServiceUrl;
  }else if(identifier === 'meeting'){
    apiUrl = config.getServicesUrl().iamUrl+config.getTenantConfig(request.headers["x-tennantid"]).meetingServiceUrl;
  }
  return new Promise((resolve, reject) => {

    let requestTime = moment().tz(appTimeZone);
    let tokenExpiryTime = moment(sessionInfo.tokenExpiryTime).tz(appTimeZone);
    if(requestTime >= tokenExpiryTime ){
         refreshAuthToken(sessionInfo.refreshtoken,request)
         .then((response) => {
            let decodedJwtToken = JSON.parse(atob(response.id_token.split('.')[1]));
            let value = 'Internal/everyone';
            let userRole = decodedJwtToken.Role.filter(role => role !== 'Internal/everyone')[0];
            let tokenExpirySeconds = response.expires_in;
            let tokenExpiryTime = moment().tz(appTimeZone);
            tokenExpiryTime.add(tokenExpirySeconds,'seconds');
            let sessionInfo = {
                token: response.access_token,
                refreshtoken: response.refresh_token,
                tokenExpiryTime: tokenExpiryTime.format(),
                userInfo: {
                   scope: response.scope,
                   uuid: decodedJwtToken.UUID,
                   role: userRole,
                   hospitalId: decodedJwtToken.Hospital ? decodedJwtToken.Hospital : ""
                }
            }; 

            request.logIn(sessionInfo, function(err) {
               if (err) { 
                 reject(err)
                 console.log("error while storing session info:"+err); 
               }else{
                 request.headers["Authorization"] = "Bearer " + sessionInfo.token;
                 let apiManagerRequest = {
                                           "apiUrl" : apiUrl,
                                           "request" : request
                                         };
                                         
                 resolve(apiManagerRequest);
               }
            });    
         })
         .catch((error)=>{
           if(error.statusCode && error.statusCode === 400){
             request.headers["Authorization"] = "Bearer " + sessionInfo.token;
             let apiManagerRequest = {
                                       "apiUrl" : apiUrl,
                                       "request" : request
                                     };
                                     
             resolve(apiManagerRequest);
           }else{
             console.log("referesh token error:"+JSON.stringify(error));
             reject(error)
           }
         });

    }else{
       request.headers["Authorization"] = "Bearer " + sessionInfo.token;
      let apiManagerRequest = {
                                 "apiUrl" : apiUrl,
                                 "request" : request
                               };
      resolve(apiManagerRequest);
    }
  });
}

function setSocketIoConnection(ioconnection){
    socketIoConnection = ioconnection;
}

function getSocketIoConnection(){
   return socketIoConnection;
}

module.exports = {
    prepareFhirApiManagerRequest : prepareFhirApiManagerRequest,
    prepareCommonApiManagerRequest : prepareCommonApiManagerRequest,
    setSocketIoConnection : setSocketIoConnection,
    getSocketIoConnection : getSocketIoConnection,
    makeHttpRequest : makeHttpRequest
}