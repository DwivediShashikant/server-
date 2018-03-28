const express = require('express');
const presenceService = express.Router();
const bodyParser = require('body-parser');
const hospitalManager = require('../presence/hospital');
const patientManager = require('../presence/patient');
const bedManager = require('../presence/bed');
const config = require('../config');
const api = require('./api');
const common = require('../common');
const patientProcessor = require('../fhir/patient');
const proxy = require('express-request-proxy');
const patient = require('../presence/patient');
//presenceService.use(bodyParser.json());

presenceService.use(bodyParser.json());
presenceService.use(bodyParser.urlencoded({ extended: false }));

//Hospital services
presenceService.post('/hospital/:mainOrgId', function(req, res, next) {
    hospitalManager.createHospital(req.body, req.params.mainOrgId, req).then((response) => {
        if(response.status){
            res.status(500);
            res.send({
                status:500,
                statusText: response.statusText
            });
        }else{
            res.send("Hospital created successfully");
        }
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

presenceService.get('/hospital/:identifier', function(req, res, next) {
    hospitalManager.getFhirOrgData(req.params.identifier, req).then((response) => {
            res.send(response)
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

presenceService.put('/hospital/:fhirOrgId/:mainOrgId', function(req, res, next) {
    hospitalManager.updateHospital(req.body, req.params.fhirOrgId, req.params.mainOrgId, req).then((response) => {
        res.send("Successfully updated Hospital");
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

presenceService.delete('/hospital/:presenceId/org/:fhirOrgId/tenant/:tenantOrgId', function(req, res, next) {
    hospitalManager.deleteHospital(req.params.presenceId, req.params.fhirOrgId, req.params.tenantOrgId, req).then((response) => {
        res.send("Successfully deleted Hospital");
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

//Patient services
presenceService.post('/patient/:fhirOrgId', function(req, res, next) {
    patientManager.createPatient(req.body, req.params.fhirOrgId, req).then((response) => {
        if(response.status){
            res.status(500);
            res.send({
                status:500,
                statusText: response.statusText
            });
        }else{
            res.send(response);
        }
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

presenceService.post('/his_patient/:fhirOrgId', function(req, res, next) {
    patientManager.createHISPatient(req.body, req.params.fhirOrgId, req).then((response) => {
        if(response.status){
            res.status(500);
            res.send({
                status:500,
                statusText: response.statusText
            });
        }else{
            res.send(response);
        }
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

presenceService.put('/patient/:patientFhirId/org/:fhirOrgId', function(req, res, next) {
    patientManager.updatePatient(req.body, req.params.patientFhirId, req.params.fhirOrgId, req).then((response) => {
        res.send("Successfully updated Patient");
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});


// presenceService.put('/patient/encounterEndDate/:patientFhirId/org/:fhirOrgId', function(req, res, next) {
//     patientManager.updateEndDateOfEncounter(req.body, req.params.patientFhirId, req.params.fhirOrgId, req).then((response) => {
//         res.send("Successfully updated Patient");
//     }).catch((error) => {
//         res.status(500);
//         res.send({
//             status:500,
//             statusText: error
//         });
//     });
// });

presenceService.get('/patient/:identifier', function(req, res, next) {
    patientManager.getFhirPatientData(req.params.identifier, req).then((response) => {
            res.send(response)
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error.message
        });
    });
});

presenceService.get('/patient/eoc/:identifier', function(req, res, next) {
    patientManager.getFhirPatientDataWithEOC(req.params.identifier, req).then((response) => {
            res.send(response)
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error.message
        });
    });
});

//bed services
presenceService.post('/bed', function(req, res, next) {
    bedManager.createBed(req.body, req).then((response) => {
        if(response.status){
            res.status(500);
            res.send({
                status:500,
                statusText: response.statusText
            });
        }else{
            res.send(response);
        }
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

presenceService.put('/bed/:bedId', function(req, res, next) {
    bedManager.updateBed(req.body, req).then((response) => {
        res.send("Successfully updated Bed");
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

presenceService.delete('/bed/:bedId/fhirOrgId/:OrgId', function(req, res, next) {
    bedManager.deleteBed(req.params.bedId,req.params.OrgId, req).then((response) => {
        res.send(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

presenceService.post('/patientslist', function(req, res, next) {
    let hospitalID = req.body.hospitalID;
    req.params.id = hospitalID;
    req.method = 'GET';
    
    patient.getPatientsList('ff7bf8c5-816f-4106-9fd6-7e79c07d2e1d', req)
    .then( (responses) => {
        res.send(responses);
    },
    (err) => {
        res.send(err);
    });
});


module.exports = presenceService;
