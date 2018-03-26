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

function getMedicationId(orgId,request){
    var fhirServiceUrl =  'Medication?code=Medication&manufacturer=' + orgId;
    var responseMessage = {"success" : "Successfully got medication Id",
                           "error" : "Failed to get medication Id"};
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    return fhirRepoCallHandler(requestInfo,prepareMedicationIdData,responseMessage);
}

function prepareMedicationIdData(medicationIdData){
    if(medicationIdData.entry){
        var medicationid = {};
        var medication = medicationIdData.entry[0].resource;
        medicationid.medicationId = medication.id;
    }

    return medicationid;
}

function createOrders(orderData,request){
    var responseMessage = {
        "success": "Successfully created medication orders notes",
        "error": "Failed to create orders notes"
    };
    var fhirServiceUrl,order
    if(orderData.tag === 'Medication'){
        fhirServiceUrl = "MedicationOrder";
        order = fhirResources.medicationOrder;
        order.medicationReference.reference = 'Medication/' + orderData.medicationId;
        order.dateWritten = moment(orderData.createdDate).tz(orgTimeZone).format();
        order.patient.reference = 'Patient/' + orderData.patientId;
        order.prescriber.reference = 'Practitioner/' + orderData.practitionerId;
        order.prescriber.display = orderData.practitionerName;
        order.encounter.reference = 'Encounter/' + orderData.encounterId;
        order.dosageInstruction[0].text = orderData.note;
    }else if(orderData.tag === 'Radiology'){
        order = orderCreateTag(orderData);
        fhirServiceUrl = order[0];
        order = order[1];
        order.item[0].code.coding[0].code = "721964003";

    }else if(orderData.tag === 'Laboratory'){
        order = orderCreateTag(orderData);
        fhirServiceUrl = order[0];
        order = order[1];
        order.item[0].code.coding[0].code = "721965002";
    }

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : order,
        request : request
    };

    return fhirRepoCallHandler(requestInfo,prepareOrderNote,responseMessage)
}

function prepareOrderNote(fhirData){
    var orderData = fhirData;
    var orderNote = {};
    if(orderData.resourceType === "MedicationOrder"){
        orderNote.practitionerId = orderData.prescriber.reference.split('/')[1];
        orderNote.name = orderData.prescriber.display;
        orderNote.note = orderData.dosageInstruction[0].text;
        orderNote.createdDate = moment(orderData.dateWritten).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    }else{ 
        orderNote.practitionerId = orderData.orderer.reference;
        orderNote.name = orderData.orderer.display;
        orderNote.note = orderData.note[0].text;
        orderNote.createdDate = moment(orderData.event[0].dateTime).tz(orgTimeZone).format('MM/DD/YYYY HH:mm')
    }
    
    return orderNote;
}

function getOrders(patientId,encounterId,request){
    let orderNotesPromise = [];
    var fhirServiceUrl;
    fhirResources.orders.forEach((order)=>{
        var responseMessage = { "success": "Successfully got orders notes",
                                "error": "Failed to get orders notes"};
        if(order.tagName ==='Medication'){
            responseMessage.tag = order.tagName;
            fhirServiceUrl = "MedicationOrder?patient=Patient/" + patientId+ '&encounter='+ encounterId;
            }else if(order.tagName === 'Radiology' || order.tagName === 'Laboratory'){
                responseMessage.tag = order.tagName;
                fhirServiceUrl = "DiagnosticOrder?encounter=Encounter/" + encounterId;
            }

        var requestInfo = {
            requestMethod : 'GET',
            requestUrl : fhirServiceUrl,
            requestData : '',
            request : request
        };
        let note = fhirRepoCallHandler(requestInfo,prepareOrderNotes,responseMessage);
        orderNotesPromise.push(note);

    });
    return new Promise((resolve,reject)=>{
        Promise.all([orderNotesPromise[0],orderNotesPromise[1],orderNotesPromise[2]])
        .then((data)=>{
            let notesData = [];
            notesData = notesData.concat(data[0]);
            notesData = notesData.concat(data[1]);
            notesData = notesData.concat(data[2]);
            notesData.sort((first,second) => {
                var firstDateTime = moment(first.createdDate).tz(orgTimeZone);
                var secondDateTime = moment(second.createdDate).tz(orgTimeZone);
                return firstDateTime - secondDateTime;
            });
            notesData.forEach((notes)=>{
                notes.createdDate = moment(notes.createdDate).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
             });
            let orderNotes = createOrderNoteByTagName(fhirResources.orders,notesData) || []
            resolve(orderNotes);
        })
        .catch((error)=>{
            reject(error);
        })
    });
}

function createOrderNoteByTagName(fhirResourceNotes,order){
    orderNotes = [];
    fhirResourceNotes.forEach((orders)=>{
        let note = {};
        note['resourceType'] = orders.resourceType;
        note['tagName'] = orders.tagName;
        note['order_notes'] = [];

        //loop - push and remove the note object
        for(let noteIndex = order.length - 1; noteIndex >= 0; noteIndex--) {
            if(order[noteIndex].tagName === orders.tagName) {
                note['order_notes'].push(order[noteIndex]);
               order.splice(noteIndex, 1);
            }
        }
        orderNotes.push(note);
    })
    return orderNotes;
}

function prepareOrderNotes(orderData,responseMessage){
    var orderNotes = [];
    if(orderData.entry){
        for (var orderEntries of orderData.entry) {
            var order = orderEntries.resource;
            var orderNote = {};
            if(order.resourceType==="MedicationOrder" && responseMessage.tag ==="Medication"){
                orderNote.practitionerId = order.prescriber.reference.split('/')[1];
                orderNote.name = order.prescriber.display;
                orderNote.note = order.dosageInstruction[0].text;
                orderNote.createdDate = order.dateWritten;
                orderNote.tagName = responseMessage.tag;  
            }else if(order.resourceType="DiagnosticOrder" && responseMessage.tag ==="Radiology" && order.item[0].code.coding[0].code ==="721964003"){
                orderNote = orderPrepareElement(order,responseMessage);
            }else if(order.resourceType="DiagnosticOrder" && responseMessage.tag ==="Laboratory" && order.item[0].code.coding[0].code ==="721965002"){
                orderNote = orderPrepareElement(order,responseMessage);                        
            }

            orderNotes.push(orderNote);
        }   
    }
    return orderNotes;
}

function orderPrepareElement(order,responseMessage){
    orderNote = {};
    orderNote.practitionerId = order.orderer.reference;
    orderNote.name = order.orderer.display;
    orderNote.note = order.note[0].text;
    orderNote.createdDate = order.event[0].dateTime;
    orderNote.tagName = responseMessage.tag;

    return orderNote;
}

function orderCreateTag(orderData){
    var fhirServiceUrl = "DiagnosticOrder";
    var order = fhirResources.diagnosticOrder;
    order.subject.reference = 'Patient/' + orderData.patientId;
    order.encounter.reference = 'Encounter/' + orderData.encounterId;
    order.orderer.reference = 'Practitioner/' + orderData.practitionerId;
    order.orderer.display = orderData.practitionerName;
    order.event[0].dateTime = moment(orderData.createdDate).tz(orgTimeZone).format();
    order.note[0].text = orderData.note;

    return [fhirServiceUrl,order];
}

module.exports = {
    createOrders : createOrders,
    getOrders : getOrders,
    getMedicationId : getMedicationId
};