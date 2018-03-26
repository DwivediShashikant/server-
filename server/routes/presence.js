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

//presenceService.use(bodyParser.json());

presenceService.use(bodyParser.json());
presenceService.use(bodyParser.urlencoded({ extended: false }));

presenceService.post('/patientslist', function(req, res, next) {

    let presencePatients;
    let fhirPatients;
    let hospitalID = req.body.hospitalID;
    let fhirReqObject = req;
    let patientsCommonInFhirAndPresence = new Array();
    let patientsFilterByHospitalId = new Array();
    let patientsAllotedBedInHospital = new Array();
    let patientsInDeaprtment = new Array();

    fhirReqObject.method = 'GET';
    req.params.id = hospitalID;
    req.method = 'GET';

    const getPresencePatient = async() =>{
        return common.makeHttpRequest(req,'patient/all/hospital/',req.user,res, next)
        .then( (presenceData)=> {
           return presenceData;
        }).catch(function(err) {
            console.log('error');
        });
    }

    const getFhirPatient = async() =>{
        return patientProcessor.getAllPatients(req)
        .then((fhirData) => {
            return fhirData;
        }).catch((error)=>{
            res.status(500);
            res.send({
                status : 500,
                statusText : error
            });
        });
    }

    const getHospitalDetail = async() => {
        return common.makeHttpRequest(req,'summaryreport/hospital/',req.user,res, next)
        .then( (hospital) => {
            console.log('**hospital',hospital);
        });
    }

    const getAllBedInHospital = async() => {
        return common.makeHttpRequest(req,'bed/all/hospital/',req.user,res, next)
        .then( (beds) => {
            console.log('**beds',beds);
            return beds;
        });
    }

    const getAllDepartmentInHospital = async() => {
        return common.makeHttpRequest(req,'dept/all/hospital/',req.user,res, next)
        .then( (department) => {
            console.log('**department',department);
            return department;
        });
    }
    const getPatientList = async()=>{
        try{
            const presencePatient = await getPresencePatient();
            const fhirPatient = await getFhirPatient();
            const hospitalDetail = await getHospitalDetail();
            const bedsInHospital = await getAllBedInHospital();
            const departmentsInHospital = await getAllDepartmentInHospital();

            var presenceMap = new Map();
            var fhirMap = new Map();
            var commonInFhirAndPreMap = new Map();
            var patientsAllotedBedMap = new Map();

            // creating hasmap for presence patient
            presencePatient.forEach(patient => {
                presenceMap.set(patient.id,patient);
            });

            //searching patient common in presence patient and fhir patient, total complexity = m+n, where m = size of presencePatient and n = size of fhirPatient
            fhirPatient.forEach(patient => {
                if( presenceMap.has(patient.pid) ){
                    patientsCommonInFhirAndPresence.push(presenceMap.get(patient.pid));
                }
            });

            //searching patients , who are alloted beds in the hospital on the basis of bedId
            patientsCommonInFhirAndPresence.forEach( patient => {
                commonInFhirAndPreMap.set(patient.bedId, patient);
            });

            bedsInHospital.forEach( bed => {
                if(commonInFhirAndPreMap.has(bed.id)){
                    var data = commonInFhirAndPreMap.get(bed.id);
                    data.bedName = bed.name;
                    data.cameraId = bed.cameraId;

                    patientsAllotedBedInHospital.push(data);
                }
            });

            patientsAllotedBedInHospital.forEach( patient => {
                patientsAllotedBedMap.set(patient.icuId, patient);
            });

            departmentsInHospital.forEach( department => {
                if(patientsAllotedBedMap.has(department.id)){
                    var data = patientsAllotedBedMap.get(department.id);
                    data.departmentName = department.name;
                    data.departmentType = department.type;

                    patientsInDeaprtment.push(data);
                }
            });
            res.send(patientsInDeaprtment);
        }catch(err){
            console.log('error in getting presence patient'); 
        }
    }

    getPatientList();
});

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

module.exports = presenceService;
