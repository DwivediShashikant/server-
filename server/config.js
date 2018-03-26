//Identity and API Manager server URLs
const servicesUrl = {
    iamUrl: "https://ec2-52-66-154-99.ap-south-1.compute.amazonaws.com:8246",
    iamAdminServiceUrl: "https://ec2-52-66-154-99.ap-south-1.compute.amazonaws.com:9446/services/UserAdmin.UserAdminHttpsSoap11Endpoint",
    fhirRepoUrl: "http://ec2-52-66-13-53.ap-south-1.compute.amazonaws.com:9090/fhir/api/",
    iCertainUrl: "http://ambient3.ddns.net/icertain/index.php",
    fhirUrl: "http://ec2-52-66-13-53.ap-south-1.compute.amazonaws.com:9090"
};

//Tenant configurations
const tenantsConfiguration = [
    {
        tenantName: "kauveryhealthcare.com",
        docStoreName: "kauveryhealthcare.com",
        authorisationKey: "d084Q3NhWFk1bGJYT21lUFZGdDdUcjAzZnQ0YTphdDRfX19BQ0pkZkdURWdPZ2JSb2pPR0xrZndh",
        iamAuthorisationKey: "dGVuYW50LmFkbWluQGthdXZlcnloZWFsdGhjYXJlLmNvbTpLSDEyMyo=",
        presenceServiceUrl: "/t/kauveryhealthcare.com/uoapi/v1/",
        fhirServiceUrl: "/t/kauveryhealthcare.com/fhirapi/v1/",
        meetingServiceUrl: "/t/kauveryhealthcare.com/mtgapi/v1/",
        icertainServiceUrl: "/t/kauveryhealthcare.com/certain/v1"
    },
    {
        tenantName: "critinext.com",
        docStoreName: "critinext.com",
        authorisationKey: "dDFEVDhtSjhZakR5Zm94V2tETjBUeVdQWWp3YTpYcHF2VGU5ZnNmMVdPYU9PZ0lwdVZ5WUFzNkVh",
        iamAuthorisationKey: "dGVuYW50LmFkbWluQGNyaXRpbmV4dC5jb206Q04xMjMq",
        presenceServiceUrl: "/t/critinext.com/uoapi/v1/",
        fhirServiceUrl: "/t/critinext.com/fhirapi/v1/",
        meetingServiceUrl: "/t/critinext.com/mtgapi/v1/",
        icertainServiceUrl: "/t/critinext.com/certain/v1"
    }
];

//Flowsheet configurations
const flowsheetConfiguration = [
    {
        id: "vitalsigns",
        tag: "cm_vitalsigns_result",
        autoprocess: true,
        prepareChart: true,
        storeColdef: false
    },
    {
        id: "fluids",
        tag: "cm_fluids",
        autoprocess: false,
        prepareChart: true,
        storeColdef: false,
        validations: {
        columns:['day_total'],
        autoCalRows: ['vs.intk.intvns.crlds.ns','vs.intk.intvns.crlds.5d','vs.intk.intvns.crlds.10d','vs.intk.intvns.crlds.dns',
                      'vs.intk.intvns.crlds.rl','vs.intk.intvns.clds.pn','vs.intk.intvns.clds.hl','vs.intk.intvns.clds.sh',
                      'vs.intk.intvns.bld.wbld','vs.intk.intvns.bld.prbc','vs.intk.intvns.bld.fbld','vs.intk.intvns.bld.pas',
                      'vs.intk.intvns.bld.plce','vs.intk.intvns.bld.ffp','vs.intk.inf.mdn','vs.intk.inf.fld'
                     ]
        }
    },
    {
        id: "labs",
        tag: "cm_lab_biochemistry",
        autoprocess: false,
        prepareChart: false,
        storeColdef: true
    }
];

//Chart configurations
const chartConfiguration = [
    {
        id: "vitalsigns",
        tag: "cm_vitalsigns_result",
        chartConfig: {
            series: [
                {
                    type: 'spline',
                    name: 'HR(bpm)',
                    id: 'vs.heartrate',
                    validations: {
                        format: '0.00'
                    }
                },
                {
                    type: 'spline',
                    name: 'Temperature(degC)',
                    id: 'vs.temp.oral',
                    validations: {
                        format: '0.00'
                    }
                },
                {
                    type: 'spline',
                    name: 'SpO2 (%)',
                    id: 'vs.spo2',
                    validations: {
                        format: '0.00'
                    }
                },
                {
                    type: 'spline',
                    name: 'Respiration Rate (bpm)',
                    id: 'vs.respiration',
                    validations: {
                        format: '0.00'
                    }
                },
                {
                    type: 'spline',
                    name: 'NIBP-Systolic',
                    id: 'vs.nibp.sys',
                    validations: {
                        format: '0.00'
                    }
                },
                {
                    type: 'spline',
                    name: 'NIBP-Diastolic',
                    id: 'vs.nibp.dia',
                    validations: {
                        format: '0.00'
                    }
                },
                {
                    type: 'spline',
                    name: 'NIBP-Mean',
                    id: 'vs.nibp.mean',
                    validations: {
                        format: '0.00'
                    }
                }
            ]
        }
    },
    {
        id: "fluids",
        tag: "cm_fluids",
        chartConfig: {
            series: [
                {
                    type: 'column',
                    name: 'Input(ml)',
                    id: 'vs.intk.total',
                    validations: {
                        format: '0.00'
                    }
                },
                {
                    type: 'column',
                    name: 'Output(ml)',
                    id: 'vs.opt.total',
                    validations: {
                        format: '0.00'
                    }
                },
                {
                    type: 'column',
                    name: 'Balance(ml)',
                    id: 'vs.balance',
                    validations: {
                        format: '0.00'
                    }
                }
            ]
        }
    }
];

// License management config
const licenseConfig = [
    { name: "cometBase", type: "base", tag: "comet_base_license" },
    //{name: "CoMeT Presence", type:"extension", tag: "comet_teleicu_license"},
    { name: "CoMeT Connect", type: "device", tag: "cm_patient_device" },
    { name: "iCertain", type: "extension", tag: "comet_icertain_license" }
];

// Device type codes
const deviceTypeCodes = [
    { name: "Monitor", code: "13288007" , associate: "multiple"},
    { name: "Ventilator Equipment", code: "706172005" , associate: "single"},
    { name: "Infusion Pump", code: "430033006" , associate: "multiple"},
    { name: "Syringe Pump", code: "465254002" , associate: "multiple"},
    { name: "ABG machine (Blood gas/pH analyzer, device)", code: "52893008" , associate: "multiple"}
];

//APP time zone
const appTimeZone = "Asia/Calcutta";

//API scopes
const authorisationScopes = "HOS_READ HOS_WRITE DEP_READ DEP_WRITE BED_READ BED_WRITE CAM_READ CAM_WRITE PAT_READ PAT_WRITE NOTES_READ NOTES_WRITE USER_READ USER_WRITE TENANT_READ PAT_DETAIL_READ PAT_DETAIL_WRITE CLIENT_READ REPORT_READ MTG_READ MTG_WRITE ICERTAIN_USER_WRITE ICERTAIN_PAT_WRITE ICERTAIN_ACCESS FHIR_READ FHIR_WRITE openid";

//Session store configurations
const sessionConfig = {
    sessionSecret: "comet presence",
    redisConfig: {
        //host : "139.59.88.55",
        host: "localhost",
        port: 6379,
        pass: ""
    }
};

//Getter/Setters for all configurations
function getTenantConfig(tenantName) {
    return tenantsConfiguration.find(tenantConfig => tenantConfig.tenantName === tenantName);
}

function getServicesUrl() {
    return servicesUrl;
}

function getAuthorisationScopes() {
    return authorisationScopes;
}

function getSessionConfig() {
    return sessionConfig;
}

function getFlowsheetConfig() {
    return flowsheetConfiguration;
}

function getAppTimeZone() {
    return appTimeZone;
}

function getChartConfig() {
    return chartConfiguration;
}

function getLicenseConfig() {
    return JSON.parse(JSON.stringify(licenseConfig));
}

function getDeviceTypeCodes() {
    return deviceTypeCodes;
}

module.exports = {
    getServicesUrl: getServicesUrl,
    getTenantConfig: getTenantConfig,
    getAuthorisationScopes: getAuthorisationScopes,
    getSessionConfig: getSessionConfig,
    getAppTimeZone: getAppTimeZone,
    getFlowsheetConfig: getFlowsheetConfig,
    getChartConfig: getChartConfig,
    getLicenseConfig: getLicenseConfig,
    getDeviceTypeCodes: getDeviceTypeCodes
};