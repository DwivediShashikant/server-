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

function getSpecialInstructionsNotesList(specialInstructionData) {
    var specialInstructionNotes = [];
    if (specialInstructionData.entry) {
        var specialInstructionEntries = specialInstructionData.entry;
        for(var entriesIndex in specialInstructionEntries) {
            var specialInstruction = specialInstructionEntries[entriesIndex].resource;
            var specialInstructionNote = {};
            if (specialInstruction.resourceType == "Observation" && specialInstruction.text) {
                specialInstructionNote.createdDate = specialInstruction.effectiveDateTime;
                specialInstructionNote.practitionerId = specialInstruction.performer[0].reference.split('/')[1];
                specialInstructionNote.note = specialInstruction.text.div.replace(/(<([^>]+)>)/ig, "");
                specialInstructionNote.ef = specialInstruction.component[0].valueQuantity.value;
                specialInstructionNote.bpSys = specialInstruction.component[1].valueQuantity.value;
                specialInstructionNote.bpDia = specialInstruction.component[2].valueQuantity.value;
                specialInstructionNote.pa = specialInstruction.component[3].valueQuantity.value;
                specialInstructionNote.name = specialInstruction.performer[0].display;
                specialInstructionNotes.push(specialInstructionNote);
            }
        }
    }
    var specialInstructionNotes = specialInstructionNotes.sort((first, second) => {
        var firstDateTime = moment(first.createdDate).tz(orgTimeZone);
        var secondDateTime = moment(second.createdDate).tz(orgTimeZone);
        return secondDateTime - firstDateTime;
    });
    specialInstructionNotes.forEach((notes)=>{
        notes.createdDate = moment(notes.createdDate).tz(orgTimeZone).format('MM/DD/YYYY HH:mm');
    });
    return specialInstructionNotes;
}

function getVitalValueByCode(specialInstructionVitals,code){
    var observations = specialInstructionVitals.filter(vital => vital.resource.meta.tag[1].code === code)
        .sort((first, second) => {
            var firstDateTime = moment(first.resource.effectiveDateTime).tz(orgTimeZone);
            var secondDateTime = moment(second.resource.effectiveDateTime).tz(orgTimeZone);
            return secondDateTime - firstDateTime;
        });

    return observations;
}

//TODO - Test, Once the flowsheet component is added
function getSpecialInstructionVitalsData(specialInstructionResponse) {
    var observation = {};
    if (specialInstructionResponse.entry) {
        var specialInstructionVitals = specialInstructionResponse.entry;

        let specialInstructionPAVitals = getVitalValueByCode(specialInstructionVitals,"cm_patient_obs_pa");
        if (specialInstructionPAVitals.length) {
 
            observation.pa = specialInstructionPAVitals[0].resource.component[0].valueQuantity.value;
        }
 
        var specialInstructionEFVitals = getVitalValueByCode(specialInstructionVitals,"cm_patient_obs_ef");
        if (specialInstructionEFVitals.length) {
 
            observation.ef = specialInstructionEFVitals[0].resource.component[0].valueQuantity.value;
        }
 
        var specialInstructionBPDVitals = getVitalValueByCode(specialInstructionVitals,"cm_patient_obs_bp_dys");
        if (specialInstructionBPDVitals.length) {
 
            observation.bpD = specialInstructionBPDVitals[0].resource.component[0].valueQuantity.value;
        }
        var specialInstructionBPSVitals = getVitalValueByCode(specialInstructionVitals,"cm_patient_obs_bp_sys");
        if (specialInstructionBPSVitals.length) {
            observation.bpS = specialInstructionBPSVitals[0].resource.component[0].valueQuantity.value;
        }
    }
    return observation;
}

function getSpecialInstructionsNotes(patientId,encounterId,request) {
    var responseMessage = {"success" : "successfully got the Special Instruction Notes",
                                            "error" : "Failed to get Special Instruction Notes"};
    var fhirServiceUrl = 'Observation?code=cm_patient_spl_instr_obs&_tag=cm_patient_spl_instr_obs&category=cm_patient_spl_instr_obs&encounter=Encounter/' + encounterId +'&subject=Patient/' + patientId;
      
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    return fhirRepoCallHandler(requestInfo,getSpecialInstructionsNotesList,responseMessage);
}



function getSpecialInstructionVitals(patientId,encounterId,request) {
    var responseMessage = {"success" : "successfully got the Special Instruction Observation",
                                            "error" : "Failed to get Special Instruction Observation"};
    var fhirServiceUrl = 'Observation?_tag=cm_patient_obs_ef,cm_patient_obs_bp_sys,cm_patient_obs_bp_dys,cm_patient_obs_pa&subject=Patient/'+patientId+'&_lastUpdated='+encounterId;
    
    var requestInfo = {
        requestMethod : 'GET',
        requestUrl : fhirServiceUrl,
        requestData : '',
        request : request
    };
    return fhirRepoCallHandler(requestInfo,getSpecialInstructionVitalsData,responseMessage);
}

function prepareSpecialInstructionsData(fhirdata){
    var specialInstruction = fhirdata;
    var specialInstructionNote = {};
    if (specialInstruction.resourceType == "Observation" && specialInstruction.text) {
        specialInstructionNote.createdDate = moment(specialInstruction.effectiveDateTime).format('MM/DD/YYYY HH:mm');
        specialInstructionNote.practitionerId = specialInstruction.performer[0].reference.split('/')[1];
        specialInstructionNote.note = specialInstruction.text.div.replace(/(<([^>]+)>)/ig, "");
        specialInstructionNote.ef = specialInstruction.component[0].valueQuantity.value;
        specialInstructionNote.bpSys = specialInstruction.component[1].valueQuantity.value;
        specialInstructionNote.bpDia = specialInstruction.component[2].valueQuantity.value;
        specialInstructionNote.pa = specialInstruction.component[3].valueQuantity.value;
        specialInstructionNote.name = specialInstruction.performer[0].display;
    }
    return specialInstructionNote;
}

function createVitalData(){
     var component =  {
                    "code": {
                    "coding": [
                        {
                        "id": "",
                        "system": "http://snomed.info/sct",
                        "code": "",
                        "display": ""
                        }
                    ]
                    },
                    "valueQuantity": {
                    "value": "",
                    "unit": "mm[Hg]"
                    }
                };
    return component;
}
function createSpecialInstructionsNotes(specialInstructionData,request) {
    var fhirServiceUrl = 'Observation';
    var responseMessage = {"success" : "successfully created Special Instruction Observation",
                          "error" : "Failed to create Special Instruction Observation"};

    var specialinstruction_obr = fhirResources.specialInstructionNotesobservation;
    specialinstruction_obr.component=[];
    specialinstruction_obr.meta.tag[0].code = "cm_patient_spl_instr_obs";
    specialinstruction_obr.meta.tag[0].display = "Special Instructions";
    specialinstruction_obr.text.div = "<div>" +specialInstructionData.note +"</div>";
    specialinstruction_obr.category.coding[0].code = "cm_patient_spl_instr_obs";
    specialinstruction_obr.code.coding[0].code = "cm_patient_spl_instr_obs";
    specialinstruction_obr.subject.reference = "Patient/" + specialInstructionData.patientId;
    specialinstruction_obr.encounter.reference = "Encounter/" + specialInstructionData.encounterId;
    specialinstruction_obr.performer[0].reference = "Practitioner/" + specialInstructionData.practitionerId;
    specialinstruction_obr.performer[0].display = specialInstructionData.name ;
    specialinstruction_obr.effectiveDateTime = moment(specialInstructionData.createdDate).tz(orgTimeZone).format();

    let efData = createVitalData();
    efData.code.coding[0].id = "vs.ef";
    efData.code.coding[0].code = "70822001";
    efData.code.coding[0].display = "Ejection Fraction (%)";
    efData.valueQuantity.value = specialInstructionData.ef;
    specialinstruction_obr.component.push(efData);
    
    let nibpSysData = createVitalData();
    nibpSysData.code.coding[0].id = "vs.nibp.sys";
    nibpSysData.code.coding[0].code = "72313002";
    nibpSysData.code.coding[0].display = "Systolic (mm Hg)";
    nibpSysData.valueQuantity.value = specialInstructionData.bpSys;
    specialinstruction_obr.component.push(nibpSysData);
    
    let nibpDiaData = createVitalData();
    nibpDiaData.code.coding[0].id = "vs.nibp.dia";
    nibpDiaData.code.coding[0].code = "271650006";
    nibpDiaData.code.coding[0].display = "Diastolic (mm Hg)";
    nibpDiaData.valueQuantity.value = specialInstructionData.bpDia;
    specialinstruction_obr.component.push(nibpDiaData);

    let paSysData = createVitalData();
    paSysData.code.coding[0].id = "vs.pa.sys";
    paSysData.code.coding[0].code = "250767002";
    paSysData.code.coding[0].display = "Systolic (mm Hg)";
    paSysData.valueQuantity.value = specialInstructionData.pa;
    specialinstruction_obr.component.push(paSysData);

    var requestInfo = {
        requestMethod : 'POST',
        requestUrl : fhirServiceUrl,
        requestData : specialinstruction_obr,
        request : request
    };
    
    return fhirRepoCallHandler(requestInfo,prepareSpecialInstructionsData,responseMessage);
}

module.exports = {
  createSpecialInstructionsNotes : createSpecialInstructionsNotes,
  getSpecialInstructionsNotes : getSpecialInstructionsNotes,
  getSpecialInstructionVitals : getSpecialInstructionVitals,
};
