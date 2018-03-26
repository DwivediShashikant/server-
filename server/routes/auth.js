const express = require('express');
const atob = require('atob');
const moment = require('moment-timezone');
const bodyParser = require('body-parser');
const router = express.Router();
const http = require('request-promise');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const config = require('../config');
const appTimeZone = config.getAppTimeZone();


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


//getting wso2 oauth token
function getToken(userName, password) {
    let tokenRequestUrl = config.getServicesUrl().iamUrl + "/token";
    let tenantName = userName.split('@')[1];
    let options = {
        method: 'POST',
        uri: tokenRequestUrl,
        rejectUnauthorized: false,
        form: {
            grant_type: 'password',
            username: userName,
            password: password,
            scope: config.getAuthorisationScopes()
        },
        headers: {
            'Authorization': 'Basic ' + config.getTenantConfig(tenantName).authorisationKey
        }
    };

    return new Promise((resolve, reject) => {
        http(options)
            .then(function (parseBody) {
                let response = JSON.parse(parseBody);
                //console.log("get token response:"+JSON.stringify(response));
                resolve(response);
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

//passing session id to iCertain
function iCertainLogin(userName, sessionId, hospitalId, sessionToken) {
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
        body: { "username": userName, "sessionId": sessionId ,"hospCode": hospitalId},
        resolveWithFullResponse: true,
        json: true
    };

    //console.log("icertain login session request:"+JSON.stringify(options.body));

    return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                //console.log("icertain login session response:"+JSON.stringify(response));
                if(response.body.success === "true"){
                    resolve(response);
                }else{
                    console.log("iCertain service error:" + response.body.message);
                    reject(err);
                }
            })
            .catch(function (err) {
                console.log("iCertain service error:" + JSON.stringify(err));
                reject(err);
            });
    });
}

function iCertainLogOut(req) {
    let tenantName = req.headers["x-tennantid"];
    let apiUrl = config.getServicesUrl().iamUrl + config.getTenantConfig(tenantName).icertainServiceUrl + '/app/logoutsession';
    let options = {
        method: 'POST',
        uri: apiUrl,
        rejectUnauthorized: false,
        headers: {
            'Authorization': 'Bearer ' + req.user.token
        },
        body: { "sessionId": req.sessionID , "hospCode": req.user.userInfo.hospitalId},
        resolveWithFullResponse: true,
        json: true
    };

    //console.log("icertain logout session request:"+JSON.stringify(options.body));

    return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                //console.log("icertain logout session response:"+JSON.stringify(response));
                if(response.body.success === "true"){
                    resolve(response);
                }else{
                    console.log("iCertain service error:" + response.body.message);
                    reject(err);
                }
            })
            .catch(function (err) {
                console.log("iCertain service error:" + JSON.stringify(err));
                reject(err);
            });
    });
}


//Intializing passport local strategy 
passport.use(new LocalStrategy(
    function (username, password, done) {
        getToken(username, password).then((response) => {
            let decodedJwtToken = JSON.parse(atob(response.id_token.split('.')[1]));
            let value = 'Internal/everyone';
            let userRole = decodedJwtToken.Role.filter(role => role !== 'Internal/everyone')[0];
            let tokenExpirySeconds = response.expires_in;
            let tokenExpiryTime = moment().tz(appTimeZone);
            tokenExpiryTime.add(tokenExpirySeconds, 'seconds');
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
            if (sessionInfo.userInfo.scope.indexOf('ICERTAIN_ACCESS') !== -1) {
                sessionInfo.userInfo.iCertainUrl = config.getServicesUrl().iCertainUrl;
            }
            //console.log("get token user:"+JSON.stringify(user));
            return done(null, sessionInfo);
        }).catch((error) => {
            // console.log('error while checking user authentication:' + error);
            return done(error);
        });
    }
));

//defining passport serializer and deserializer
passport.serializeUser(function (sessionInfo, done) {
    //console.log("serialise user:"+JSON.stringify(user));
    done(null, sessionInfo);
});

passport.deserializeUser(function (sessionInfo, done) {
    done(null, sessionInfo);
});

//handling logout fucntionality
router.post('/logout', function (req, res, next) {
    if (req.user.userInfo.scope.indexOf('ICERTAIN_ACCESS') !== -1) {
        iCertainLogOut(req)
            .then((response) => {
                //console.log("Removed session from iCertain:"+JSON.stringify(response));
            })
            .catch((error) => {
                console.log("Error occured while removing session from iCertain");
            });
    }

    req.logout();

    req.session.destroy(function (err) {
        if (err) {
            console.log("Error while destroying session:" + err);
        }
    });
    delete req.sessionID;
    res.send({ "sucess": true });
});

//handling login functionality
router.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, sessionInfo, info) {
        if (err || !sessionInfo) {
            res.status(500);
            return res.send({
                statusText: "Failed to login"
            });
        }

        req.logIn(sessionInfo, function (err) {
            if (err) {
                res.status(500);
                return res.send({
                    statusText: "Failed to login"
                });
            }
            //console.log("username:"+req.body.username);
            //console.log("session id:"+req.sessionID);
            // console.log("request session:"+JSON.stringify(req.session));
            //console.log("request user:"+JSON.stringify(req.user));
            if (sessionInfo.userInfo.scope.indexOf('ICERTAIN_ACCESS') !== -1) {
                return iCertainLogin(req.body.username, req.sessionID, sessionInfo.userInfo.hospitalId ,sessionInfo.token)
                    .then((response) => {
                        sessionInfo.userInfo.sessionId = req.sessionID;
                        return res.json(sessionInfo.userInfo);
                    })
                    .catch((error) => {
                        res.status(500);
                        return res.send({
                            statusText: "Failed to login"
                        });
                    })
            } else {
                return res.json(sessionInfo.userInfo);
            }
        });

    })(req, res, next);
});

module.exports = router;