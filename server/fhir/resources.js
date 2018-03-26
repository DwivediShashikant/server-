var procedure = {
        "resourceType": "Procedure",
        "meta": {
            "tag": [
            {
            "system": "http://example.org/codes/tags",
            "code": "",
            "display": ""
            }
        ]
        },
        "subject": {
            "reference": "",
        },
        "performedDateTime": "",
        "status": "completed",
        "code": {
            "coding": [
            {
            "code": "",
            "display": ""
            }
            ]
        },
        "performer": [
            {
            "actor": {
                "reference": "",
                 "display": ""
             }
            }
        ],
        "encounter": {
            "reference": ""
        },
        "notes": [
            {
            "text": ""
            }
        ]
    };

var specialInstructionObservation = {
  "resourceType": "Observation",
  "meta": {
    "tag": [
      {
        "system": "http://example.org/codes/tags",
        "code": "cm_patient_spl_instr_obs",
        "display": "Special Instructions"
      }
    ]
  },
  "text": {
    "status": "generated",
    "div": ""
  },
  "status": "final",
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "55284-4",
        "display": "Blood pressure systolic & diastolic"
      }
    ]
  },
  "subject": {
    "reference": ""
  },
  "performer": [
    {
      "reference": "",
      "display": ""
    }
  ],
  "encounter": {
      "reference": ""
    },
  "bodySite": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "368209003",
        "display": "Right arm"
      }
    ]
  },
  "component": [

    {
      "code": {
        "coding": [
          {
            "fhir_comments": [
              "   SNOMED CT Codes   "
            ],
            "system": "http://snomed.info/sct",
            "code": "70822001",
            "display": "Ejection Fraction"
          }
        ]
      },
      "valueQuantity": {
        "value": "",
        "unit": "mm[Hg]"
      }
    },

    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "8462-4",
            "display": "Blood prassure"
          }
        ]
      },
      "valueQuantity": {
        "value": "",
        "unit": "mm[Hg]"
      }
    },

    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "8462-4",
            "display": "Blood prassure"
          }
        ]
      },
      "valueQuantity": {
        "value": "",
        "unit": "mm[Hg]"
      }
    },

    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "8462-4",
            "display": "Pudendal artery"
          }
        ]
      },
      "valueQuantity": {
        "value": "",
        "unit": "mm[Hg]"
      }
    }

  ]
};

var nursingCare = {
  "resourceType": "Observation",
  "id": "",  
  "meta": {
    "versionId": "",
    "tag": [
      {
        "system": "http://example.org/codes/tags",
        "code": "cm_patient_nsng_care",
        "display": "Nursing Care"
      },
      {
        "system": "http://example.org/codes/tags",
        "code": "cm_catheter_type",
        "display": "Catheter Type"
      }
    ]
  },
  "text": {
    "status": "generated",
    "div": "<div>Nursing Care</div>"
  },
  "status": "final",
  "category": {
    "coding": [
      {
        "system": "",
        "code": "",
        "display": ""
      },
      {
        "system": "",
        "code": "",
        "display": ""
      }
    ]
  },
  "code": {
    "coding": [
      {
        "system": "",
        "code": "",
        "display": ""
      },
      {
        "system": "",
        "code": "",
        "display": ""
      }
    ]
  },
  "subject": {
    "reference": ""
  },
  "encounter": {
            "reference": ""
        },
  "performer": [
    {
      "reference": ""
    }
  ],
  "effectiveDateTime": "",
  "component": [
          {
            "code": {
              "coding": [
                {
                  "system": "http://snomed.info/sct",
                  "code": "",
                  "display": "",
                  "id":"",
                }
              ]
            }
          }
        ],
  "bodySite": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "368209003",
        "display": ""
      }
    ]
  },
  "extension": [
    {
      "valuePeriod": {
        "start": "",
        "end": ""
      }
    },
    {
      "valueString": ""
    },
    {
      "valueDateTime": ""
    }
  ]
};
    
var organization = {
  "resourceType": "Organization",
  "identifier" : [{"value" : "" }],
  "text": {
    "status": "generated",
    "div": ""
  },
  "active": true,
  "type": {
    "coding": [
      {
        "system": "http://hl7.org/fhir/organization-type",
        "code": "Hospital",
        "display": ""
      }
    ]
  },
  "name": "",
  "telecom": [
    {
      "system": "phone",
      "value": ""
    },
    {
      "system": "email",
      "value": ""
    }
  ],
  "address": [
    {
      "line": [],
      "city" : "",
      "postalCode" : "",
      "state" : ""
    }
  ],
  "partOf": {
    "reference": ""
  }
};

var patient = {
    "resourceType": "Patient",
    "identifier": [
      {
        "type": {
          "coding": [
            {
              "id": "P_MRN",
              "code": "MRN",
              "display": "MRN"
            }
          ]
        },
        "value": ""
      },
      {
        "type": {
          "coding": [
            {
              "id": "P_PID",
              "code": "PID",
              "display": "PID"
            }
          ]
        },
        "value": ""
      },
      {
        "type": {
          "coding": [
            {
              "id": "P_IPN",
              "code": "IPN",
              "display": "IPN"
            }
          ]
        },
        "value": ""
      }
    ],
    "active": true,
    "name": [
      {
        "use": "usual",
        "given": [
          ""
        ],
        "family":[
          ""
        ]
      }
    ],
    "telecom": [
      {
        "system": "phone",
        "value": "",
        "use": "mobile"
      },
      {
        "system": "email",
        "value": "",
        "use": "home"
      }
    ],
    "gender": "",
    "birthDate": "",
    "address": [
      {
        "use": "home",
        "line": [],
        "city" : "",
        "postalCode" : "",
        "state" : ""
      }
    ],
    "maritalStatus": {
      "coding": [
        {
          "system": "http://hl7.org/fhir/v3/MaritalStatus",
          "code": "",
          "display": ""
        }
      ]
    },
    "managingOrganization": {
      "reference": ""
    }
  };

 var episodeOfCare = {
    "resourceType": "EpisodeOfCare",
    "text": {
      "div": "<div>Patient episode of care</div>"
    },
    "status": "active",
    "patient": {
      "reference": ""
    },
    "managingOrganization": {
      "reference": ""
    }
  }; 

 var encounter = {
    "resourceType": "Encounter",
    "text": {
      "status": "generated",
      "div": "<div>Encounter for Admitting Patient</div>"
    },
    "identifier": [
       {
        "type": {
          "coding": [
            {
              "id": "P_IPN",
              "code": "IPN",
              "display": "IPN"
            }
          ]
        },
        "value": ""
      }
    ],
    "status": "",
    "period":{},
    "class": "inpatient",
    "type": [
      {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "11429006",
            "display": "Admission"
          }
        ]
      }
    ],
    "priority": {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "17621005",
          "display": "Emergency"
        }
      ]
    },
    "patient": {
      "reference": ""
    },
    "appointment": {
      "reference": ""
    },
    "episodeOfCare": [{
      "reference": ""
    }],
    "location": [
        {
            "location": {
                "reference": ""
            }
        }
    ],
    "serviceProvider": {
      "reference": ""
    }
  };

  var bundle = {
    "resourceType": "Bundle",
    "type": "",
    "entry": []
  }; 

var observation = {
    "resourceType": "Observation",
    "meta": {
      "tag": [
        {
          "system": "http://example.org/codes/tags",
          "code": "",
          "display": ""
        }
      ]
    },
    "text": {
      "status": "generated",
      "div": ""
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
          "display":""
        }
      ]
    },
    "subject": {
      "reference": ""
    },
    "encounter": {
      "reference": ""
    },
    "performer": [
      {
    "reference": "",
    "display": ""
      }
    ],
    "effectiveDateTime": "",
    "component": []
};

var specialInstructionNotesobservation = {
    "resourceType": "Observation",
    "meta": {
      "tag": [
        {
          "system": "http://example.org/codes/tags",
          "code": "",
          "display": ""
        }
      ]
    },
    "text": {
      "status": "generated",
      "div": ""
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
          "display":""
        }
      ]
    },
    "subject": {
      "reference": ""
    },
    "encounter": {
      "reference": ""
    },
    "performer": [
      {
    "reference": "",
    "display": ""
      }
    ],
    "effectiveDateTime": "",
    "component": []
};




  var condition = {
  "resourceType": "Condition",
  "meta": {
          "tag": [
            {
              "system": "http://example.org/codes/tags",
              "code": "",
              "display": ""
            }
          ]
        },
        "text": {
          "status": "generated",
          "div": ""
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
              "display": ""
            }
          ]
        },
  "patient": {
    "reference": ""
  },
  "encounter": {
    "reference": ""
  },
  "asserter": {
    "reference": "",
    "display": ""
  },
  "onsetDateTime": "",
  "verificationStatus": "confirmed"
};


   var component = {
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
         

  var practitioner = {
        "resourceType": "Practitioner",
        "identifier": [
          {
            "type": {
              "coding": [
                {
                  "id": "P_PID",
                  "code": "PID",
                  "display": "PID"
                }
              ]
            },
            "value": ""
          }
        ],
        "name": {
          "use": "official",
          "given": [""]
        },
        "telecom": [
          {
            "system": "phone",
            "value": "",
            "use": "work"
          },
          {
            "system": "email",
            "value": "",
            "use": "work"
          }
        ],
        "practitionerRole": [
          {
            "managingOrganization": {
              "reference": ""
            },
            "role": {
              "coding": [
                {
                  "code": "",
                  "display": ""
                }
              ]
            }
          }
        ],
        "qualification": [
          {
            "code": {
              "text": ""
            }
          }
        ]
      };

var location = {
  "resourceType": "Location",
  "identifier": [
    {
      "value": ""
    }
  ],
  "status": "active",
  "name": "",
  "physicalType": {
    "coding": [
      {
        "system": "http://hl7.org/fhir/location-physical-type",
        "code": "bed",
        "display": "Bed"
      }
    ]
  },
  "managingOrganization": {
    "reference": ""
  }
};

var device = {
        "resourceType": "Device",
        "id": "",
        "meta": {
          "tag": [
            {
              "system": "http://example.org/codes/tags",
              "code": "cm_patient_device",
              "display": "Device"
            },
            {
              "system": "http://example.org/codes/tags",
              "code": "",
              "display": ""
            }
          ]
        },
        "identifier": [
          {
            "value": ""
          }
        ],
        "type": {
          "coding": [
            {
              "code": "",
              "display": ""
            }
          ]
        },
        "manufacturer": "",
        "model": "",
        "version": "",
        "owner": {
          "reference": ""
        }
};

var transaction = {
    "resource" : {},
    "request" : {
                 "method" : "",
                 "url" : "Observation"
                }
  }

  var clinicalDocObservationHistory = {
    "resourceType": "Observation",
    "id": "",
    "meta": {
    "tag": [
      {
        "system": "http://example.org/codes/tags",
        "code": "cm_patient_clinical_doc",
        "display": "History"
      },
      {
        "system": "http://example.org/codes/tags",
        "code": "vs.hy",
        "display": "History"
      }
    ]
  },
  "text": {
    "status": "generated",
    "div": "<div>History</div>"
  },
  "status": "final",
  "category": {
    "coding": [
      {
        "code": "cm_patient_clinical_doc"
      }
    ]
  },
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "cm_patient_clinical_doc",
        "display": "History"
      }
    ]
  },
  "subject": {
    "reference": ""
  },
  "performer": [
      {
        "reference": "",
        "display": ""
      }
    ],
   "encounter": {
    "reference": ""
  },
  "effectiveDateTime": "",
  "component": [
    {
      "code": {
        "coding": [
          {
            "id": "vs.hy.pc",
            "system": "http://snomed.info/sct",
            "code": "33962009",
            "display": "Presenting Complaint"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.hy.hpc",
            "code": "392521001",
            "display": "History of Presenting Complaint"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.hy.pmh",
            "code": "417662000",
            "display": "Past Medical History"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.hy.fh",
            "code": "57177007",
            "display": "Family History"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.hy.sah",
            "code": "77176002",
            "display": "Smoking/ Alcohol History"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.hy.oh",
            "code": "394704008",
            "display": "Occupational History"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.hy.sh",
            "code": "160476009",
            "display": "Social History"
          }
        ]
      },
      "valueString": ""
    }
  ]
};
var clinicalDocObservationPhysicalExam = {
  "resourceType": "Observation",
  "id": "",
  "meta": {
    "tag": [
      {
        "system": "http://example.org/codes/tags",
        "code": "cm_patient_clinical_doc",
        "display": "Physical Exam"
      },
      {
        "system": "http://example.org/codes/tags",
        "code": "vs.pe",
        "display": "Physical Exam"
      }
    ]
  },
  "text": {
    "status": "generated",
    "div": "<div>Physical Exam</div>"
  },
  "status": "final",
  "category": {
    "coding": [
      {
        "code": "cm_patient_clinical_doc"
      }
    ]
  },
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "cm_patient_clinical_doc",
        "display": "Physical Exam"
      }
    ]
  },
  "subject": {
    "reference": ""
  },
  "performer": [
    {
      "reference": "",
      "display": ""
    }
  ],
  "encounter": {
    "reference": ""
  },
  "effectiveDateTime": "",
  "component": [
    {
      "code": {
        "coding": [
          {
            "id": "vs.pe.ge",
            "code": "271907004",
            "display": "General Examination"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.heent",
            "code": "162823000",
            "display": "Head Eye ENT"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.pls",
            "code": "309654005",
            "display": " Pulse(per minute)"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.bp",
            "code": "75367002",
            "display": "Blood pressure(mm Hg)"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.temp",
            "code": "703421000",
            "display": "Temperature(C)"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.ht",
            "code": "162755006",
            "display": "Height(cm)"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.wt",
            "code": "27113001",
            "display": "Weight(kg)"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.jvp",
            "code": "274283008",
            "display": "jugular venous pressure(cm h20)"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.cvs",
            "code": "271910006",
            "display": "Cardio Vascular System"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.rs",
            "code": "271908009",
            "display": "Respiratory System"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.cns",
            "code": "309647004",
            "display": "Central Nervous System"
          }
        ]
      },
      "valueString": ""
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "id": "vs.pe.othrsys",
            "display": "Other Systems"
          }
        ]
      },
      "valueString": ""
    }
  ]
};

var progress_notes = [
  {
  'resourceType': 'observation',
  'tagCode': 'cm_patient_scores',
  'tagName': 'Scores'
  },
  {
  'resourceType': 'observation',
  'tagCode': 'cm_patient_cvc_site',
  'tagName': 'CVC Site'
  },
  {
  'resourceType': 'observation',
  'tagCode': 'cm_patient_cvs',
  'tagName': 'Cardiovascular System'
  },
  {
  'resourceType': 'observation',
  'tagCode': 'cm_patient_rs',
  'tagName': 'Respiratory System'
  },
  {
  'resourceType': 'observation',
  'tagCode': 'cm_patient_cns',
  'tagName': 'Central Nervous System'
  },
  {
  'resourceType': 'observation',
  'tagCode': 'cm_patient_hid',
  'tagName': 'Haematology / Infections Disease'
  },
  {
  'resourceType': 'observation',
  'tagCode': 'cm_patient_fen',
  'tagName': 'Fluid, Electrolytes, Nutrition'
  },
  {
  'resourceType': 'observation',
  'tagCode': 'cm_patient_othr',
  'tagName': 'Others'
  },
  {
  'resourceType': 'observation',
  'tagCode': 'cm_patient_pft',
  'tagName': 'Plan for Today'
  },
  {
  'resourceType': 'condition',
  'tagCode': 'cm_patient_curr_pblms',
  'tagName': 'Current Problems'
  }
]

var orders = [
  {
    'resourceType' : 'MedicationOrder',
    'tagName' : 'Medication'
  },
  {
    'resourceType' : 'DiagnosticOrder',
    'tagName' : 'Radiology'
  },
  {
    'resourceType' : 'DiagnosticOrder',
    'tagName' : 'Laboratory'
  }
]

var carePlan = {
  "resourceType" : "CarePlan",
  "subject": {
              "reference": ""
  },
  "status": "proposed",
  "period": {
            "start": "",
            "end": ""
  },
  "author": [
              {
                "reference": "",
                "display": ""
              }
  ],
  "identifier": [
                    {
                      "type": {
                          "coding": [
                              {
                                "id": "test",
                                "code": "test",
                                "display": "test"
                              }
                          ]
                      },
                      "value": "1000"
                    }
  ],         
  "description": "" 
}

var medicationOrder = {
  "resourceType" : "MedicationOrder",
  "text": {    
    "status": "generated",
    "div": "<div>meds</div>" 
  },
  "medicationReference": {
    "reference": ""
  },
  "dateWritten": "",
  "status": "active",
  "patient": {
    "reference": "",
  },
  "prescriber": {
    "reference": "",
    "display": ""  
  },
  "encounter": {    
    "reference": "" 
  },
  "dosageInstruction": [
    {
      "text": ""
    }
  ],
}

var diagnosticOrder = {
  "resourceType" : "DiagnosticOrder",
  "text": {
    "status": "generated",
    "div": "<div>diagnostic order</div>"
  },
  "subject": {
    "reference": ""
  },
  "encounter": {
    "reference": ""
  },
  "orderer": {
    "reference": "",
    "display": ""
  },
  "reason": [
    {
      "text": "Order Reason"
    }
  ],
  "item": [
    {
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": ""
          }
        ]
      }
    }
  ],
  "status": "requested",
  "event": [
    {
      "status": "requested",
      "dateTime": ""
    }
  ],
  "note": [
    {
      "text": ""
    }
  ]
}

var composition = {
  "resourceType": "Composition",
  "id": "",
  "meta": {
    "tag": [
      {
        "system": "http://example.org/codes/tags",
        "code": "cm_patient_dis_smry",
        "display": "Discharge Summary"
      }
    ]
  },
  "text": {
    "status": "generated",
    "div": "<div> Discharge Summary </div>"
  },
  "date": "",
  "type": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "373942005",
        "display": "Discharge Summary"
      }
    ],
    "text": "Discharge Summary"
  },
  "title": "Discharge Summary",
  "status": "",
  "confidentiality": "N",
  "custodian": {
    "reference": ""
  },
  "subject": {
    "reference": ""
  },
  "author": [
    {
      "reference": ""
    }
  ],
  "attester": [
    {
      "mode": [
        "official"
      ],
      "party": {
        "reference": ""
      }
    }
  ],
  "encounter": {
    "reference": ""
  },
  "section": [
    {
      "title": "Problem List",
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "260905004",
            "display": "Condition"
          }
        ]
      },
      "text": {
        "div": ""
      }
    },
    {
      "title": "Pertinent investigations",
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "386053000",
            "display": "Investigations"
          }
        ]
      },
      "text": {
        "div": ""
      }
    },
    {
      "title": "Diagnosis/ Diagnoses",
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "89100005",
            "display": "Diagnosis"
          }
        ]
      },
      "text": {
        "div": ""
      }
    },
    {
      "title": "Procedures Performed",
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "71388002",
            "display": "Procedure"
          }
        ]
      },
      "text": {
        "div": ""
      }
    },
    {
      "title": "Discharge instructions",
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "308273005",
            "display": "Follow-up"
          }
        ]
      },
      "text": {
        "div": ""
      }
    }
  ]
}

  var appointment = {
    "resourceType": "Appointment",
    "status": "booked",
    "start": "",
    "participant": [
      {
        "actor": {
          "reference": "",
        },
        "status": "accepted"
      }
    ]
  }

  var notes = {
    "resourceType": "Communication",
    "sender": {
        "reference": "",
        "display" : ""
    },
    "payload": [
      {
      "contentString": ""
      }
    ],
    "status": "completed",
    "sent": "",
    "subject": {
      "reference": ""
    },
    "encounter": {
      "reference": ""
    }
  }

var unknown_medication = {
  "code": {
    "coding": [
      {
        "code": "Medication Test"
      }
    ]
  },
  "manufacturer": {
    "reference": ""
  },
  "resourceType": "Medication",
  "text": {
    "div": "<div>Medication</div>",
    "status": "generated"
  }
}

var unknown_patient = {
  "resourceType": "Patient",
  "identifier": [
    {
      "value": "unknown"
    }
  ],
  "active": true,
  "name": [
    {
      "given": [
        "Unknown"
      ]
    }
  ],
  "managingOrganization": {
    "reference": ""
  }
}

var unknown_device = {
  "resourceType": "Device",
  "identifier": [
    {
      "value": "unknown"
    }
  ],
  "meta": {
    "tag": [
      {
        "system": "http://example.org/codes/tags",
        "code": "cm_patient_device",
        "display": "Device"
      }
    ]
  },
  "type": {
    "coding": [
      {
        "system": "http://acme.com/devices",
        "code": "unknown_device",
        "display": "unknown device"
      }
    ]
  },
  "manufacturer": "unknown",
  "version": "10.23-23423",
  "model": "unknown",
  "owner": {
          "reference": ""
        }
}

var relatedPerson = {
  "address": [
    {
      "use": "home",
      "line": [""],
      "city": "",
      "state": "",
      "postalCode": ""
    }
  ],
  "name": {
    "family": [
      ""
    ],
    "given": [
      ""
    ],
    "use": "usual"
  },
  "patient": {
    "reference": "Patient/5df06c54-969d-4fce-9f37-2c517cb8dc7a"
  },
  "relationship": {
    "coding": [
      {
        "code": ""
      }
    ]
  },
  "resourceType": "RelatedPerson",
  "telecom": [
    {
      "system": "phone",
      "value": "",
      "use": "mobile"
    }
  ]
}

module.exports = {
    procedure : procedure,
    specialInstructionObservation : specialInstructionObservation,
    nursingCare : nursingCare,
    organization : organization,
    patient : patient,
    episodeOfCare : episodeOfCare,
    encounter : encounter,
    bundle : bundle,
    observation : observation,
    condition :condition,
    component : component,
    practitioner : practitioner,
    location : location,
    device: device,
    transaction : transaction,
    clinicalDocObservationHistory : clinicalDocObservationHistory,
    clinicalDocObservationPhysicalExam: clinicalDocObservationPhysicalExam,
    progress_notes : progress_notes,
    orders : orders,
    carePlan : carePlan,
    medicationOrder : medicationOrder,
    diagnosticOrder : diagnosticOrder,
    composition : composition,
    appointment : appointment,
    specialInstructionNotesobservation : specialInstructionNotesobservation,
    notes : notes,
    unknown_medication : unknown_medication,
    unknown_patient : unknown_patient,
    unknown_device : unknown_device,
    relatedPerson : relatedPerson
};