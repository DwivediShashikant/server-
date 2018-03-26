const express = require('express');
const fhirService = express.Router();
const proxy = require('express-request-proxy');
const config = require('../config');
const bodyParser = require('body-parser');
const deviceProcessor = require('../fhir/device');
const practitionerProcessor = require('../fhir/practitioner');
const patientProcessor = require('../fhir/patient');
const diagnosisProcessor = require('../fhir/diagnosis');
const procedureProcessor = require('../fhir/procedure');
const specialInsVitalsProcessor = require('../fhir/special_instruction_vitals');
const progressNoteProcessor = require('../fhir/progress_notes');
const dischargeSummaryProcessor = require('../fhir/discharge_summary');
const nursingCareProcessor = require('../fhir/nursing_care');
const clinicalDocumentHistoryProcessor = require('../fhir/history');
const clinicalDocumentPhysicalExamProcessor = require('../fhir/physical_exam');
const flowsheetProcessor = require('../fhir/flowsheet');
const carePlanProcessor = require('../fhir/care_plan');
const clinicalProgressNoteProcessor = require('../fhir/clinical_progress_note');
const ordersProcessor = require('../fhir/orders');
const medsProcessor = require('../fhir/meds');
const printProcessor = require('../fhir/print');
const documentUploadProcessor = require('../fhir/document_upload');
const reportsProcessor = require('../fhir/reports');
const locationProcessor = require('../fhir/location');
const common = require('../common');
const doctorNotesProcessor = require('../fhir/doctor_notes');
const relatedPersonProcessor = require('../fhir/related_person');

fhirService.use(bodyParser.json());
fhirService.use(bodyParser.urlencoded({ extended: false }));


// practitioner services
fhirService.get('/practitioner/:id', function(req, res, next) {
    practitionerProcessor.getPractitionerByIdentifier(req.params.id,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/practitioner/:role/:fhirOrgId', function(req, res, next) {
    practitionerProcessor.getPractionerByRoleAndOrg(req.params.role,req.params.fhirOrgId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});


// device services
fhirService.get('/device/:fhirOrgId', function(req, res, next) {
    deviceProcessor.getAvailableDevicesByOrg(req.params.fhirOrgId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/device/all/location/:locationIdentifier', function(req, res, next) {
    deviceProcessor.getAllDevicesByLocationIdentifier(req.params.locationIdentifier,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/device/all/:fhirOrgId', function(req, res, next) {
    deviceProcessor.getAllDevicesByOrg(req.params.fhirOrgId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/device/license/checkavailability/:fhirOrgId', function(req, res, next) {
    deviceProcessor.checkLicenseAvailabilityByOrg(req.params.fhirOrgId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/device/license/all/location/:locationIdentifier', function(req, res, next) {
    deviceProcessor.getAllLicensesByLocationIdentifier(req,req.params.locationIdentifier)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.post('/device/licenseForUpdate', function(req, res, next) {
    deviceProcessor.getAvailableLicenseForUpdate(req.body,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/device/getFhirBedId/:presenceBedId', function(req, res, next) {
    locationProcessor.getFhirLocation(req.params.presenceBedId, req)
    .then((response) => {
        res.json(response.resource.id);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

//Patient Service
fhirService.get('/patient/all', function(req, res, next) {
    // console.log('**All Patients',req.user);
    patientProcessor.getAllPatients(req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});


fhirService.get('/patient/orgId/:orgId/status/:status', function(req, res, next) {
    patientProcessor.getPatientsByOrgIdAnddStatus(req.params.orgId, req.params.status, req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/arrivedPatient/orgId/:orgId', function(req, res, next) {
    patientProcessor.getHISPatients(req.params.orgId, req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

//RelatedPerson
fhirService.get('/relatedPerson/:id', function(req, res, next) {
    relatedPersonProcessor.getRelatedPersonByPatientId(req.params.id, req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

//diagnosis

fhirService.get('/diagnosis/:id/:encounterId', function(req, res, next) {
    diagnosisProcessor.getDiagnosis(req.params.id,req.params.encounterId,req)
    .then((response) => 
    {
        res.json(response);
    })
    .catch((error) => 
    {
        res.status(500);
        res.send(error);
    });
});

fhirService.post('/diagnosis', function(req, res, next) {
    diagnosisProcessor.createDiagnosis(req.body,req)
    .then((response) => {
            res.send(response);
        }).catch((error) => {
            res.status(500);
            res.send(error);
        });
});

// PROCEDURE

fhirService.get('/procedure/:id/:encounterId', function(req,res,next){
    procedureProcessor.getProcedure(req.params.id,req.params.encounterId,req)
    .then((response) =>
    {
        res.json(response);
    })
    .catch((error) =>
    {
        res.status(500);
        res.send(error);
    });
});

fhirService.post('/procedure', function(req, res, next) {
    procedureProcessor.createProcedure(req.body,req)
    .then((response) => {
            res.send(response);
        }).catch((error) => {
            res.status(500);
            res.send(error);
        });
});

//Special Instructions Services

fhirService.get('/specialInstructionsVitals/:id/:encounterId', function(req, res, next) {
    specialInsVitalsProcessor.getSpecialInstructionVitals(req.params.id,req.params.encounterId,req)
    .then((response) => 
    {
        res.json(response);
    })
    .catch((error) => 
    {
        res.status(500);
        res.send(error);
    });
});

fhirService.post('/specialInstructionsNotes', function(req, res, next) {
    specialInsVitalsProcessor.createSpecialInstructionsNotes(req.body,req)
    .then((response) => {
            res.send(response);
        }).catch((error) => {
            res.status(500);
            res.send(error);
            
        });
});

fhirService.get('/specialInstructionsNotes/:id/:encounterId', function(req, res, next) {
    specialInsVitalsProcessor.getSpecialInstructionsNotes(req.params.id,req.params.encounterId,req)
    .then((response) => 
    {
        res.json(response);
    })
    .catch((error) => 
    {
        res.status(500);
        res.send(error);
    });
});

// Progress Notes
fhirService.post('/progressNotes', function(req, res, next) {
    progressNoteProcessor.createProgressNote(req.body,req)
    .then((response) => {
            res.send(response);
        }).catch((error) => {
            res.status(500);
            res.send(error);
        });
});

fhirService.get('/progressNotes/:id/:encounterId/', function(req, res, next) {
    progressNoteProcessor.getProgressNotes(req.params.id,req.params.encounterId,req)
    .then((response) => 
    {
        res.json(response);
    })
    .catch((error) => 
    {
        res.status(500);
        res.send(error);
    });
});

// Discharge Summary

fhirService.get('/dischargeSummary/:id/:encounterId', function(req,res,next){
    dischargeSummaryProcessor.getDischargeSummary(req.params.id,req.params.encounterId,req)
    .then((response) =>
    {
        res.json(response);
    })
    .catch((error) =>
    {
        res.status(500);
        res.send(error);
    });
});

fhirService.post('/dischargeSummary', function(req, res, next) {
    dischargeSummaryProcessor.createDischargeSummary(req.body,req)
    .then((response) => {
            res.send(response);
        }).catch((error) => {
            res.status(500);
            res.send(error);
        });
});

fhirService.put('/dischargeSummary', function(req, res, next) {
    dischargeSummaryProcessor.updateDischargeSummary(req.body,req).then((response) => {    
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error.statusText
        });
    });
});

fhirService.get('/documentRefrence/:id/:encounterId', function(req,res,next){
    dischargeSummaryProcessor.getDocumentRefrence(req.params.id,req.params.encounterId,req)
    .then((response) =>
    {
        res.json(response);
    })
    .catch((error) =>
    {
        res.status(500);
        res.send(error);
    });
});

fhirService.post('/dischargeSummaryPDF', function(req, res, next) {
    dischargeSummaryProcessor.createDischargeSummaryPdf(req.body,req)
    .then((response) => {
            res.send(response);
        }).catch((error) => {
            res.status(500);
            res.send(error);
        });
});

fhirService.put('/finalDischargeSummary', function(req, res, next) {
    dischargeSummaryProcessor.updateFinalDischargeSummary(req.body,req)
    .then((response) => {
            res.send(response);
        }).catch((error) => {
            res.status(500);
            res.send(error);
        });
});

fhirService.post('/appointment', function(req, res, next) {
    dischargeSummaryProcessor.createNextAppointment(req.body,req)
    .then((response) => {
            res.send(response);
        }).catch((error) => {
            res.status(500);
            res.send(error);
        });
});


// Nursing Care

fhirService.post('/nursingCare',function(req, res, next){
    nursingCareProcessor.createNursingCare(req.body,req)
    .then((response) => {
        res.send(response);
        }).catch((error) => {
             res.status(500);
             res.send(error)
        });
});

fhirService.get('/nursingCare/:id/:encounterId', function(req,res,next){
    nursingCareProcessor.getNursingCare(req.params.id,req.params.encounterId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
         res.status(500);
            res.send(error);
        });
});

fhirService.put('/nursingCare/:id', function(req, res, next) {
    nursingCareProcessor.updateNursingCare(req.body,req.params.id,req).then((response) => {
            res.send(response);
        }).catch((error) => {
            res.status(500);
            res.send(error);
        });
});

fhirService.get('/nursingDevices/', function(req, res, next) {
    nursingCareProcessor.getNursingDevices(req)
    .then((response) => 
    {
        res.json(response);
    })
    .catch((error) => 
    {
        res.status(500);
        res.send(error);
    });
});

// clinical document history

fhirService.post('/clinicalDocumentHistoryForm', function(req, res, next) {
    clinicalDocumentHistoryProcessor.createClinicalDocumentHistory(req.body,req).then((response) => {    
        res.json(response);    
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error.statusText
        });
    });
});

fhirService.put('/clinicalDocumentHistoryForm', function(req, res, next) {
    clinicalDocumentHistoryProcessor.updateClinicalDocumentHistory(req.body,req).then((response) => {    
        res.send(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error.statusText
        });
    });
});

fhirService.get('/clinicalDocumentHistoryForm/:patientId/:encounterId', function(req, res, next) {
    clinicalDocumentHistoryProcessor.getClinicalDocumentHistory(req.params.patientId,req.params.encounterId,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error.statusText
        });
    });
});

fhirService.post('/clinicalDocumentPhysicalExamForm', function(req, res, next) {
    clinicalDocumentPhysicalExamProcessor.createClinicalDocumentPhysicalExam(req.body,req).then((response) => {    
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error.statusText
        });
    });
});

fhirService.put('/clinicalDocumentPhysicalExamForm', function(req, res, next) {
    clinicalDocumentPhysicalExamProcessor.updateClinicalDocumentPhysicalExam(req.body,req).then((response) => {    
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error.statusText
        });
    });
});

fhirService.get('/clinicalDocumentPhysicalExamForm/:patientId/:encounterId', function(req, res, next) {
    clinicalDocumentPhysicalExamProcessor.getClinicalDocumentPhysicalExam(req.params.patientId,req.params.encounterId,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error.statusText
        });
    });
});

// Plan Services

fhirService.get('/carePlan/:patientId/:admittedDate/:createdDate', function(req, res, next){
    carePlanProcessor.getCarePlan(req.params.patientId,req.params.admittedDate,req.params.createdDate,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

fhirService.post('/carePlan', function(req,res,next){
    carePlanProcessor.createCarePlan(req.body,req)
    .then((response) => {
        res.send(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

//Clinical Progress Note services

fhirService.get('/clinicalProgressNote/:patientId/:encounterId', function(req, res, next){
    clinicalProgressNoteProcessor.getClinicalProgressNote(req.params.patientId,req.params.encounterId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

fhirService.post('/clinicalProgressNote', function(req,res,next){
    clinicalProgressNoteProcessor.createClinicalProgressNote(req.body,req)
    .then((response) => {
        res.send(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

//Order Services

fhirService.get('/orders/:patientId/:encounterId', function(req, res, next){
    ordersProcessor.getOrders(req.params.patientId,req.params.encounterId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

fhirService.post('/orders', function(req,res,next){
    ordersProcessor.createOrders(req.body,req)
    .then((response) => {
        res.send(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

//Meds Services

fhirService.get('/medicationid/:orgId', function(req, res, next){
    ordersProcessor.getMedicationId(req.params.orgId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

fhirService.get('/meds/:patientId/:encounterId', function(req, res, next){
    medsProcessor.getMeds(req.params.patientId,req.params.encounterId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

fhirService.post('/meds', function(req,res,next){
    medsProcessor.createMeds(req.body,req)
    .then((response) => {
        res.send(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
})

// Reports

fhirService.get('/dischargedPatients/:organizationId', function(req, res, next) {
    reportsProcessor.getDischargedPatientsByOrganization(req.params.organizationId,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});


fhirService.get('/dischargedPatientPdf/:documentRefrenceId', function(req, res, next) {
    reportsProcessor.getDischargedPatientPdfByDocumentRefId(req.params.documentRefrenceId,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/binaryPdfData/:binaryPdfLinkId', function(req, res, next) {
    reportsProcessor.getBinaryPdfData(req.params.binaryPdfLinkId,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

// flowsheet services

fhirService.get('/flowsheet/:patientId/:flowsheetId/:observedDate', function(req, res, next) {
    flowsheetProcessor.getFlowsheet(req.params.patientId,req.params.flowsheetId,req.params.observedDate).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/chart/:patientId/:chartId', function(req, res, next) {
    flowsheetProcessor.getChartData(req.params.patientId,req.params.chartId,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.post('/flowsheet/:patientId/:encounterId/:flowsheetId/:effectiveDate', function(req, res, next) {
    flowsheetProcessor.updateFlowsheet(req.params.patientId,req.params.encounterId,req.params.flowsheetId,req.params.effectiveDate,req.body,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

//Print Services

fhirService.post('/print/patientSummary', function(req, res, next) {
    printProcessor.printPatientSummary(req.body,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

//Document Upload

fhirService.get('/documentTypesList', function(req, res, next) {
    documentUploadProcessor.getDocumentTypesList(req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.post('/documentsList', function(req, res, next) {
    documentUploadProcessor.getDocumentsList(req.body,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.post('/document', function(req, res, next) {
    documentUploadProcessor.getDocument(req.body,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.post('/uploadDocuments', function(req, res, next) {

    common.prepareFhirApiManagerRequest(req,req.user)
    .then((response) => {
       proxy({
               url: response.apiUrl+'s3/uploadfiles',
               timeout: 120000
           })(response.request, res, next);
    }).catch((error) => {
        res.status(500).send(error);
    });
    
});

fhirService.post('/deleteDocument', function(req, res, next) {
    documentUploadProcessor.deleteDocument(req.body,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.post('/logo', function(req, res, next) {
    documentUploadProcessor.getLogo(req.body,req).then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send({
            status:500,
            statusText: error
        });
    });
});

fhirService.get('/doctorNotes/:patientId/:encounterId', function(req, res, next){
    doctorNotesProcessor.getDoctorNotes(req.params.patientId,req.params.encounterId,req)
    .then((response) => {
        res.json(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

fhirService.post('/doctorNotes', function(req,res,next){
    doctorNotesProcessor.createDoctorNotes(req.body,req)
    .then((response) => {
        res.send(response);
    }).catch((error) => {
        res.status(500);
        res.send(error);
        });
});

module.exports = fhirService;