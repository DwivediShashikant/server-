var http = require('request-promise');
var moment = require('moment-timezone');
//var fhirRepoCallHandler = require('./commons').fhirRepoCallHandler;
var fhirResources = require('./resources');
var patientProcessor = require('../fhir/patient');
const common = require('../common');
const session = require('../session');
const config = require('../config');
const numeral = require('numeral');

const redisClient = session.getRedisClient();
const appTimeZone = config.getAppTimeZone();

const flowsheetConfig = config.getFlowsheetConfig();
const chartConfig = config.getChartConfig();


var flowSheetValueSet = [];
var flowSheetGridRowData = [];
var patientsFlowSheetMap = new Map();

function fhirErrorHandler(error, responseMessage) {
    console.log("Fhir Error:" + JSON.stringify(error));
    var errorResponse = responseMessage.error;
    return errorResponse;
}

function fhirRepoCallHandler(requestInfo, fhirdatahandler, responseMessage) {
  let sessionInfo = requestInfo.request ? requestInfo.request.user : '';
  let reqInfo = requestInfo.request ? requestInfo.request : '';
  return common.prepareFhirApiManagerRequest(requestInfo, sessionInfo)
  .then((response)=>{
    var options = {
        method: requestInfo.requestMethod,
        uri: response.apiUrl + requestInfo.requestUrl,
        rejectUnauthorized: false,
        headers: response.request.headers,
        json: true
    };

    if (requestInfo.requestData) {
        options.body = requestInfo.requestData
    }

    return new Promise((resolve, reject) => {
        http(options)
            .then(function (response) {
                var resolevedresp = fhirdatahandler(response, responseMessage);
                resolve(resolevedresp);
            })
            .catch(function (error) {
                var errorResponse = fhirErrorHandler(error, responseMessage);
                reject(errorResponse);
            });
    });
  })
  .catch((error)=>{
    return new Promise((resolve, reject) => {reject(error)});
  })
}

function flowSheetSocketIoEvent(eventName,flowSheetData) {
    let socketIoConnection = common.getSocketIoConnection();
    /*Emit the subCategoryData of Flowsheet*/
    if(flowSheetData){
        socketIoConnection.emit(eventName, flowSheetData);
    }
}

function chartSocketIoEvent(eventName,chartUpdateEventData){
    let socketIoConnection = common.getSocketIoConnection();
    if(chartUpdateEventData){
      socketIoConnection.emit(eventName, chartUpdateEventData);
    }
}

function processValueSet(fhirdata, responseMessage) {
    var valueSetResponse = [];
    if (fhirdata.entry) {
        valueSetResponse = fhirdata.entry;
    }
    return valueSetResponse;
}

function prepareFlowSheetObservationsResponse(fhirdata, responseMessage) {
    var flowSheetObservationsResponse = {};
    if (fhirdata.entry) {
        flowSheetObservationsResponse.observations = fhirdata.entry;
        flowSheetObservationsResponse.link = fhirdata.link;
    }

    return flowSheetObservationsResponse;
}

function prepareFlowSheetUpdateResponse(fhirdata, responseMessage) {
    var successResponse = {
        message: responseMessage.success
    }
    var chartFhirData = JSON.parse(JSON.stringify(fhirdata));
    var flowsheetFhirData = JSON.parse(JSON.stringify(fhirdata));

    var flowsheetTypeConfig = flowsheetConfig.find(configData => configData.id === responseMessage.flowsheetId);
    if (flowsheetTypeConfig.prepareChart) {
        var chartConfigData = chartConfig.find(configData => configData.id === flowsheetTypeConfig.id);
        processChartObservationsData(chartFhirData.entry, responseMessage.patientId, chartConfigData);
    }
    
    var patientKey = "patient:" + responseMessage.flowsheetId + ":" + responseMessage.patientId;
    var gridColDef = "";
    if(flowsheetTypeConfig.storeColdef && responseMessage.colDef && responseMessage.colDef.length){
        gridColDef = responseMessage.colDef;
    }
    processFlowSheetObservationsData(flowsheetFhirData.entry, responseMessage.patientId, patientKey, false, responseMessage.effectiveDate, gridColDef, responseMessage.flowsheetTypeConfig)
        .then((response) => {
            if(responseMessage.fluidData.length){
                processFlowSheetObservationsDataInRedis(responseMessage.fluidData, responseMessage.patientId, patientKey, responseMessage.effectiveDate, responseMessage.flowsheetTypeConfig, status='fluidDataAutoCal')
            }
        })
        .then((response)=>{
            return successResponse;
        })
        .catch((error) => {
            return responseMessage.error;
        });
}

function setFlowSheetValueSet(valueSet) {
    flowSheetValueSet = valueSet;
}

function getFlowSheetValueSet() {
    return flowSheetValueSet;
}

function getFhirFlowsheetValueSet() {
    var valuesetTags = "";
    for (var configData of flowsheetConfig) {
        valuesetTags = valuesetTags + "," + configData.tag;
    }
    var fhirserviceurl = 'ValueSet?_tag=' + valuesetTags.substring(1);
    var responseMessage = {
        "success": "successfully fetched flowsheet valueset",
        "error": "Failed to fetch flowsheet valueset",
        "successAction": "valueset fetched",
        "errorAction": "valueset fetch error"
    };
    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirserviceurl,
        requestData: ''
    };

    return fhirRepoCallHandler(requestInfo, processValueSet, responseMessage);
}

function getFlowsheetObservations(fhirserviceurl, request) {
    var responseMessage = {
        "success": "successfully fetched flowsheet observation",
        "error": "Failed to fetch flowsheet obsrvation",
        "successAction": "observations fetched",
        "errorAction": "observations fetch error"
    };

    var requestInfo = {
        requestMethod: 'GET',
        requestUrl: fhirserviceurl,
        requestData: '',
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareFlowSheetObservationsResponse, responseMessage);
}


// function calculateBlananceDayTotal(subCategoryData, balanceCategoryData, observedDateTime) {
//     let morningTotalData = 0;
//     let eveningTotalData = 0;
//     let nightTotalData = 0;
//     let dayTotal = 0;

//     let autoCalRows = ['vs.intk.intvns.crlds.ns','vs.intk.intvns.crlds.5d','vs.intk.intvns.crlds.10d','vs.intk.intvns.crlds.dns',
//                       'vs.intk.intvns.crlds.rl','vs.intk.intvns.clds.pn','vs.intk.intvns.clds.hl','vs.intk.intvns.clds.sh',
//                       'vs.intk.intvns.bld.wbld','vs.intk.intvns.bld.prbc','vs.intk.intvns.bld.fbld','vs.intk.intvns.bld.pas',
//                       'vs.intk.intvns.bld.plce','vs.intk.intvns.bld.ffp','vs.intk.inf.mdn','vs.intk.inf.fld'
//                      ]
//     let autoCalRowIndex = autoCalRows.findIndex(item=> item === subCategoryData.id)
//     if(autoCalRowIndex !== -1){
//         let morningDate = moment(observedDateTime).startOf('day').add(13,'hours').add(30,'minutes');
//         while (morningDate.format('HH:mm') !== '07:30') {
//             if(subCategoryData[morningDate.format()]){
//                 morningTotalData = subCategoryData[morningDate.format()];
//                 break;
//             }
//             morningDate.subtract(30, 'minutes');
//         }

//         let eveningDate = moment(observedDateTime).startOf('day').add(19,'hours').add(30,'minutes');
//         while (eveningDate.format('HH:mm') !== '13:30') {
//             if(subCategoryData[eveningDate.format()]){
//                 eveningTotalData = subCategoryData[eveningDate.format()];
//                 break;
//             }
//             eveningDate.subtract(30, 'minutes');
//         }

//         let nightDate = moment(observedDateTime).startOf('day').add(1,'day').add(7,'hours').add(30,'minutes');
//         while (nightDate.format('HH:mm') !== '19:30') {
//             if(subCategoryData[nightDate.format()]){
//                 nightTotalData = subCategoryData[nightDate.format()];
//                 break;
//             }
//             nightDate.subtract(30, 'minutes');
//         }
//         balanceCategoryData.dayTotal += nightTotalData || eveningTotalData || morningTotalData;
//     }else{
//         let startTime = JSON.parse(JSON.stringify(moment(observedDateTime).startOf('day')));
//         startTime = moment(startTime).add(8,'hours');
//         let total = 0;
//         do {
//             if(subCategoryData[startTime.format()] >= 0){
//                 total += subCategoryData[startTime.format()];
//             }
//             startTime.add(30, 'minutes');
//         }while (startTime.format('HH:mm') !== '08:00')
//         if(subCategoryData.id.match(/vs.intk/)){
//             balanceCategoryData.dayTotal += total;
//         }else{
//             balanceCategoryData.dayTotal -= total;
//         }
//     }
//     return subCategoryData;
// }

// function processSubCategoryData(mainCategoryName, observationData, balanceCategoryData, observedDateTime) {
//     if (mainCategoryName == "Intake") {
//         return calculateBlananceDayTotal(observationData, balanceCategoryData, observedDateTime)
//     }
//     if (mainCategoryName == "Output (mL)") {
//         return calculateBlananceDayTotal(observationData, balanceCategoryData, observedDateTime)
//     }
// }

// function handleSubCategoryData(mainCategoryName, subCategoryData, balanceCategoryData,observedDateTime, observedDateTime) {
//     for (let index in subCategoryData) {
//         if (subCategoryData[index].maincategory == true) {
//             handleSubCategoryData(mainCategoryName, subCategoryData[index].subcategory, balanceCategoryData, observedDateTime)
//         }
//         else {
//             let observationData = subCategoryData[index];
//             processSubCategoryData(mainCategoryName, observationData, balanceCategoryData, observedDateTime)
//         }
//     }
// }

// function calculateBalanceTotal(observedDateTime, patientFlowsheetData){
//     let fluidFlowsheetData = patientFlowsheetData[0].subcategory
//     let balanceCategoryData = fluidFlowsheetData.find(item=> item.id === 'vs.balance');
//     balanceCategoryData.dayTotal = 0;
//     for (let index in fluidFlowsheetData) {
//         handleSubCategoryData(fluidFlowsheetData[index].observation, fluidFlowsheetData[index].subcategory,balanceCategoryData,observedDateTime)
//     }
//     return balanceCategoryData.dayTotal;

// }

function prepareAutoChartSubCategoryData(subCategoryData, subCategoryObservations, observedDateTime, flowsheetConfig, patientId, patientFlowsheetData) {
    var orgTimeZone = appTimeZone;
    var morningDate = moment(observedDateTime).tz(orgTimeZone);
    var morningRangeStartDate = moment(observedDateTime).tz(orgTimeZone);
    var morningRangeEndDate = moment(observedDateTime).tz(orgTimeZone);
    var eveningDate = moment(observedDateTime).tz(orgTimeZone);
    var eveningRangeStartDate = moment(observedDateTime).tz(orgTimeZone);
    var eveningRangeEndDate = moment(observedDateTime).tz(orgTimeZone);
    var nightDate = moment(observedDateTime).tz(orgTimeZone);
    var nightRangeStartDate = moment(observedDateTime).tz(orgTimeZone);
    var nightRangeEndDate = moment(observedDateTime).tz(orgTimeZone);
    var prevNightShiftDate = moment(observedDateTime).tz(orgTimeZone);
    var prevNightShiftRangeStartDate = moment(observedDateTime).tz(orgTimeZone);
    var prevNightShiftRangeEndDate = moment(observedDateTime).tz(orgTimeZone);

    morningDate.subtract(morningDate.seconds(), 'seconds');
    morningDate.subtract(morningDate.minutes(), 'minutes');
    morningDate.subtract(morningDate.hours(), 'hours');
    morningRangeStartDate.subtract(morningRangeStartDate.seconds(), 'seconds');
    morningRangeStartDate.subtract(morningRangeStartDate.minutes(), 'minutes');
    morningRangeStartDate.subtract(morningRangeStartDate.hours(), 'hours');
    morningRangeEndDate.subtract(morningRangeEndDate.seconds(), 'seconds');
    morningRangeEndDate.subtract(morningRangeEndDate.minutes(), 'minutes');
    morningRangeEndDate.subtract(morningRangeEndDate.hours(), 'hours');
    morningDate.add(8, 'hours');
    morningRangeStartDate.add(7, 'hours');
    morningRangeStartDate.add(30, 'minutes');
    morningRangeEndDate.add(8, 'hours');
    while (morningDate.format('HH:mm') !== '14:00') {
        var observations = [];
        for (var morningDataIndex = subCategoryObservations.length-1; morningDataIndex >=0 ; morningDataIndex--) {
            var effectiveDateTime = moment(subCategoryObservations[morningDataIndex].resource.effectiveDateTime).tz(orgTimeZone);
            if (effectiveDateTime >= morningRangeStartDate && effectiveDateTime <= morningRangeEndDate) {
                observations.push(subCategoryObservations[morningDataIndex]);
                subCategoryObservations.splice(morningDataIndex, 1);
            }
        }
        if (observations.length > 0) {
            observations.sort((first, second) => {
                var firstDateTime = moment(first.resource.effectiveDateTime).tz(orgTimeZone);
                var secondDateTime = moment(second.resource.effectiveDateTime).tz(orgTimeZone);
                return secondDateTime - firstDateTime;
            });
            var observation = observations[0];
            var observationId = observation.resource.id;
            var effectiveDateTime = morningRangeEndDate.format();
            var observationValue = observation.resource.component[0].valueQuantity.value;
            subCategoryData[effectiveDateTime] = observationValue;
            subCategoryData[effectiveDateTime + "-id"] = observationId;
        }
        morningDate.add(30, 'minutes');
        morningRangeStartDate.add(30, 'minutes');
        morningRangeEndDate.add(30, 'minutes');
    }


    eveningDate.subtract(eveningDate.seconds(), 'seconds');
    eveningDate.subtract(eveningDate.minutes(), 'minutes');
    eveningDate.subtract(eveningDate.hours(), 'hours');
    eveningRangeStartDate.subtract(eveningRangeStartDate.seconds(), 'seconds');
    eveningRangeStartDate.subtract(eveningRangeStartDate.minutes(), 'minutes');
    eveningRangeStartDate.subtract(eveningRangeStartDate.hours(), 'hours');
    eveningRangeEndDate.subtract(eveningRangeEndDate.seconds(), 'seconds');
    eveningRangeEndDate.subtract(eveningRangeEndDate.minutes(), 'minutes');
    eveningRangeEndDate.subtract(eveningRangeEndDate.hours(), 'hours');
    eveningDate.add(14, 'hours');
    eveningRangeStartDate.add(13, 'hours');
    eveningRangeStartDate.add(30, 'minutes');
    eveningRangeEndDate.add(14, 'hours');
    while (eveningDate.format('HH:mm') !== '20:00') {
        var observations = [];
        for (var eveningDataIndex = subCategoryObservations.length-1; eveningDataIndex >=0; eveningDataIndex--) {
            var effectiveDateTime = moment(subCategoryObservations[eveningDataIndex].resource.effectiveDateTime).tz(orgTimeZone);
            if (effectiveDateTime >= eveningRangeStartDate && effectiveDateTime <= eveningRangeEndDate) {
                observations.push(subCategoryObservations[eveningDataIndex]);
                subCategoryObservations.splice(eveningDataIndex, 1);
            }
        }
        if (observations.length > 0) {
            observations.sort((first, second) => {
                var firstDateTime = moment(first.resource.effectiveDateTime).tz(orgTimeZone);
                var secondDateTime = moment(second.resource.effectiveDateTime).tz(orgTimeZone);
                return secondDateTime - firstDateTime;
            });
            var observation = observations[0];
            var observationId = observation.resource.id;
            var observationValue = observation.resource.component[0].valueQuantity.value;
            var effectiveDateTime = eveningRangeEndDate.format();
            subCategoryData[effectiveDateTime] = observationValue;
            subCategoryData[effectiveDateTime + "-id"] = observationId;
        }
        eveningDate.add(30, 'minutes');
        eveningRangeStartDate.add(30, 'minutes');
        eveningRangeEndDate.add(30, 'minutes');
    }

    nightDate.subtract(nightDate.seconds(), 'seconds');
    nightDate.subtract(nightDate.minutes(), 'minutes');
    nightDate.subtract(nightDate.hours(), 'hours');
    nightRangeStartDate.subtract(nightRangeStartDate.seconds(), 'seconds');
    nightRangeStartDate.subtract(nightRangeStartDate.minutes(), 'minutes');
    nightRangeStartDate.subtract(nightRangeStartDate.hours(), 'hours');
    nightRangeEndDate.subtract(nightRangeEndDate.seconds(), 'seconds');
    nightRangeEndDate.subtract(nightRangeEndDate.minutes(), 'minutes');
    nightRangeEndDate.subtract(nightRangeEndDate.hours(), 'hours');
    nightDate.add(20, 'hours');
    nightRangeStartDate.add(19, 'hours');
    nightRangeStartDate.add(30, 'minutes');
    nightRangeEndDate.add(20, 'hours');
    while (nightDate.format('HH:mm') !== '08:00') {
        var observations = [];
        for (var nightDataIndex = subCategoryObservations.length-1; nightDataIndex >=0 ; nightDataIndex--) {
            var effectiveDateTime = moment(subCategoryObservations[nightDataIndex].resource.effectiveDateTime).tz(orgTimeZone);
            if (effectiveDateTime >= nightRangeStartDate && effectiveDateTime <= nightRangeEndDate) {
                observations.push(subCategoryObservations[nightDataIndex]);
                subCategoryObservations.splice(nightDataIndex, 1);
            }
        }
        if (observations.length > 0) {
            observations.sort((first, second) => {
                var firstDateTime = moment(first.resource.effectiveDateTime).tz(orgTimeZone);
                var secondDateTime = moment(second.resource.effectiveDateTime).tz(orgTimeZone);
                return secondDateTime - firstDateTime;
            });
            var observation = observations[0];
            var observationId = observation.resource.id;
            var observationValue = observation.resource.component[0].valueQuantity.value;
            var effectiveDateTime = nightRangeEndDate.format();
            subCategoryData[effectiveDateTime] = observationValue;
            subCategoryData[effectiveDateTime + "-id"] = observationId;
        }
        nightDate.add(30, 'minutes');
        nightRangeStartDate.add(30, 'minutes');
        nightRangeEndDate.add(30, 'minutes');
    }

    prevNightShiftDate.subtract(prevNightShiftDate.seconds(), 'seconds');
    prevNightShiftDate.subtract(prevNightShiftDate.minutes(), 'minutes');
    prevNightShiftDate.subtract(prevNightShiftDate.hours(), 'hours');
    prevNightShiftRangeStartDate.subtract(prevNightShiftRangeStartDate.seconds(), 'seconds');
    prevNightShiftRangeStartDate.subtract(prevNightShiftRangeStartDate.minutes(), 'minutes');
    prevNightShiftRangeStartDate.subtract(prevNightShiftRangeStartDate.hours(), 'hours');
    prevNightShiftRangeEndDate.subtract(prevNightShiftRangeEndDate.seconds(), 'seconds');
    prevNightShiftRangeEndDate.subtract(prevNightShiftRangeEndDate.minutes(), 'minutes');
    prevNightShiftRangeEndDate.subtract(prevNightShiftRangeEndDate.hours(), 'hours');
    prevNightShiftDate.add(00, 'hours');
    prevNightShiftRangeStartDate.add(00, 'hours');
    prevNightShiftRangeEndDate.add(00, 'hours');
    prevNightShiftRangeEndDate.add(30, 'minutes');
    while (prevNightShiftDate.format('HH:mm') !== '08:00') {
        var observations = [];
        for (var nightDataIndex = subCategoryObservations.length-1; nightDataIndex >=0 ; nightDataIndex--) {
            var effectiveDateTime = moment(subCategoryObservations[nightDataIndex].resource.effectiveDateTime).tz(orgTimeZone);
            if (effectiveDateTime >= prevNightShiftRangeStartDate && effectiveDateTime <= prevNightShiftRangeEndDate) {
                observations.push(subCategoryObservations[nightDataIndex]);
                subCategoryObservations.splice(nightDataIndex, 1);
            }
        }
        if (observations.length > 0) {
            observations.sort((first, second) => {
                var firstDateTime = moment(first.resource.effectiveDateTime).tz(orgTimeZone);
                var secondDateTime = moment(second.resource.effectiveDateTime).tz(orgTimeZone);
                return secondDateTime - firstDateTime;
            });
            var observation = observations[0];
            var observationId = observation.resource.id;
            var observationValue = observation.resource.component[0].valueQuantity.value;
            var effectiveDateTime = prevNightShiftRangeEndDate.format();
            subCategoryData[effectiveDateTime] = observationValue;
            subCategoryData[effectiveDateTime + "-id"] = observationId;
        }
        prevNightShiftDate.add(30, 'minutes');
        prevNightShiftRangeStartDate.add(30, 'minutes');
        prevNightShiftRangeEndDate.add(30, 'minutes');
    }
    var flowSheetData = {};
    flowSheetData.observedDateTime = observedDateTime;
    flowSheetData.patientId = patientId;
    flowSheetData.patientObservationsData = subCategoryData;
    if(flowsheetConfig.id === 'fluids'){
        flowSheetSocketIoEvent('fluidFlowsheetData',flowSheetData);
    }else{
        flowSheetSocketIoEvent('flowsheet',flowSheetData);
    }

    // if(subCategoryData.id.match(/vs.balance/)){
    //     let field;
    //     if(moment(observedDateTime).format('mm') < "30"){
    //         field = JSON.parse(JSON.stringify(moment(observedDateTime).startOf('hours')));
    //         field = moment(field).add(30,'minutes').format();
    //     }else{
    //         field = JSON.parse(JSON.stringify(moment(observedDateTime).startOf('hours')));
    //         field = moment(field).add(1,'hours').format();
    //     }
    //     if(moment(field).format('HH:mm') === "07:30"){
    //         subCategoryData.fluidData = {};
    //         subCategoryData.fluidData['balance'] = {};
    //         subCategoryData.fluidData.balance[moment(field).subtract(1,'day').format('YYYY-MM-DD')] = calculateBalanceTotal(field, patientFlowsheetData);
    //     }
    // }

    return subCategoryData;
}

function prepareSubCategoryData(subCategoryData, subCategoryObservations, observedDateTime) {
    for (var observation of subCategoryObservations) {
        var observationId = observation.resource.id;
        var effectiveDateTime = observation.resource.effectiveDateTime;
        var observationValue = observation.resource.component[0].valueQuantity.value;
        subCategoryData[effectiveDateTime] = observationValue;
        subCategoryData[effectiveDateTime + "-id"] = observationId;
    }
    return subCategoryData;
}

function prepareFlowSheetRowSubcategoryData(subCategoryData, mainCategoryId, subCategorySystem, mainCategory, flowsheetValidations) {
    var subCategory = {
        id: mainCategoryId,
        maincategory: true,
        observation: '',
        subcategory: []
    };
    var mainCategoryIds = mainCategoryId.split(".");
    var mainCategoryIdsLength = mainCategoryIds.length;
    var mainCategorySubCategories = [];
    var subCategorySubCategories = [];
    for (var subCategoryDataIndex in subCategoryData) {
        if (subCategoryData[subCategoryDataIndex].id === mainCategoryId) {
            var mainCategoryData = subCategoryData[subCategoryDataIndex];
        }
        var categoryIds = subCategoryData[subCategoryDataIndex].id.split(".");
        if (categoryIds.length == mainCategoryIdsLength + 1) {
            mainCategorySubCategories.push(subCategoryData[subCategoryDataIndex]);
        } else {
            subCategorySubCategories.push(subCategoryData[subCategoryDataIndex]);
        }
    }
    if (mainCategoryData) {
        subCategory.observation = mainCategoryData.display;
    } else if(mainCategory) {
        subCategory.observation = mainCategory.display;
        mainCategoryData = mainCategory;
    }
    if (subCategorySubCategories.length > 0) {
        for (var subCategoryIndex in mainCategorySubCategories) {
            var subCategoryMainCategory = subCategorySubCategories.filter((subCategory) => {
                var subCategoryIds = subCategory.id.split(".");
                var mainSubCategoryIds = mainCategorySubCategories[subCategoryIndex].id.split(".");
                var mainSubCategoryIdsLength = mainSubCategoryIds.length;
                var subCategoryIdtoCheck;
                for (var categoryIdIndex = 0; categoryIdIndex < mainSubCategoryIdsLength; categoryIdIndex++) {
                    if (subCategoryIdtoCheck) {
                        subCategoryIdtoCheck = subCategoryIdtoCheck + "." + subCategoryIds[categoryIdIndex];
                    } else {
                        subCategoryIdtoCheck = subCategoryIds[categoryIdIndex];
                    }
                }
                if (mainCategorySubCategories[subCategoryIndex].id === subCategoryIdtoCheck) {
                    return true;
                } else {
                    return false;
                }
            });
            if (subCategoryMainCategory.length > 0) {
                subCategory.subcategory.push(prepareFlowSheetRowSubcategoryData(subCategoryMainCategory, mainCategorySubCategories[subCategoryIndex].id, subCategorySystem, mainCategorySubCategories[subCategoryIndex], flowsheetValidations));
            } else {
                var subCategoryDetail = mainCategorySubCategories[subCategoryIndex];
                var observationCategoryData = {
                    mainCategory: mainCategoryData,
                    subCategory: subCategoryDetail,
                    system: subCategorySystem
                };
                let validations = ( subCategoryDetail.designation && subCategoryDetail.designation.length) ? JSON.parse(subCategoryDetail.designation[0].value) : undefined;
                if(validations){
                    var validationsColumns = (flowsheetValidations && flowsheetValidations.validations) ? flowsheetValidations.validations.columns : undefined;
                    validations.columns = validationsColumns;
                    var validationsAutoCalRows = (flowsheetValidations && flowsheetValidations.validations) ? flowsheetValidations.validations.autoCalRows : undefined;
                    validations.autoCalRows = validationsAutoCalRows;
                }
                var subCategoryDetailCategory = { observation: subCategoryDetail.display, id: observationCategoryData.subCategory.id, category: observationCategoryData, validations: validations };
                subCategory.subcategory.push(subCategoryDetailCategory);
            }

        }
    } else {
        for (var categoryIndex in mainCategorySubCategories) {
            var subCategoryDetail = mainCategorySubCategories[categoryIndex];
            var observationCategoryData = {
                mainCategory: mainCategoryData,
                subCategory: subCategoryDetail,
                system: subCategorySystem
            };
            let validations = (subCategoryDetail.designation && subCategoryDetail.designation.length) ? JSON.parse(subCategoryDetail.designation[0].value) : undefined;
            if(validations){
                var validationsColumns = (flowsheetValidations && flowsheetValidations.validations) ? flowsheetValidations.validations.columns : undefined;
                validations.columns = validationsColumns;
                var validationsAutoCalRows = (flowsheetValidations && flowsheetValidations.validations) ? flowsheetValidations.validations.autoCalRows : undefined;
                validations.autoCalRows = validationsAutoCalRows;
            }
            var subCategoryDetailCategory = { observation: subCategoryDetail.display, id: observationCategoryData.subCategory.id, category: observationCategoryData, validations: validations };
            subCategory.subcategory.push(subCategoryDetailCategory);
        }
    }
    return subCategory;
}


function prepareFlowSheet(valueSet) {
    var flowSheetRowData = [];
    var flowsheetValidations = {};
    for (var valueSetIndex in valueSet) {
        var valueSetData = valueSet[valueSetIndex].resource;
        if (valueSetData.resourceType === 'ValueSet') {
            var flowSheetMainCategory = {
                maincategory: true,
                open: true,
                observation: valueSetData.meta.tag[0].display,
                subcategory: []
            };
            var flowsheetConfiguration = config.getFlowsheetConfig();
            flowsheetValidations =flowsheetConfiguration.find(flowsheetConfig=> flowsheetConfig.tag === valueSetData.meta.tag[0].code)
            var valueSetSubCategories = valueSetData.compose.include;
            for (var subCategoryIndex in valueSetSubCategories) {
                var subCategoryData = valueSetSubCategories[subCategoryIndex].concept;
                var subCategorySystem = valueSetSubCategories[subCategoryIndex].system;
                var subCategoryDataLength = subCategoryData.length;
                if (subCategoryDataLength > 1) {
                    var categoryIds = subCategoryData[0].id.split(".");
                    var mainCategoryId = categoryIds[0] + "." + categoryIds[1];
                    var subCategory = prepareFlowSheetRowSubcategoryData(subCategoryData, mainCategoryId, subCategorySystem, '', flowsheetValidations);
                } else {
                    if (Object.keys(subCategoryData[0]).length == 0) continue;
                    var mainCategoryData = subCategoryData[0];
                    var observationCategoryData = {
                        mainCategory: mainCategoryData,
                        subCategory: subCategoryData[0],
                        system: subCategorySystem
                    };
                    let validations = (subCategoryData[0].designation && subCategoryData[0].designation.length) ? JSON.parse(subCategoryData[0].designation[0].value) : undefined;
                    if(validations){
                        var validationsColumns = (flowsheetValidations && flowsheetValidations.validations) ? flowsheetValidations.validations.columns : undefined;
                        validations.columns = validationsColumns;
                        var validationsAutoCalRows = (flowsheetValidations && flowsheetValidations.validations) ? flowsheetValidations.validations.autoCalRows : undefined;
                        validations.autoCalRows = validationsAutoCalRows;
                    }
                    var subCategory = { observation: subCategoryData[0].display, id: observationCategoryData.subCategory.id, category: observationCategoryData, validations: validations};
                }
                flowSheetMainCategory.subcategory.push(subCategory);
            }
            var flowsheetGridData = {
                valueSetTag: valueSetData.meta.tag[0].code,
                gridData: [flowSheetMainCategory]
            };
            flowSheetRowData.push(flowsheetGridData);
        }
    }
    
    return flowSheetRowData;

}

function removeDataFromReplicateFluidFlowsheetData(categoryData){
    let data = {};
    data.id = categoryData.id;
    data.category = categoryData.category;
    data.observation = categoryData.observation;
    if(categoryData.validations){
        data.validations = categoryData.validations;
    }
    if(categoryData.fluidData){
        data.fluidData = JSON.parse(JSON.stringify(categoryData.fluidData));
    }
    return data;
}

function processFluidFlowSheetSubCategory({subcategory, encounterId, patientId, effectiveDateTime, patientFlowsheetData, flowsheetConfig, status}) {
    let updatedSubCategory = [];
    subcategory.forEach((subcategoryData)=>{
        let categoryData = JSON.parse(JSON.stringify(subcategoryData));
        if (categoryData.maincategory && categoryData.maincategory == true) {
            categoryData.subcategory = processFluidFlowSheetSubCategory({subcategory:JSON.parse(JSON.stringify(categoryData.subcategory)), encounterId:encounterId, patientId:patientId, effectiveDateTime:effectiveDateTime, patientFlowsheetData:patientFlowsheetData, flowsheetConfig:flowsheetConfig, status:status});
            updatedSubCategory.push(categoryData);
        } else {
            updatedSubCategory.push(processFluidFlowSheetCategory({categoryData:categoryData, encounterId:encounterId, patientId:patientId, effectiveDateTime:effectiveDateTime, patientFlowsheetData:patientFlowsheetData, flowsheetConfig:flowsheetConfig, status:status}));
        }
    })

    return updatedSubCategory;
}

function processFluidFlowSheetCategory({categoryData, encounterId, patientId, effectiveDateTime, patientFlowsheetData, flowsheetConfig, status}) {
    if(status === 'delete'){
        return removeDataFromReplicateFluidFlowsheetData(categoryData)
    }
}

function replicateFluidAutoCalData({patientObservationsData,flowsheetData,effectiveDateTime}){
    
    return new Promise((resolve, reject) => {
            let effectiveDate = JSON.parse(JSON.stringify(effectiveDateTime))
            effectiveDate = moment(effectiveDate).tz(appTimeZone).subtract(1, 'day');
            let effectiveDateObservations = flowsheetData.find(observation => moment(observation.observedDate).tz(appTimeZone).format('MM-DD-YYYY') === effectiveDate.format('MM-DD-YYYY'));
            if(effectiveDateObservations){
                let observationData = JSON.parse(JSON.stringify(effectiveDateObservations.observationData));
                let updatedFlowsheetData = [];
                observationData.forEach((obsData)=>{
                    var categoryData = JSON.parse(JSON.stringify(obsData));
                    if (categoryData.maincategory && categoryData.maincategory == true) {
                        categoryData.subcategory = processFluidFlowSheetSubCategory({subcategory:JSON.parse(JSON.stringify(categoryData.subcategory)),status:'delete'});
                        updatedFlowsheetData.push(categoryData);
                    } else {
                        updatedFlowsheetData.push(processFluidFlowSheetCategory({categoryData:JSON.parse(JSON.stringify(categoryData)),status:'delete'}));
                    }
                })
                patientObservationsData.observationData = updatedFlowsheetData;
                resolve(patientObservationsData)
            }else{
                resolve(patientObservationsData)
            }
    })
}

function getFlowsheet(patientId, flowsheetId, observedDate) {
    return new Promise((resolve, reject) => {
        var patientKey = "patient:" + flowsheetId + ":" + patientId;
        redisClient.hgetall(patientKey, function (err, object) {
            if (err) {
                reject("Error occured while getting patient flowsheet data");
            }
            var patientFlowsheetData = object;
            if (patientFlowsheetData && patientFlowsheetData.flowSheetData) {
                var patientFlowsheetGridData = JSON.parse(patientFlowsheetData.flowSheetData);
                var flowsheetRowData = patientFlowsheetGridData.find(flowsheetGridData => moment(flowsheetGridData.observedDate).tz(appTimeZone).format('MM-DD-YYYY') === moment(observedDate).tz(appTimeZone).format('MM-DD-YYYY'));
                if(!flowsheetRowData){

                    var flowsheetIdConfig = flowsheetConfig.find(configData => configData.id === flowsheetId);
                    var gridRowData = flowSheetGridRowData.find(gridData => gridData.valueSetTag === flowsheetIdConfig.tag);
                    var observationData = {
                        observedDate : observedDate,
                        observationData : gridRowData.gridData
                    };

                    //Auto Calculation of fluidData - copy the valueset 
                    if(flowsheetId === 'fluids'){
                        replicateFluidAutoCalData({patientObservationsData:observationData,flowsheetData:patientFlowsheetGridData,effectiveDateTime:observedDate})
                        .then((response)=>{
                            patientFlowsheetGridData.push(response);
                            patientFlowsheetData.flowSheetData = JSON.stringify(patientFlowsheetGridData);
                            redisClient.hmset("patient:" + flowsheetId + ":" + patientId, patientFlowsheetData);
                            resolve(observationData);
                        })
                        .catch((error)=>{
                            reject("Flowsheetdata not present for patient");
                        })
                    }else{
                        patientFlowsheetGridData.push(observationData);
                        patientFlowsheetData.flowSheetData = JSON.stringify(patientFlowsheetGridData);
                        redisClient.hmset("patient:" + flowsheetId + ":" + patientId, patientFlowsheetData);
                        resolve(observationData);
                    }

                }else{
                    resolve(flowsheetRowData);
                }
            } else {
                reject("Flowsheetdata not present for patient");
            }
        });
    });
}

function getChartData(patientId, chartId) {
    return new Promise((resolve, reject) => {
        var patientKey = "patient:chart:" + chartId + ":" + patientId;
        redisClient.hgetall(patientKey, function (err, object) {
            if (err) {
                reject("Error occured while getting patient chart data");
            }
            var patientChartData = object;
            if (patientChartData) {
                let chartSeriesData = JSON.parse(patientChartData.chartData);
                chartSeriesData.forEach((seriesData)=>{
                    let data = []
                    seriesData.data = new Map(JSON.parse(seriesData.data));
                    for (var [key, value] of seriesData.data.entries()) {
                      data.push([key,value]);
                    }
                    data.sort((first, second) => {
                        var firstDateTime = moment(first[0]).tz(appTimeZone);
                        var secondDateTime = moment(second[0]).tz(appTimeZone);
                        return firstDateTime - secondDateTime;
                    });
                    seriesData.data = data;
                })
                patientChartData.chartData = chartSeriesData;
                resolve(patientChartData);
            } else {
                reject("Chart data not present for patient");
            }
        });
    });
}

function prepareFlowSheetUpdateData(patientId, encounterId, flowsheetId, flowSheetData, requestMethod = 'PUT') {
    var flowObservationTag = flowsheetConfig.find(configData => configData.id === flowsheetId);
    var flowSheetUpdateBundle = {
        "resourceType": "Bundle",
        "type": "",
        "entry": []
    };
    flowSheetUpdateBundle.type = "transaction";
    for (var dataIndex in flowSheetData) {
        var flowSheetObservation = {
            "resource": {
                "resourceType": "Observation",
                "meta": {
                    "tag": [
                        {
                            "system": "http://example.org/codes/tags",
                            "code": flowObservationTag.tag,
                            "display": "Flowsheet Observation"
                        }
                    ]
                },
                "text": {
                    "status": "generated",
                    "div": "<div> Patient Observations</div>"
                },
                "status": "final",
                "category": {
                    "coding": [
                        {
                            "code": ""
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "code": "",
                        }
                    ]
                },
                "subject": {
                    "reference": ""
                },
                "encounter": {
                    "reference": ""
                },
                "device": {
                    "reference": ""
                },
                "effectiveDateTime": "",
                "component": []
            },
            "request": {
                "method": "",
                "url": "Observation"
            }
        };
        if (flowSheetData[dataIndex].component) {
            flowSheetObservation.resource.category.coding[0].code = flowSheetData[dataIndex].mainCategory.id;
            flowSheetObservation.resource.code.coding[0].code = flowSheetData[dataIndex].mainCategory.id;
            flowSheetObservation.resource.subject.reference = "Patient/" + patientId;
            flowSheetObservation.resource.encounter.reference = "Encounter/" + encounterId;
            flowSheetObservation.resource.effectiveDateTime = flowSheetData[dataIndex].effectiveDataTime;
            var components = flowSheetData[dataIndex].component;
            var observationId, deviceId;
            for (var dataIndex in components) {
                var component = {
                    "code": {
                        "coding": [
                            {
                                "id": "",
                                "system": "",
                                "code": "",
                                "display": ""
                            }
                        ]
                    },
                    "valueQuantity": {
                        "value": "",
                        "unit": ""
                    }
                };
                component.code.coding[0].id = components[dataIndex].category.subCategory.id;
                component.code.coding[0].system = components[dataIndex].category.system;
                component.code.coding[0].code = components[dataIndex].category.subCategory.code;
                component.code.coding[0].display = components[dataIndex].category.subCategory.display;
                if(components[dataIndex].category.subCategory.designation){
                    component.code.coding[0].designation = components[dataIndex].category.subCategory.designation;
                }

                component.valueQuantity.value = components[dataIndex].value;
                var observationDisplay = components[dataIndex].category.subCategory.display;
                var observationUnit = observationDisplay.split('(')[1].split(')')[0];
                component.valueQuantity.unit = observationUnit;
                flowSheetObservation.resource.component.push(component);
                if (!observationId && components[dataIndex].id) {
                    observationId = components[dataIndex].id;
                    if (components[dataIndex].deviceId) {
                        deviceId = components[dataIndex].deviceId;
                    }
                }
            }

            if (observationId) {
                if (deviceId) {
                    flowSheetObservation.resource.device.reference = "Device/" + deviceId;
                } else {
                    delete flowSheetObservation.resource.device;
                }
                flowSheetObservation.resource.id = observationId;
                flowSheetObservation.request.url = "Observation/" + observationId;
                flowSheetObservation.request.method = requestMethod;
            } else {
                flowSheetObservation.request.method = "POST";
            }
            flowSheetUpdateBundle.entry.push(flowSheetObservation);

        } else {
            flowSheetObservation.resource.category.coding[0].code = flowSheetData[dataIndex].category.mainCategory.id;
            flowSheetObservation.resource.code.coding[0].code = flowSheetData[dataIndex].category.mainCategory.id;
            flowSheetObservation.resource.subject.reference = "Patient/" + patientId;
            flowSheetObservation.resource.encounter.reference = "Encounter/" + encounterId;
            flowSheetObservation.resource.effectiveDateTime = flowSheetData[dataIndex].effectiveDataTime;
            var component = {
                "code": {
                    "coding": [
                        {
                            "id": "",
                            "system": "",
                            "code": "",
                            "display": ""
                        }
                    ]
                },
                "valueQuantity": {
                    "value": ""
                    //"unit": ""
                }
            };
            component.code.coding[0].id = flowSheetData[dataIndex].category.subCategory.id;
            component.code.coding[0].system = flowSheetData[dataIndex].category.system;
            component.code.coding[0].code = flowSheetData[dataIndex].category.subCategory.code;
            component.code.coding[0].display = flowSheetData[dataIndex].category.subCategory.display;
            if(flowSheetData[dataIndex].category.subCategory.designation){
                component.code.coding[0].designation = flowSheetData[dataIndex].category.subCategory.designation;
            }
            component.valueQuantity.value = flowSheetData[dataIndex].value;
            // var observationDisplay = flowSheetData[dataIndex].category.subCategory.display;
            // var observationUnit = observationDisplay.split('(')[1].split(')')[0];
            // component.valueQuantity.unit = observationUnit;
            flowSheetObservation.resource.component.push(component);
            if (flowSheetData[dataIndex].deviceId) {
                flowSheetObservation.resource.device.reference = "Device/" + flowSheetData[dataIndex].deviceIds;
            } else {
                delete flowSheetObservation.resource.device;
            }
            if (flowSheetData[dataIndex].id) {
                flowSheetObservation.resource.id = flowSheetData[dataIndex].id;
                flowSheetObservation.request.url = "Observation/" + flowSheetData[dataIndex].id;
                flowSheetObservation.request.method = requestMethod;
            } else {
                flowSheetObservation.request.method = "POST";
            }
            flowSheetUpdateBundle.entry.push(flowSheetObservation);
        }
    }
    return flowSheetUpdateBundle;
}

function removeChartObservationsDataInRedis(patientChartObservations, patientId, chartConfigData) {
    var patientKey = "patient:chart:" + chartConfigData.id + ":" + patientId;
    redisClient.hgetall(patientKey, function (err, object) {
        if (err) {
        }
        var patientChartData = object;
        var chartSeriesData = JSON.parse(patientChartData.chartData);
        for (var seriesConfig of chartConfigData.chartConfig.series) {
            var chartSeriesIndex = chartSeriesData.findIndex(series => series.name === seriesConfig.name);
            if(chartSeriesData[chartSeriesIndex]){
                chartSeriesData[chartSeriesIndex].data = JSON.parse(chartSeriesData[chartSeriesIndex].data)
            }
            var seriesUpdatedData = [];
            var seriesUpdatedDataCount = 0;
            for (var observationDataIndex = patientChartObservations.length-1 ; observationDataIndex >=0 ; observationDataIndex--) {
                if (patientChartObservations[observationDataIndex].category.subCategory.id == seriesConfig.id) {
                    var observationDateTime = moment(patientChartObservations[observationDataIndex].effectiveDataTime).tz(appTimeZone);
                    var observationValue = patientChartObservations[observationDataIndex].value;
                    chartSeriesData[chartSeriesIndex].data = chartSeriesData[chartSeriesIndex].data.filter(series=> series[0] !== observationDateTime.valueOf());
                    seriesUpdatedDataCount++;
                    patientChartObservations.splice(observationDataIndex, 1);
                }
            }
            if(seriesUpdatedDataCount > 0){
                seriesUpdatedData = chartSeriesData[chartSeriesIndex].data;
                seriesUpdatedData.sort((first, second) => {
                    var firstDateTime = moment(first[0]).tz(appTimeZone);
                    var secondDateTime = moment(second[0]).tz(appTimeZone);
                    return secondDateTime - firstDateTime;
                });
                var chartUpdateEventData = {
                    patientId : patientId,
                    chartId : chartConfigData.id,
                    seriesName : seriesConfig.name,
                    SeriesData : seriesUpdatedData
                }
                chartSocketIoEvent("chart",chartUpdateEventData);
            }
            if(chartSeriesData[chartSeriesIndex]){
                chartSeriesData[chartSeriesIndex].data = JSON.stringify(chartSeriesData[chartSeriesIndex].data)
            }
        }
        patientChartData.chartData = JSON.stringify(chartSeriesData);
        redisClient.hmset(patientKey, patientChartData);
    });
}

function removeSubCategoryDataInRedis(subCategoryData, subCategoryObservations) {
    for (var observation of subCategoryObservations) {
        var observationId = observation.id;
        var effectiveDateTime = observation.effectiveDataTime;
        var observationDisplayId = observation.category.subCategory.id;
        if(observationDisplayId === subCategoryData.id){
            delete subCategoryData[effectiveDateTime];
            delete subCategoryData[effectiveDateTime+'-id'];
        }
    }
    return subCategoryData;
}

function updateFluidDataInFhir(patientId,encounterId,flowsheetTypeConfig,effectiveDate,observationData,request){
    var responseMessage = {
        "success": "Successfully updated flowsheet data",
        "error": "Failed to update flowsheet data",
        "successAction": "observations updated",
        "errorAction": "observations update error",
        "patientId": patientId,
        "flowsheetId": flowsheetTypeConfig.id,
        "flowsheetTypeConfig": flowsheetTypeConfig,
        "effectiveDate": effectiveDate
    };

    let flowSheetData = [];
    observationData.forEach((obsData)=>{
        let data = {};
        data['category'] = obsData['category']
        data['effectiveDataTime'] = effectiveDate;
        data['value'] = obsData[effectiveDate]
        flowSheetData.push(data);
    })

    var observationsBundle = prepareFlowSheetUpdateData(patientId, encounterId, flowsheetTypeConfig.id, flowSheetData);
    var requestInfo = {
        requestMethod: 'POST',
        requestUrl: "",
        requestData: observationsBundle,
        request: request
    };
    return fhirRepoCallHandler(requestInfo, prepareFlowSheetUpdateResponse, responseMessage)
}

function calculateTotal(categoryData, observedDateTime, patientFlowsheetData){

    let categoryDataIndex = patientFlowsheetData.findIndex(item=>item.id === categoryData.id);

    if(categoryDataIndex !== -1 && !patientFlowsheetData[categoryDataIndex].id.match(/vs.intk.total|vs.opt.total|vs.balance/)){
        categoryData = patientFlowsheetData[categoryDataIndex];
    }

    let intakeTotalCategoryData = patientFlowsheetData.find(item=>item.id === 'vs.intk.total')
    if(intakeTotalCategoryData){
        if(categoryData.id.match(/vs.int/) && !categoryData.id.match(/vs.intk.total/)){
            if(intakeTotalCategoryData[observedDateTime] >= 0 && categoryData[observedDateTime] >= 0){
                intakeTotalCategoryData[observedDateTime] += categoryData[observedDateTime] || 0;
            }
            intakeTotalCategoryData[observedDateTime] = (intakeTotalCategoryData[observedDateTime]).toFixed(6)/1;
        }
    }
    return categoryData;
}

function reCalculateTotal(categoryData, encounterId, patientId, observedDateTime, patientFlowsheetData, flowsheetConfig, request, saveCategoryData=false){
    let observationData = [];
    let totalCategoryDataArray = [];
    totalCategoryDataArray.push(categoryData);
    let intakeTotalCategoryData = patientFlowsheetData[0].subcategory.find(item=>item.id === 'vs.intk.total')
    intakeTotalCategoryData[observedDateTime] = 0;
    totalCategoryDataArray.push(intakeTotalCategoryData);
    if(saveCategoryData){
        observationData.push(categoryData);
    }
    //recalculate the Intake Total
    patientFlowsheetData.forEach((obsData)=>{
        var catData = obsData;
            if (catData.maincategory && catData.maincategory == true) {
                 catData.subcategory = processFlowSheetSubCategoryInRedis(catData.subcategory, observations='', observedDateTime, flowsheetConfig, status='sum', totalCategoryDataArray, patientId, encounterId, request)
            } else {
                processFlowSheetCategoryInRedis(catData, observations='', observedDateTime, flowsheetConfig, status='sum', totalCategoryDataArray, patientId, encounterId, request)
            }
    })
    observationData.push(intakeTotalCategoryData);

    //recalculate Balance
    let outputTotalCategoryData = patientFlowsheetData[0].subcategory.find(item=>item.id === 'vs.opt.total')
    let balanceCategoryData = patientFlowsheetData[0].subcategory.find(item=>item.id === 'vs.balance')
    balanceCategoryData[observedDateTime] = 0;
    if(balanceCategoryData){
        if(categoryData.id.match(/vs.int/) && !categoryData.id.match(/vs.intk.total/)){
            if( balanceCategoryData[observedDateTime] >= 0 ){
                balanceCategoryData[observedDateTime] = (intakeTotalCategoryData[observedDateTime] ||0) - (outputTotalCategoryData[observedDateTime] || 0);
                // //carry over the balance from previous day.
                // if(balanceCategoryData.fluidData && balanceCategoryData.fluidData.balance && balanceCategoryData.fluidData.balance[moment(observedDateTime).subtract(1,'day').format('YYYY-MM-DD')]){
                //     if(moment(observedDateTime).format('HH:mm') >= '00:00' && moment(observedDateTime).format('HH:mm') <= '07:30' && balanceCategoryData.fluidData.balance[moment(observedDateTime).subtract(2,'day').format('YYYY-MM-DD')]){
                //         balanceCategoryData[observedDateTime] += balanceCategoryData.fluidData.balance[moment(observedDateTime).subtract(2,'day').format('YYYY-MM-DD')];
                //     }else if(balanceCategoryData.fluidData.balance[moment(observedDateTime).subtract(1,'day').format('YYYY-MM-DD')]){
                //         balanceCategoryData[observedDateTime] += balanceCategoryData.fluidData.balance[moment(observedDateTime).subtract(1,'day').format('YYYY-MM-DD')];
                //     }
                // }
            }
        }
    }
    observationData.push(balanceCategoryData);
    return updateFluidDataInFhir(patientId,encounterId,flowsheetConfig,observedDateTime,observationData,request);
}

function resetFluidAutoCalData(subCategoryData, subCategoryObservations, flowsheetObservedDateTime, patientFlowsheetData, flowsheetConfig, patientId, encounterId, request){
    subCategoryData.fluidData = subCategoryObservations[0].fluidData;
    if(subCategoryObservations[0].fluidData.reset && subCategoryObservations[0].fluidData.reset.startTime &&  subCategoryObservations[0].fluidData.reset.endTime &&  subCategoryObservations[0].fluidData.reset.rate){
        let orgTimeZone = appTimeZone;
        let startDateTime = JSON.parse(JSON.stringify(moment(subCategoryObservations[0].fluidData.reset.startTime).tz(orgTimeZone)));
        startDateTime = moment(startDateTime);
        let endDateTime  = JSON.parse(JSON.stringify(moment(subCategoryObservations[0].fluidData.reset.endTime).tz(orgTimeZone)));
        endDateTime = moment(endDateTime);

        while (startDateTime.format() !== endDateTime.format()) {
            if(subCategoryData[startDateTime.format()]){
                //eg: 30 (minutes), time interval.
                let value = 30 * subCategoryObservations[0].fluidData.reset.rate/1;
                if(subCategoryData[moment(startDateTime.format()).subtract(30,'minutes').format()]){
                    value += subCategoryData[moment(startDateTime.format()).subtract(30,'minutes').format()];
                }

                //carry over the balance from previous shift.
                if(subCategoryData.fluidData && subCategoryData.fluidData.balance && subCategoryData.fluidData.balance[moment(startDateTime.format()).subtract(30,'minutes').format()]){
                    value += subCategoryData.fluidData.balance[moment(startDateTime.format()).subtract(30,'minutes').format()];
                    delete subCategoryData.fluidData.lastValue;
                }else if(subCategoryData.fluidData && subCategoryData.fluidData.lastValue && !subCategoryData[moment(startDateTime.format()).subtract(30,'minutes').format()]){
                    value += subCategoryData.fluidData.lastValue/1;
                }else if(subCategoryData.fluidData){
                    subCategoryData.fluidData.lastValue = (value).toFixed(6)/1;
                }

                subCategoryData.fluidData[startDateTime.format()+'-rate'] = subCategoryObservations[0].fluidData.reset.rate;
                if(startDateTime.format() === "07:30"){
                    subCategoryData.fluidData.balance = {};
                    subCategoryData.fluidData.balance[startDateTime.format()] = (value).toFixed(6)/1;
                }
                subCategoryData[startDateTime.format()] = (value).toFixed(6)/1;
                reCalculateTotal(subCategoryData, encounterId, patientId, startDateTime.format(), patientFlowsheetData, flowsheetConfig, request, saveCategoryData=true);
            }
            startDateTime.add(30, 'minutes');
        }
        return subCategoryData;
    }else{
        return subCategoryData;
    }
}

function prepareFluidAutoCalDeleteData(subCategoryData, subCategoryObservations, observedDateTime, patientFlowsheetData, flowsheetConfig, patientId, encounterId, request) {
    subCategoryData.fluidData = subCategoryObservations[0].fluidData;
    let duplicateSubCategoryData = JSON.parse(JSON.stringify(subCategoryData));
    let promises = [];
    let orgTimeZone = appTimeZone;
    let morningDate = moment(observedDateTime).tz(orgTimeZone).startOf('day');
    let eveningDate = moment(observedDateTime).tz(orgTimeZone).startOf('day');
    let nightDate = moment(observedDateTime).tz(orgTimeZone).startOf('day');
    let prevNightShiftDate = moment(observedDateTime).tz(orgTimeZone).startOf('day');

    morningDate.add(8, 'hours');
    while (morningDate.format('HH:mm') !== '14:00') {
        let categoryData = {
                              "category": '',
                              "effectiveDataTime": '',
                              "id": '',
                              "value": ''
                            }
        if(subCategoryData[morningDate.format()]){
            categoryData.category = duplicateSubCategoryData.category;
            categoryData.fluidData = duplicateSubCategoryData.fluidData;
            categoryData.validations = duplicateSubCategoryData.validations;
            categoryData.effectiveDataTime = morningDate.format();
            categoryData.id = duplicateSubCategoryData[morningDate.format()+'-id'];
            categoryData.value = duplicateSubCategoryData[morningDate.format()];
            delete subCategoryData[morningDate.format()];
            delete subCategoryData[morningDate.format()+'-id'];
            let deleteObservations = {};
            deleteObservations['deleteObs'] = [];
            deleteObservations['deleteObs'].push(categoryData);
            deleteFlowsheetCellValue(patientId, encounterId, flowsheetConfig.id, observedDateTime, deleteObservations, request);
            reCalculateTotal(subCategoryData, encounterId, patientId, morningDate.format(), patientFlowsheetData, flowsheetConfig, request);
        }
        morningDate.add(30, 'minutes');
    }

    eveningDate.add(14, 'hours');
    while (eveningDate.format('HH:mm') !== '20:00') {
        let categoryData = {
                              "category": '',
                              "effectiveDataTime": '',
                              "id": '',
                              "value": ''
                            }
        if(subCategoryData[eveningDate.format()]){
            categoryData.category = duplicateSubCategoryData.category;
            categoryData.fluidData = duplicateSubCategoryData.fluidData;
            categoryData.validations = duplicateSubCategoryData.validations;
            categoryData.effectiveDataTime = eveningDate.format();
            categoryData.id = duplicateSubCategoryData[eveningDate.format()+'-id'];
            categoryData.value = duplicateSubCategoryData[eveningDate.format()];
            delete subCategoryData[eveningDate.format()];
            delete subCategoryData[eveningDate.format()+'-id'];
            let deleteObservations = {};
            deleteObservations['deleteObs'] = [];
            deleteObservations['deleteObs'].push(categoryData);
            deleteFlowsheetCellValue(patientId, encounterId, flowsheetConfig.id, observedDateTime, deleteObservations, request);
            reCalculateTotal(subCategoryData, encounterId, patientId, eveningDate.format(), patientFlowsheetData, flowsheetConfig, request);
        }
        eveningDate.add(30, 'minutes');
    }

    nightDate.add(20, 'hours');
    while (nightDate.format('HH:mm') !== '08:00') {
        let categoryData = {
                              "category": '',
                              "effectiveDataTime": '',
                              "id": '',
                              "value": ''
                            }
        if(subCategoryData[nightDate.format()]){
            categoryData.category = duplicateSubCategoryData.category;
            categoryData.fluidData = duplicateSubCategoryData.fluidData;
            categoryData.validations = duplicateSubCategoryData.validations;
            categoryData.effectiveDataTime = nightDate.format();
            categoryData.id = duplicateSubCategoryData[nightDate.format()+'-id'];
            categoryData.value = duplicateSubCategoryData[nightDate.format()];
            delete subCategoryData[nightDate.format()];
            delete subCategoryData[nightDate.format()+'-id'];
            let deleteObservations = {};
            deleteObservations['deleteObs'] = [];
            deleteObservations['deleteObs'].push(categoryData);
            deleteFlowsheetCellValue(patientId, encounterId, flowsheetConfig.id, observedDateTime, deleteObservations, request);
            reCalculateTotal(subCategoryData, encounterId, patientId, nightDate.format(), patientFlowsheetData, flowsheetConfig, request);
        }
        nightDate.add(30, 'minutes');
    }

    prevNightShiftDate.add(00, 'hours');
    while (prevNightShiftDate.format('HH:mm') !== '08:00') {
        let categoryData = {
                              "category": '',
                              "effectiveDataTime": '',
                              "id": '',
                              "value": ''
                            }
        if(subCategoryData[prevNightShiftDate.format()]){
            categoryData.category = duplicateSubCategoryData.category;
            categoryData.fluidData = duplicateSubCategoryData.fluidData;
            categoryData.validations = duplicateSubCategoryData.validations;
            categoryData.effectiveDataTime = prevNightShiftDate.format();
            categoryData.id = duplicateSubCategoryData[prevNightShiftDate.format()+'-id'];
            categoryData.value = duplicateSubCategoryData[prevNightShiftDate.format()];
            delete subCategoryData[prevNightShiftDate.format()];
            delete subCategoryData[prevNightShiftDate.format()+'-id'];
            let deleteObservations = {};
            deleteObservations['deleteObs'] = [];
            deleteObservations['deleteObs'].push(categoryData);
            deleteFlowsheetCellValue(patientId, encounterId, flowsheetConfig.id, observedDateTime, deleteObservations, request);
            reCalculateTotal(subCategoryData, encounterId, patientId, prevNightShiftDate.format(), patientFlowsheetData, flowsheetConfig, request);
        }
        prevNightShiftDate.add(30, 'minutes');
    }
    return subCategoryData;
}

function setSubCategoryFluidDataInRedis(subCategoryData, subCategoryObservations, flowsheetObservedDateTime, patientFlowsheetData, flowsheetConfig, patientId, encounterId, request) {
    if(subCategoryObservations[0].fluidData && (subCategoryObservations[0].fluidData.action === 'start' || subCategoryObservations[0].fluidData.action === 'stop')){
        subCategoryData.fluidData = subCategoryObservations[0].fluidData;
        return subCategoryData;
    }else if(subCategoryObservations[0].fluidData && subCategoryObservations[0].fluidData.action === 'clear'){
        return prepareFluidAutoCalDeleteData(subCategoryData, subCategoryObservations, flowsheetObservedDateTime, patientFlowsheetData, flowsheetConfig, patientId, encounterId, request);
    }else if(subCategoryObservations[0].fluidData && subCategoryObservations[0].fluidData.action === 'reset'){
        return resetFluidAutoCalData(subCategoryData, subCategoryObservations, flowsheetObservedDateTime, patientFlowsheetData, flowsheetConfig, patientId, encounterId, request);
    }
}

function processFlowSheetCategoryInRedis(categoryData, observations, flowsheetObservedDateTime, flowsheetConfig, status, patientFlowsheetData, patientId, encounterId, request) {
    var categoryObservations = observations ? observations.filter(observation => observation.category.subCategory.id == categoryData.category.subCategory.id) : [];
    if (categoryObservations && categoryObservations.length > 0) {
        if(status === 'delete'){
            return removeSubCategoryDataInRedis(JSON.parse(JSON.stringify(categoryData)), categoryObservations);
        }else if(status === 'fluidDataAutoCal'){
            return setSubCategoryFluidDataInRedis(JSON.parse(JSON.stringify(categoryData)), categoryObservations, flowsheetObservedDateTime, patientFlowsheetData, flowsheetConfig, patientId, encounterId, request);
        }
    }else if(status === 'sum'){
            return calculateTotal(categoryData, flowsheetObservedDateTime, patientFlowsheetData)
    }else{
        return categoryData;
    }
}

function processFlowSheetSubCategoryInRedis(subcategory, observations, flowsheetObservedDateTime, flowsheetConfig, status, patientFlowsheetData, patientId, encounterId, request) {
    var updatedSubCategory = [];
    for (var dataIndex in subcategory) {
        var categoryData = JSON.parse(JSON.stringify(subcategory[dataIndex]));
        if (categoryData.maincategory && categoryData.maincategory == true) {
            categoryData.subcategory = processFlowSheetSubCategoryInRedis(JSON.parse(JSON.stringify(categoryData.subcategory)), observations, flowsheetObservedDateTime, flowsheetConfig, status, patientFlowsheetData, patientId, encounterId, request);
            updatedSubCategory.push(categoryData);
        } else {
            updatedSubCategory.push(processFlowSheetCategoryInRedis(categoryData, observations, flowsheetObservedDateTime, flowsheetConfig, status, patientFlowsheetData, patientId, encounterId, request));
        }
    }
    return updatedSubCategory;
}

function processFlowSheetObservationsDataInRedis(patientFlowsheetObservations, patientId, patientKey, observationEffectiveDateTime, flowsheetConfig, status,  encounterId, request){
    return new Promise((resolve, reject) => {
        redisClient.hgetall(patientKey, function (err, object) {
            if (err) {
                reject("Error occured while preparing patient flowsheet data from observations");
            }
            var patientObservationsData = object;
            var flowsheetObservationsData = JSON.parse(patientObservationsData.flowSheetData);
            var flowsheetObservationsIndex = flowsheetObservationsData.findIndex(observation => moment(observation.observedDate).tz(appTimeZone).format('MM-DD-YYYY') === moment(observationEffectiveDateTime).tz(appTimeZone).format('MM-DD-YYYY'));
            if (flowsheetObservationsIndex >= 0) {
                var patientFlowsheetData = JSON.parse(JSON.stringify(flowsheetObservationsData[flowsheetObservationsIndex].observationData));
                var flowsheetObservedDateTime = flowsheetObservationsData[flowsheetObservationsIndex].observedDate;
                var updatedFlowsheetData = [];
                for (var dataIndex in patientFlowsheetData) {
                    var categoryData = JSON.parse(JSON.stringify(patientFlowsheetData[dataIndex]));
                    if (categoryData.maincategory && categoryData.maincategory == true) {
                        categoryData.subcategory = processFlowSheetSubCategoryInRedis(JSON.parse(JSON.stringify(categoryData.subcategory)), patientFlowsheetObservations, flowsheetObservedDateTime, flowsheetConfig, status, patientFlowsheetData, patientId, encounterId, request);
                        updatedFlowsheetData.push(categoryData);
                    } else {
                        updatedFlowsheetData.push(processFlowSheetCategoryInRedis(categoryData, patientFlowsheetObservations, flowsheetObservedDateTime, flowsheetConfig, status, patientFlowsheetData, patientId, encounterId, request));
                    }
                }
                flowsheetObservationsData[flowsheetObservationsIndex].observationData = updatedFlowsheetData;
                patientObservationsData.flowSheetData = JSON.stringify(flowsheetObservationsData);
                redisClient.hmset(patientKey, patientObservationsData);
                resolve("Processed flowsheet observation data for patient");
            }
        });
    });
}

function updateFlowsheetDataInRedis(fhirdata, responseMessage){
    var successResponse = {
        message: responseMessage.success
    }

    var chartFhirData = JSON.parse(JSON.stringify(responseMessage.deleteObservation));
    var flowsheetFhirData = JSON.parse(JSON.stringify(responseMessage.deleteObservation));

    var flowsheetTypeConfig = flowsheetConfig.find(configData => configData.id === responseMessage.flowsheetId);
    if (flowsheetTypeConfig.prepareChart) {
        var chartConfigData = chartConfig.find(configData => configData.id === flowsheetTypeConfig.id);
        removeChartObservationsDataInRedis(chartFhirData, responseMessage.patientId, chartConfigData);
    }
    
    var patientKey = "patient:" + responseMessage.flowsheetId + ":" + responseMessage.patientId;
    processFlowSheetObservationsDataInRedis(flowsheetFhirData, responseMessage.patientId, patientKey, responseMessage.effectiveDate, responseMessage.flowsheetTypeConfig, status='delete')
        .then((response) => {
            return successResponse;
        })
        .catch((error) => {
            return responseMessage.error;
        });
}

function deleteFlowsheetCellValue(patientId, encounterId, flowsheetId, effectiveDate, flowSheetData, request) {
    var flowsheetTypeConfig = flowsheetConfig.find((flowsheetType) => flowsheetType.id === flowsheetId);
    var responseMessage = {
        "success": "Successfully updated/deleted flowsheet data",
        "error": "Failed to update/delete flowsheet data",
        "successAction": "observations updated/deleted",
        "errorAction": "observations update/delete error",
        "patientId": patientId,
        "flowsheetId": flowsheetId,
        "flowsheetTypeConfig": flowsheetTypeConfig,
        "effectiveDate": effectiveDate,
        "deleteObservation": flowSheetData['deleteObs']
    };
    var observationsBundle = prepareFlowSheetUpdateData(patientId, encounterId, flowsheetId, flowSheetData['deleteObs'],'DELETE');

    var requestInfo = {
        requestMethod: 'POST',
        requestUrl: "",
        requestData: observationsBundle,
        request: request
    };
    return fhirRepoCallHandler(requestInfo, updateFlowsheetDataInRedis, responseMessage)
}

function updateFlowsheet(patientId, encounterId, flowsheetId, effectiveDate, flowSheetData, request) {
    if(flowSheetData['updateObs'].length){
        var flowsheetTypeConfig = flowsheetConfig.find((flowsheetType) => flowsheetType.id === flowsheetId);
        var responseMessage = {
            "success": "Successfully updated flowsheet data",
            "error": "Failed to update flowsheet data",
            "successAction": "observations updated",
            "errorAction": "observations update error",
            "patientId": patientId,
            "flowsheetId": flowsheetId,
            "flowsheetTypeConfig": flowsheetTypeConfig,
            "effectiveDate": effectiveDate
        };
        if (flowsheetTypeConfig.storeColdef && flowSheetData['updateObs'][0].colDef && flowSheetData['updateObs'][0].colDef.length) {
            responseMessage.colDef = flowSheetData['updateObs'][0].colDef;
        }

        //separates the normal Data and FluidAutoCalData
        if(flowsheetId === 'fluids'){
            let autoCalFluidData = flowSheetData['updateObs'].filter(item=>item.fluidData);
            flowSheetData['updateObs'] = flowSheetData['updateObs'].filter(item=> item.value/1 >= 0 || item.value/1 <= 0);
            responseMessage.fluidData = autoCalFluidData;
        }

        var makeRequest;
        if(flowSheetData['updateObs'].length){
            var observationsBundle = prepareFlowSheetUpdateData(patientId, encounterId, flowsheetId, flowSheetData['updateObs']);
            var requestInfo = {
                requestMethod: 'POST',
                requestUrl: "",
                requestData: observationsBundle,
                request: request
            };
            makeRequest = fhirRepoCallHandler(requestInfo, prepareFlowSheetUpdateResponse, responseMessage)
        }else if(responseMessage.fluidData.length){
            //if the request has only FluidAutoCalData
            var patientKey = "patient:" + responseMessage.flowsheetId + ":" + responseMessage.patientId;
            makeRequest = processFlowSheetObservationsDataInRedis(responseMessage.fluidData, responseMessage.patientId, patientKey, responseMessage.effectiveDate, responseMessage.flowsheetTypeConfig, status='fluidDataAutoCal', encounterId, request)
        }
        return makeRequest
        .then((response)=>{
            if(flowSheetData['deleteObs'].length){
                return deleteFlowsheetCellValue(patientId, encounterId, flowsheetId, effectiveDate, flowSheetData, request);
            }else{
                return Promise.resolve(response);
            }
        })
        .catch((error)=>{
            return Promise.reject(error);
        })
    }
    else if(flowSheetData['deleteObs'].length){
        return deleteFlowsheetCellValue(patientId, encounterId, flowsheetId, effectiveDate, flowSheetData, request);
    }
}

function prepareFlowSheetRowData() {
    var flowSheetValueSet = getFlowSheetValueSet();
    flowSheetGridRowData = prepareFlowSheet(flowSheetValueSet);
    return true;
}

function prepareRedisFlowsheetPatientData(flowsheetId, patientId, gridRowData, patientAdmittedDate, patientEncounterId) {
    var observedDate = moment(patientAdmittedDate).tz(appTimeZone);
    var todayDate = moment().tz(appTimeZone);
    todayDate.add(1, 'day');
    return new Promise((resolve, reject) => {
        redisClient.exists("patient:" + flowsheetId + ":" + patientId, function (err, reply) {
            if (err) {
                reject("Error occured while preparing patient flowsheet data");
            }
            if (reply === 1) {
                redisClient.hgetall("patient:" + flowsheetId + ":" + patientId, function (err, object) {
                    if (err) {
                        reject("Error occured while preparing patient flowsheet data");
                    }
                    var patientFlowsheetData = object;
                    var flowsheetObservationsData = JSON.parse(patientFlowsheetData.flowSheetData);
                    while (observedDate.format('DD MMM YYYY') !== todayDate.format('DD MMM YYYY')) {
                        var flowsheetObservations = flowsheetObservationsData.find(observation => moment(observation.observedDate).tz(appTimeZone).format('MM-DD-YYYY') === observedDate.format('MM-DD-YYYY'));
                        if (!flowsheetObservations) {
                            var observationData = {
                                observedDate: observedDate.format(),
                                observationData: gridRowData
                            };
                            flowsheetObservationsData.push(observationData);
                        }
                        observedDate.add(1, 'day');
                    }
                    patientFlowsheetData.flowSheetData = JSON.stringify(flowsheetObservationsData);
                    redisClient.hmset("patient:" + flowsheetId + ":" + patientId, patientFlowsheetData);
                    resolve("Prepared flowsheet data for " + flowsheetId + "for patient " + patientId);
                });
            } else {
                var flowsheetObservationsData = [];
                while (observedDate.format('DD MMM YYYY') !== todayDate.format('DD MMM YYYY')) {
                    var observationData = {
                        observedDate: observedDate.format(),
                        observationData: gridRowData
                    };
                    flowsheetObservationsData.push(observationData);
                    observedDate.add(1, 'day');
                }
                var flowSheetData = {
                    patientId: patientId,
                    admittedDate: patientAdmittedDate,
                    encounterId: patientEncounterId,
                    flowSheetData: JSON.stringify(flowsheetObservationsData)
                };
                redisClient.hmset("patient:" + flowsheetId + ":" + patientId, flowSheetData);
                resolve("Prepared flowsheet data for patient");
            }
        });
    });
}

function prepareRedisPatientChartData(chartConfigData, patientId, patientAdmittedDate, patientEncounterId) {
    return new Promise((resolve, reject) => {
        redisClient.exists("patient:chart:" + chartConfigData.id + ":" + patientId, function (err, reply) {
            if (err) {
                reject("Error occured while preparing patient chart data");
            }
            if (reply !== 1) {
                var chartObservationsData = [];
                for (var seriesConfig of chartConfigData.chartConfig.series) {
                    var seriesData = {
                        name: seriesConfig.name,
                        data: new Map()
                    };
                    seriesData.data = JSON.stringify([...seriesData.data])
                    chartObservationsData.push(seriesData);
                }
                var chartData = {
                    patientId: patientId,
                    admittedDate: patientAdmittedDate,
                    encounterId: patientEncounterId,
                    chartConfig: JSON.stringify(chartConfigData.chartConfig),
                    chartData: JSON.stringify(chartObservationsData)
                };
                redisClient.hmset("patient:chart:" + chartConfigData.id + ":" + patientId, chartData);
                resolve("Prepared chart data for patient");
            }
        });
    });
}

function prepareFlowSheetForAdmittedPatient(patientId, patientAdmittedDate, patientEncounterId) {
    var flowsheetPreparePromises = [];
    for (var configData of flowsheetConfig) {
        var gridRowData = flowSheetGridRowData.find(gridData => gridData.valueSetTag === configData.tag);
        flowsheetPreparePromises.push(prepareRedisFlowsheetPatientData(configData.id, patientId, gridRowData.gridData, patientAdmittedDate, patientEncounterId));
    }
    return Promise.all(flowsheetPreparePromises)
        .then(response => {
            return Promise.resolve("Prepared flowsheet data for patient:" + patientId);
        })
        .catch(error => {
            return Promise.reject("Error while preparing flowsheet data for patient " + patientId + ":" + error);
        });
}

function prepareChartDataForAdmittedPatient(patientId, patientAdmittedDate, patientEncounterId) {
    var chartPreparePromises = [];
    for (var configData of chartConfig) {
        chartPreparePromises.push(prepareRedisPatientChartData(configData, patientId, patientAdmittedDate, patientEncounterId));
    }
    return Promise.all(chartPreparePromises)
        .then(response => {
            return Promise.resolve("Prepared chart data for patient:" + patientId);
        })
        .catch(error => {
            return Promise.reject("Error while preparing chart data for patient " + patientId + ":" + error);
        });
}

function processFlowSheetSubCategory(subcategory, observations, patientAdmittedDate, flowsheetConfig, patientId, patientFlowsheetData) {
    var updatedSubCategory = [];
    for (var dataIndex in subcategory) {
        var categoryData = JSON.parse(JSON.stringify(subcategory[dataIndex]));
        if (categoryData.maincategory && categoryData.maincategory == true) {
            categoryData.subcategory = processFlowSheetSubCategory(JSON.parse(JSON.stringify(categoryData.subcategory)), observations, patientAdmittedDate, flowsheetConfig, patientId, patientFlowsheetData);
            updatedSubCategory.push(categoryData);
        } else {
            updatedSubCategory.push(processFlowSheetCategory(categoryData, observations, patientAdmittedDate, flowsheetConfig, patientId, patientFlowsheetData));
        }
    }
    return updatedSubCategory;
}

function processFlowSheetCategory(categoryData, observations, patientAdmittedDate, flowsheetConfig, patientId, patientFlowsheetData) {
    var categoryObservations = observations.filter(observation => observation.resource.component[0].code.coding[0].id == categoryData.category.subCategory.id);
    if (categoryObservations.length > 0) {
        var isSubCategoryGroup = false;
        if (flowsheetConfig.storeColdef) {
            return prepareSubCategoryData(JSON.parse(JSON.stringify(categoryData)), categoryObservations, patientAdmittedDate);
        }else{
            return prepareAutoChartSubCategoryData(JSON.parse(JSON.stringify(categoryData)), categoryObservations, patientAdmittedDate, flowsheetConfig, patientId, patientFlowsheetData);
        }
    } else {
        return categoryData;
    }
}

function processChartObservationsData(patientChartObservations, patientId, chartConfigData) {
    var patientKey = "patient:chart:" + chartConfigData.id + ":" + patientId;
    redisClient.hgetall(patientKey, function (err, object) {
        if (err) {
        }
        var patientChartData = object;
        var chartSeriesData = JSON.parse(patientChartData.chartData);
        for (var seriesConfig of chartConfigData.chartConfig.series) {
            var chartSeriesIndex = chartSeriesData.findIndex(series => series.name === seriesConfig.name);
            if(chartSeriesData[chartSeriesIndex]){
                chartSeriesData[chartSeriesIndex].data = new Map(JSON.parse(chartSeriesData[chartSeriesIndex].data))
            }
            var seriesUpdatedData = [];
            var seriesUpdatedDataCount = 0;
            for (var observationDataIndex = patientChartObservations.length-1 ; observationDataIndex >=0 ; observationDataIndex--) {
                if (patientChartObservations[observationDataIndex].resource.component[0].code.coding[0].id == seriesConfig.id) {
                    var observationDateTime = moment(patientChartObservations[observationDataIndex].resource.effectiveDateTime).tz(appTimeZone);
                    var observationValue = patientChartObservations[observationDataIndex].resource.component[0].valueQuantity.value;
                    observationValue = numeral(observationValue).format(seriesConfig.validations.format);
                    chartSeriesData[chartSeriesIndex].data.set(observationDateTime.valueOf(), observationValue/1);
                    seriesUpdatedDataCount++;
                    patientChartObservations.splice(observationDataIndex, 1);
                }
            }
            if(seriesUpdatedDataCount > 0){
                for (var [key, value] of chartSeriesData[chartSeriesIndex].data.entries()) {
                  seriesUpdatedData.push([key,value]);
                }
                seriesUpdatedData.sort((first, second) => {
                    var firstDateTime = moment(first[0]).tz(appTimeZone);
                    var secondDateTime = moment(second[0]).tz(appTimeZone);
                    return firstDateTime - secondDateTime;
                });
                var chartUpdateEventData = {
                    patientId : patientId,
                    chartId : chartConfigData.id,
                    seriesName : seriesConfig.name,
                    SeriesData : seriesUpdatedData
                }
                chartSocketIoEvent("chart",chartUpdateEventData);
            }
            if(chartSeriesData[chartSeriesIndex]){
                chartSeriesData[chartSeriesIndex].data = JSON.stringify([...chartSeriesData[chartSeriesIndex].data])
            }
        }
        patientChartData.chartData = JSON.stringify(chartSeriesData);
        redisClient.hmset(patientKey, patientChartData);
    });
}

function processFlowSheetObservationsData(patientFlowsheetObservations, patientId, patientKey, isAdmittedDateTimeObservations, observationEffectiveDateTime, gridColDef, flowsheetConfig) {
    return new Promise((resolve, reject) => {
        redisClient.hgetall(patientKey, function (err, object) {
            if (err) {
                reject("Error occured while preparing patient flowsheet data from observations");
            }
            var patientObservationsData = object;
            var flowsheetObservationsData = JSON.parse(patientObservationsData.flowSheetData);
            var flowsheetObservationsDataLength = flowsheetObservationsData.length;
            if (isAdmittedDateTimeObservations) {
                for (var flowsheetDataIndex = 0; flowsheetDataIndex < flowsheetObservationsDataLength; flowsheetDataIndex++) {
                    var flowsheetObservedDateTime = flowsheetObservationsData[flowsheetDataIndex].observedDate;
                    var flowsheetObservedData = flowsheetObservationsData[flowsheetDataIndex].observationData;
                    var flowsheetObservedDate = moment(flowsheetObservationsData[flowsheetDataIndex].observedDate).tz(appTimeZone).format('MM-DD-YYYY');
                    var observations = [];
                    for (var observationDataIndex = patientFlowsheetObservations.length-1; observationDataIndex >=0 ; observationDataIndex--) {
                        var effectiveDate = moment(patientFlowsheetObservations[observationDataIndex].resource.effectiveDateTime).tz(appTimeZone).format('MM-DD-YYYY');
                        if (effectiveDate === flowsheetObservedDate) {
                            observations.push(patientFlowsheetObservations[observationDataIndex]);
                            patientFlowsheetObservations.splice(observationDataIndex, 1);
                        }
                    }
                    if (observations.length > 0) {
                        var patientFlowsheetData = JSON.parse(JSON.stringify(flowsheetObservedData));
                        var updatedFlowsheetData = [];
                        for (var dataIndex in patientFlowsheetData) {
                            var categoryData = JSON.parse(JSON.stringify(patientFlowsheetData[dataIndex]));
                            if (categoryData.maincategory && categoryData.maincategory == true) {
                                categoryData.subcategory = processFlowSheetSubCategory(JSON.parse(JSON.stringify(categoryData.subcategory)), observations, flowsheetObservedDateTime, flowsheetConfig, patientId,patientFlowsheetData);
                                updatedFlowsheetData.push(categoryData);
                            } else {
                                updatedFlowsheetData.push(processFlowSheetCategory(categoryData, observations, flowsheetObservedDateTime, flowsheetConfig, patientId,patientFlowsheetData));
                            }
                        }
                        flowsheetObservationsData[flowsheetDataIndex].observationData = updatedFlowsheetData;
                    }
                }
                patientObservationsData.flowSheetData = JSON.stringify(flowsheetObservationsData);
                redisClient.hmset(patientKey, patientObservationsData);
                resolve("Processed flowsheet observation data for patient");
            } else {
                var flowsheetObservationsIndex = flowsheetObservationsData.findIndex(observation => moment(observation.observedDate).tz(appTimeZone).format('MM-DD-YYYY') === moment(observationEffectiveDateTime).tz(appTimeZone).format('MM-DD-YYYY'));
                if (flowsheetObservationsIndex >= 0) {
                    var patientFlowsheetData = JSON.parse(JSON.stringify(flowsheetObservationsData[flowsheetObservationsIndex].observationData));
                    var flowsheetObservedDateTime = flowsheetObservationsData[flowsheetObservationsIndex].observedDate;
                    var updatedFlowsheetData = [];
                    for (var dataIndex in patientFlowsheetData) {
                        var categoryData = JSON.parse(JSON.stringify(patientFlowsheetData[dataIndex]));
                        if (categoryData.maincategory && categoryData.maincategory == true) {
                            categoryData.subcategory = processFlowSheetSubCategory(JSON.parse(JSON.stringify(categoryData.subcategory)), patientFlowsheetObservations, flowsheetObservedDateTime, flowsheetConfig, patientId,patientFlowsheetData);
                            updatedFlowsheetData.push(categoryData);
                        } else {
                            updatedFlowsheetData.push(processFlowSheetCategory(categoryData, patientFlowsheetObservations, flowsheetObservedDateTime, flowsheetConfig, patientId,patientFlowsheetData));
                        }
                    }
                    flowsheetObservationsData[flowsheetObservationsIndex].observationData = updatedFlowsheetData;
                    if (flowsheetConfig.storeColdef && gridColDef && gridColDef.length) {
                        flowsheetObservationsData[flowsheetObservationsIndex].gridColDef = gridColDef;
                    }
                    patientObservationsData.flowSheetData = JSON.stringify(flowsheetObservationsData);
                    redisClient.hmset(patientKey, patientObservationsData);
                    resolve("Processed flowsheet observation data for patient");
                }
            }
        });
    });
}

function deleteFlowsheet(patientId) {
    for (var configData of flowsheetConfig) {
        var patientKey = "patient:" + configData.id + ":" + patientId;
        redisClient.del(patientKey, function (err, reply) {
            if (err) {
            }
        });
        if (configData.prepareChart) {
            var patientKey = "patient:chart:" + configData.id + ":" + patientId;
            console.log("Deleting patient " + patientId + " " + configData.id + " chart data from redis");
            redisClient.del(patientKey, function (err, reply) {
                if (err) {
                }
            });
        }
    };
}

module.exports = {
    getFlowsheet: getFlowsheet,
    getChartData: getChartData,
    updateFlowsheet: updateFlowsheet,
    deleteFlowsheet: deleteFlowsheet,
    setFlowSheetValueSet: setFlowSheetValueSet,
    getFlowSheetValueSet: getFlowSheetValueSet,
    getFhirFlowsheetValueSet: getFhirFlowsheetValueSet,
    prepareFlowSheetForAdmittedPatient: prepareFlowSheetForAdmittedPatient,
    prepareChartDataForAdmittedPatient: prepareChartDataForAdmittedPatient,
    prepareFlowSheetRowData: prepareFlowSheetRowData,
    flowSheetSocketIoEvent: flowSheetSocketIoEvent
};