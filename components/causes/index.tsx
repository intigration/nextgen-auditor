[
  {
    "description": "Blowdown valve logic is expected to be directly triggered by high-pressure alarm, but implementation includes a permissive condition.",
    "parameters": {
      "designCauseTag": "DS_HS2001",
      "designCauseDescription": "High Pressure Alarm",
      "implementedCauseTags": ["HS2001_ALM", "BLDWN_PERMISSIVE"],
      "implementedCauseDescriptions": ["High Pressure Alarm", "Blowdown System Permissive Active"],
      "effectTag": "MOS21",
      "effectDescription": "Blowdown Valve Opens",
      "discrpancyType": "AdditionalConditionsRequired",
      "notes": "Permissive added for maintenance mode not captured in design."
    }
  },
  {
    "description": "Implementation splits logic for fuel gas trip into multiple sub-tags for voting, while design assumes a single condition.",
    "parameters": {
      "designCauseTag": "DS_FG0001",
      "designCauseDescription": "Low Fuel Gas Pressure",
      "implementedCauseTags": ["FG_PRES_LOW_A", "FG_PRES_LOW_B", "FG_VOTE_OK"],
      "implementedCauseDescriptions": ["Low Pressure Sensor A", "Low Pressure Sensor B", "Voting Status Confirmed"],
      "effectTag": "MOS15",
      "effectDescription": "Fuel Gas Trip Logic Activated",
      "discrpancyType": "MoreComplexLogic",
      "notes": "Voting logic introduced in PLC for fault tolerance."
    }
  },
  {
    "description": "Temperature interlock logic implemented with override switch not documented in design.",
    "parameters": {
      "designCauseTag": "DS_TT0450",
      "designCauseDescription": "High Temperature Interlock",
      "implementedCauseTags": ["TT0450_HIGH", "OVERRIDE_SW01"],
      "implementedCauseDescriptions": ["Temperature High Alarm", "Manual Override Switch Active"],
      "effectTag": "MOS31",
      "effectDescription": "Trip Bypassed Due to Manual Override",
      "discrpancyType": "UndocumentedBypassLogic",
      "notes": "Bypass used during commissioning but never removed or documented."
    }
  },
  {
    "description": "Manual trip button is absent in runtime logic; critical safety trip cannot be triggered manually.",
    "parameters": {
      "designCauseTag": "DS_HS3002",
      "designCauseDescription": "Manual Emergency Shutdown",
      "implementedCauseTags": [],
      "implementedCauseDescriptions": [],
      "effectTag": "MOS30",
      "effectDescription": "Plant ESD Not Triggered",
      "discrpancyType": "DirectTriggerMissing",
      "notes": "Possibly unmapped tag or logic omitted during version upgrade."
    }
  },
  {
    "description": "Design logic specifies that cooling fan stops on low load; implementation delays action until load drops for 5 minutes.",
    "parameters": {
      "designCauseTag": "DS_LOAD_LOW",
      "designCauseDescription": "Load Below 10%",
      "implementedCauseTags": ["LOAD_PCT", "TIMER_5MIN"],
      "implementedCauseDescriptions": ["Load % Value", "5-minute Delay Timer"],
      "effectTag": "MOS17",
      "effectDescription": "Cooling Fan Stops",
      "discrpancyType": "TriggerMediation",
      "notes": "Timer logic added to prevent frequent start/stop events, not documented in design."
    }
  },
  {
    "description": "Design specifies interlock on motor overcurrent alone; implementation adds MCC status check.",
    "parameters": {
      "designCauseTag": "DS_MC0005",
      "designCauseDescription": "Motor Overcurrent Trip",
      "implementedCauseTags": ["MC0005_OC", "MCC_RUNNING"],
      "implementedCauseDescriptions": ["Overcurrent Detected", "MCC in Running State"],
      "effectTag": "MOS42",
      "effectDescription": "Motor Shutdown",
      "discrpancyType": "AdditionalConditionsRequired",
      "notes": "Interlock made conditional to MCC state to avoid nuisance trips on stop/start."
    }
  },
  {
    "description": "Discrepancy found where implementation reverses logic polarity from design.",
    "parameters": {
      "designCauseTag": "DS_ALM1005",
      "designCauseDescription": "Low Lube Oil Pressure Alarm",
      "implementedCauseTags": ["LUB_PRESS_LOW"],
      "implementedCauseDescriptions": ["Alarm Active on High Pressure"],
      "effectTag": "MOS88",
      "effectDescription": "Trip Logic on Lube Oil Fault",
      "discrpancyType": "LogicPolarityMismatch",
      "notes": "Incorrect PLC logic where 1=Normal, 0=Alarm instead of the other way around."
    }
  },
  {
    "description": "Multiple tags found in implementation triggering same trip, but only one documented in design.",
    "parameters": {
      "designCauseTag": "DS_VLV0012",
      "designCauseDescription": "Valve Position Error",
      "implementedCauseTags": ["VLV0012_POS_ERR", "VLV0012_ACT_FAIL"],
      "implementedCauseDescriptions": ["Valve Position Alarm", "Actuator Failure Detected"],
      "effectTag": "MOS10",
      "effectDescription": "Valve Failure Shutdown",
      "discrpancyType": "AdditionalConditionsRequired",
      "notes": "Multiple failure modes introduced in updated HMI logic."
    }
  },
  {
    "description": "Startup interlock design uses one path; implementation has OR condition across multiple tags.",
    "parameters": {
      "designCauseTag": "DS_READY",
      "designCauseDescription": "System Ready Signal",
      "implementedCauseTags": ["PUMP_READY", "VALVE_READY", "PRESSURE_OK"],
      "implementedCauseDescriptions": ["Pump Ready", "Valve Ready", "Startup Pressure Confirmed"],
      "effectTag": "MOS00",
      "effectDescription": "Startup Permissive",
      "discrpancyType": "MoreComplexLogic",
      "notes": "Combined logic improves safety but deviates from single-tag design."
    }
  }
]
