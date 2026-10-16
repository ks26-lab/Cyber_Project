/**
 * Comprehensive Indian National Power Grid Hierarchical Dataset
 * Researched from Central Electricity Authority (CEA), POWERGRID (PGCIL), and Grid-India (POSOCO).
 * Includes Full Energy Firms (CPSUs, Private Conglomerates, State TRANSCOs) & Transmission Tracing.
 */

const INDIA_GRID_DATA = {
  "nationalMetrics": {
    "gridFrequencyHz": 50.002,
    "nationalDemandMW": 242850,
    "totalGenerationMW": 245400,
    "interRegionalCapacityMW": 118250,
    "activeInterRegionalTransferMW": 31450,
    "gridStandard": "IEGC 50.00 Hz (CERC / Grid-India)",
    "activeAlertsCount": 1,
    "hvdcLinksCount": 10,
    "ac765LinksCount": 22,
    "totalMonitoredTransformers": 240
  },
  "states": [
    {
      "id": "ST-DL",
      "name": "DELHI NCR",
      "state": "Delhi NCR",
      "region": "NR",
      "pincodes": [
        "110001",
        "201306",
        "201301",
        "110034"
      ],
      "lat": 28.6139,
      "lon": 77.209,
      "districts": [
        "Central Delhi",
        "East Delhi",
        "South West Delhi",
        "Gautam Buddha Nagar (NCR)"
      ]
    },
    {
      "id": "ST-UP",
      "name": "UTTAR PRADESH",
      "state": "Uttar Pradesh",
      "region": "NR",
      "pincodes": [
        "282001",
        "231222",
        "231223",
        "208001",
        "250001",
        "203389",
        "221001",
        "226001"
      ],
      "lat": 26.8467,
      "lon": 80.9462,
      "districts": [
        "Agra",
        "Sonbhadra",
        "Kanpur",
        "Meerut",
        "Bulandshahr (Narora)",
        "Varanasi",
        "Lucknow"
      ]
    },
    {
      "id": "ST-HR",
      "name": "HARYANA",
      "state": "Haryana",
      "region": "NR",
      "pincodes": [
        "136118",
        "132103",
        "122001",
        "125001"
      ],
      "lat": 29.0588,
      "lon": 76.0856,
      "districts": [
        "Kurukshetra",
        "Panipat",
        "Gurugram",
        "Hisar",
        "Fatehabad"
      ]
    },
    {
      "id": "ST-PB",
      "name": "PUNJAB",
      "state": "Punjab",
      "region": "NR",
      "pincodes": [
        "140124",
        "147001",
        "141001",
        "143001"
      ],
      "lat": 31,
      "lon": 75.3412,
      "districts": [
        "Rupnagar (Nangal)",
        "Patiala",
        "Ludhiana",
        "Amritsar"
      ]
    },
    {
      "id": "ST-HP",
      "name": "HIMACHAL PRADESH",
      "state": "Himachal Pradesh",
      "region": "NR",
      "pincodes": [
        "174001",
        "172102",
        "171001",
        "175001"
      ],
      "lat": 31.85,
      "lon": 77.17,
      "districts": [
        "Bilaspur",
        "Kinnaur (Nathpa Jhakri)",
        "Shimla",
        "Kullu",
        "Mandi"
      ]
    },
    {
      "id": "ST-RJ",
      "name": "RAJASTHAN",
      "state": "Rajasthan",
      "region": "NR",
      "pincodes": [
        "342301",
        "323307",
        "345001",
        "334001",
        "302001",
        "324001"
      ],
      "lat": 26.5,
      "lon": 73.5,
      "districts": [
        "Phalodi (Bhadla)",
        "Chittorgarh (Rawatbhata)",
        "Jaisalmer (Fatehgarh)",
        "Bikaner",
        "Jaipur"
      ]
    },
    {
      "id": "ST-JK",
      "name": "JAMMU & KASHMIR",
      "state": "Jammu & Kashmir",
      "region": "NR",
      "pincodes": [
        "182313",
        "182206",
        "190001",
        "180001"
      ],
      "lat": 33.2778,
      "lon": 75.3412,
      "districts": [
        "Reasi (Salal)",
        "Kishtwar (Dulhasti)",
        "Srinagar",
        "Jammu"
      ]
    },
    {
      "id": "ST-LK",
      "name": "LADAKH",
      "state": "Ladakh",
      "region": "NR",
      "pincodes": [
        "194101",
        "194103"
      ],
      "lat": 34.1526,
      "lon": 77.5771,
      "districts": [
        "Leh",
        "Kargil"
      ]
    },
    {
      "id": "ST-UK",
      "name": "UTTARAKHAND",
      "state": "Uttarakhand",
      "region": "NR",
      "pincodes": [
        "249001",
        "248001",
        "249401"
      ],
      "lat": 30.0668,
      "lon": 79.0193,
      "districts": [
        "Tehri Garhwal",
        "Dehradun",
        "Haridwar"
      ]
    },
    {
      "id": "ST-MH",
      "name": "MAHARASHTRA",
      "state": "Maharashtra",
      "region": "WR",
      "pincodes": [
        "401504",
        "415207",
        "442401",
        "442001",
        "413001",
        "440001",
        "400001",
        "442902"
      ],
      "lat": 19.5,
      "lon": 75.5,
      "districts": [
        "Palghar (Tarapur)",
        "Satara (Koyna)",
        "Chandrapur",
        "Wardha",
        "Solapur",
        "Nagpur",
        "Thane / Mumbai"
      ]
    },
    {
      "id": "ST-GJ",
      "name": "GUJARAT",
      "state": "Gujarat",
      "region": "WR",
      "pincodes": [
        "370421",
        "370140",
        "394651",
        "393151",
        "390001",
        "380001"
      ],
      "lat": 22.8,
      "lon": 71.5,
      "districts": [
        "Kutch (Mundra & Khavda)",
        "Tapi (Kakrapar)",
        "Narmada (Sardar Sarovar)",
        "Vadodara",
        "Ahmedabad"
      ]
    },
    {
      "id": "ST-MP",
      "name": "MADHYA PRADESH",
      "state": "Madhya Pradesh",
      "region": "WR",
      "pincodes": [
        "486885",
        "486886",
        "486553",
        "482001",
        "462001",
        "452001"
      ],
      "lat": 23.5,
      "lon": 78,
      "districts": [
        "Singrauli (Vindhyachal & Sasan)",
        "Rewa",
        "Jabalpur",
        "Bhopal",
        "Indore"
      ]
    },
    {
      "id": "ST-CG",
      "name": "CHHATTISGARH",
      "state": "Chhattisgarh",
      "region": "WR",
      "pincodes": [
        "496001",
        "495671",
        "495677",
        "492001",
        "495001"
      ],
      "lat": 21.2787,
      "lon": 81.8661,
      "districts": [
        "Raigarh",
        "Janjgir-Champa",
        "Korba",
        "Raipur",
        "Bilaspur"
      ]
    },
    {
      "id": "ST-GA",
      "name": "GOA",
      "state": "Goa",
      "region": "WR",
      "pincodes": [
        "403001",
        "403601"
      ],
      "lat": 15.2993,
      "lon": 74.124,
      "districts": [
        "North Goa",
        "South Goa"
      ]
    },
    {
      "id": "ST-TN",
      "name": "TAMIL NADU",
      "state": "Tamil Nadu",
      "region": "SR",
      "pincodes": [
        "639113",
        "627106",
        "603102",
        "607807",
        "629704",
        "600001",
        "602105"
      ],
      "lat": 11,
      "lon": 78.5,
      "districts": [
        "Karur (Pugalur)",
        "Tirunelveli (Kudankulam)",
        "Chengalpattu (Kalpakkam)",
        "Cuddalore (Neyveli)",
        "Kanyakumari (Muppandal)",
        "Chennai",
        "Sriperumbudur"
      ]
    },
    {
      "id": "ST-KA",
      "name": "KARNATAKA",
      "state": "Karnataka",
      "region": "SR",
      "pincodes": [
        "572136",
        "581400",
        "563101",
        "577435",
        "560001",
        "560048"
      ],
      "lat": 14.5,
      "lon": 75.8,
      "districts": [
        "Tumkur (Pavagada)",
        "Uttara Kannada (Kaiga)",
        "Kolar",
        "Shivamogga (Sharavathi)",
        "Bengaluru Urban"
      ]
    },
    {
      "id": "ST-TS",
      "name": "TELANGANA",
      "state": "Telangana",
      "region": "SR",
      "pincodes": [
        "505208",
        "509326",
        "500001",
        "500097"
      ],
      "lat": 17.8,
      "lon": 79,
      "districts": [
        "Peddapalli (Ramagundam)",
        "Nagarkurnool (Srisailam)",
        "Hyderabad / Malkaram",
        "Warangal"
      ]
    },
    {
      "id": "ST-AP",
      "name": "ANDHRA PRADESH",
      "state": "Andhra Pradesh",
      "region": "SR",
      "pincodes": [
        "530044",
        "518001",
        "524001",
        "520001"
      ],
      "lat": 15.5,
      "lon": 79.8,
      "districts": [
        "Visakhapatnam (Gazuwaka & Simhadri)",
        "Kurnool (Ultra Solar)",
        "SPSR Nellore",
        "Krishna"
      ]
    },
    {
      "id": "ST-KL",
      "name": "KERALA",
      "state": "Kerala",
      "region": "SR",
      "pincodes": [
        "680008",
        "682001",
        "685602",
        "695001"
      ],
      "lat": 10.2,
      "lon": 76.5,
      "districts": [
        "Thrissur (Madakkathara)",
        "Ernakulam (Kochi)",
        "Idukki",
        "Thiruvananthapuram"
      ]
    },
    {
      "id": "ST-OR",
      "name": "ODISHA",
      "state": "Odisha",
      "region": "ER",
      "pincodes": [
        "759147",
        "770001",
        "751001",
        "753001"
      ],
      "lat": 20.5,
      "lon": 84.5,
      "districts": [
        "Angul (Talcher)",
        "Sundargarh",
        "Khordha (Bhubaneswar)",
        "Cuttack"
      ]
    },
    {
      "id": "ST-WB",
      "name": "WEST BENGAL",
      "state": "West Bengal",
      "region": "ER",
      "pincodes": [
        "742212",
        "713201",
        "736121",
        "734001",
        "700001"
      ],
      "lat": 23.5,
      "lon": 87.8,
      "districts": [
        "Murshidabad (Farakka)",
        "Paschim Bardhaman (Durgapur)",
        "Alipurduar",
        "Darjeeling (Siliguri)",
        "Kolkata"
      ]
    },
    {
      "id": "ST-JH",
      "name": "JHARKHAND",
      "state": "Jharkhand",
      "region": "ER",
      "pincodes": [
        "834001",
        "826001",
        "827001",
        "831001"
      ],
      "lat": 23.6102,
      "lon": 85.2799,
      "districts": [
        "Ranchi",
        "Dhanbad",
        "Bokaro",
        "East Singhbhum"
      ]
    },
    {
      "id": "ST-BR",
      "name": "BIHAR",
      "state": "Bihar",
      "region": "ER",
      "pincodes": [
        "821115",
        "803213",
        "823001",
        "800001"
      ],
      "lat": 25.0961,
      "lon": 85.3131,
      "districts": [
        "Rohtas (Sasaram)",
        "Patna (Barh)",
        "Gaya",
        "Bhagalpur"
      ]
    },
    {
      "id": "ST-SK",
      "name": "SIKKIM",
      "state": "Sikkim",
      "region": "ER",
      "pincodes": [
        "737134",
        "737101"
      ],
      "lat": 27.533,
      "lon": 88.5122,
      "districts": [
        "East Sikkim (Gangtok)",
        "North Sikkim (Teesta)"
      ]
    },
    {
      "id": "ST-AS",
      "name": "ASSAM",
      "state": "Assam",
      "region": "NER",
      "pincodes": [
        "784176",
        "781001",
        "783380",
        "787057"
      ],
      "lat": 26.2006,
      "lon": 92.9376,
      "districts": [
        "Biswanath (Chariali)",
        "Kamrup Metropolitan (Guwahati)",
        "Chirang (Bongaigaon)",
        "Dhemaji"
      ]
    },
    {
      "id": "ST-AR",
      "name": "ARUNACHAL PRADESH",
      "state": "Arunachal Pradesh",
      "region": "NER",
      "pincodes": [
        "787059",
        "791111",
        "790001"
      ],
      "lat": 28,
      "lon": 94.5,
      "districts": [
        "Lower Subansiri (Gerukamukh)",
        "Papum Pare",
        "West Kameng"
      ]
    },
    {
      "id": "ST-MN",
      "name": "MANIPUR",
      "state": "Manipur",
      "region": "NER",
      "pincodes": [
        "795126",
        "795001"
      ],
      "lat": 24.6637,
      "lon": 93.9063,
      "districts": [
        "Bishnupur (Loktak)",
        "Imphal"
      ]
    },
    {
      "id": "ST-ML",
      "name": "MEGHALAYA",
      "state": "Meghalaya",
      "region": "NER",
      "pincodes": [
        "793001",
        "793102"
      ],
      "lat": 25.467,
      "lon": 91.3662,
      "districts": [
        "East Khasi Hills (Shillong)",
        "Ri-Bhoi"
      ]
    },
    {
      "id": "ST-TR",
      "name": "TRIPURA",
      "state": "Tripura",
      "region": "NER",
      "pincodes": [
        "799001",
        "799114"
      ],
      "lat": 23.9408,
      "lon": 91.9882,
      "districts": [
        "West Tripura (Agartala)",
        "Gomati"
      ]
    }
  ],
  "nodes": [
    {
      "id": "NR-DELHI",
      "name": "Delhi Dadri / NCR Super Hub",
      "city": "Dadri / Greater Noida",
      "district": "Gautam Buddha Nagar (NCR)",
      "state": "Delhi NCR",
      "pincode": "201306",
      "postalOffice": "Dadri Main SO, Greater Noida",
      "region": "NR",
      "type": "hvdc_hub",
      "voltage": "±500kV HVDC / 765kV / 400kV",
      "lat": 28.55,
      "lon": 77.55,
      "capacityMW": 8500,
      "currentMW": 7950,
      "status": "healthy",
      "operator": "PGCIL NR-I / DTL / Tata Power DDL",
      "notes": "Major Northern demand intake; terminal for Rihand HVDC and Agra/Kanpur 765kV bulk feed.",
      "transformers": [
        {
          "id": "XFMR-DEL-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 82.4,
          "oilTempC": 54.2,
          "windingTempC": 64.1,
          "dgaStatus": "Normal (H2: 12 ppm)",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-DEL-ICT2",
          "name": "765/400kV ICT-2",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 79.8,
          "oilTempC": 52.8,
          "windingTempC": 62.5,
          "dgaStatus": "Normal (H2: 10 ppm)",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-DEL-HVDC1",
          "name": "±500kV HVDC Inverter Transformer Pole-1",
          "type": "Converter XFMR",
          "ratingMVA": 750,
          "primaryKV": 400,
          "secondaryKV": 210,
          "loadPercent": 88.5,
          "oilTempC": 61.2,
          "windingTempC": 72.3,
          "dgaStatus": "Normal (H2: 15 ppm)",
          "tapPosition": 11,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-DEL-HVDC2",
          "name": "±500kV HVDC Inverter Transformer Pole-2",
          "type": "Converter XFMR",
          "ratingMVA": 750,
          "primaryKV": 400,
          "secondaryKV": 210,
          "loadPercent": 87,
          "oilTempC": 59.5,
          "windingTempC": 70.1,
          "dgaStatus": "Normal (H2: 13 ppm)",
          "tapPosition": 11,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS",
        "TATA"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-AGRA",
      "name": "Agra Multi-Terminal UHVDC Terminal",
      "city": "Agra",
      "district": "Agra",
      "state": "Uttar Pradesh",
      "pincode": "282001",
      "postalOffice": "Agra Fort Head Post Office",
      "region": "NR",
      "type": "hvdc_terminal",
      "voltage": "±800kV UHVDC / 765kV AC",
      "lat": 27.1767,
      "lon": 78.0081,
      "capacityMW": 6000,
      "currentMW": 5400,
      "status": "healthy",
      "operator": "POWERGRID (PGCIL NR-I)",
      "notes": "World’s first multi-terminal ±800 kV UHVDC station receiving hydro from North-East (Biswanath Chariali).",
      "transformers": [
        {
          "id": "XFMR-AGR-CONV1",
          "name": "±800kV UHVDC Inverter Transformer Bay-1",
          "type": "Converter XFMR",
          "ratingMVA": 600,
          "primaryKV": 765,
          "secondaryKV": 333.4,
          "loadPercent": 86.4,
          "oilTempC": 59.2,
          "windingTempC": 69.8,
          "dgaStatus": "Normal (H2: 9 ppm)",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-AGR-CONV2",
          "name": "±800kV UHVDC Inverter Transformer Bay-2",
          "type": "Converter XFMR",
          "ratingMVA": 600,
          "primaryKV": 765,
          "secondaryKV": 333.4,
          "loadPercent": 85,
          "oilTempC": 58.1,
          "windingTempC": 68.2,
          "dgaStatus": "Normal (H2: 11 ppm)",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-AGR-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 77,
          "oilTempC": 51.5,
          "windingTempC": 60.1,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-AGR-ICT2",
          "name": "765/400kV ICT-2",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 75.3,
          "oilTempC": 50.8,
          "windingTempC": 59.2,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-KURUK",
      "name": "Kurukshetra HVDC Terminal",
      "city": "Kurukshetra",
      "district": "Kurukshetra",
      "state": "Haryana",
      "pincode": "136118",
      "postalOffice": "Kurukshetra University SO",
      "region": "NR",
      "type": "hvdc_terminal",
      "voltage": "±800kV HVDC / 400kV",
      "lat": 29.9695,
      "lon": 76.8783,
      "capacityMW": 3000,
      "currentMW": 2750,
      "status": "healthy",
      "operator": "POWERGRID / HVPNL",
      "notes": "Inverter station for 3,000 MW bulk transfer from Champa (WR).",
      "transformers": [
        {
          "id": "XFMR-KUR-CONV1",
          "name": "±800kV Inverter Transformer Pole-1",
          "type": "Converter XFMR",
          "ratingMVA": 600,
          "primaryKV": 400,
          "secondaryKV": 333.4,
          "loadPercent": 89.2,
          "oilTempC": 63.5,
          "windingTempC": 75,
          "dgaStatus": "Normal",
          "tapPosition": 12,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-KUR-CONV2",
          "name": "±800kV Inverter Transformer Pole-2",
          "type": "Converter XFMR",
          "ratingMVA": 600,
          "primaryKV": 400,
          "secondaryKV": 333.4,
          "loadPercent": 88,
          "oilTempC": 62,
          "windingTempC": 73.8,
          "dgaStatus": "Normal",
          "tapPosition": 12,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-KUR-ICT1",
          "name": "400/220kV Grid Step-Down ICT-1",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 220,
          "loadPercent": 72,
          "oilTempC": 47.3,
          "windingTempC": 54.6,
          "dgaStatus": "Normal",
          "tapPosition": 6,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-BHAKRA",
      "name": "Bhakra Nangal Hydro Complex",
      "city": "Nangal / Bilaspur",
      "district": "Rupnagar (Nangal)",
      "state": "Punjab / HP",
      "pincode": "140124",
      "postalOffice": "Nangal Township Post Office",
      "region": "NR",
      "type": "hydro_plant",
      "voltage": "400kV / 220kV",
      "lat": 31.41,
      "lon": 76.435,
      "capacityMW": 1325,
      "currentMW": 1180,
      "status": "healthy",
      "operator": "Bhakra Beas Management Board (BBMB)",
      "notes": "Flagship Northern Hydro peaking storage dam on the Sutlej River.",
      "transformers": [
        {
          "id": "XFMR-BHK-GT1",
          "name": "Generator Transformer GT-1",
          "type": "GT",
          "ratingMVA": 150,
          "primaryKV": 11,
          "secondaryKV": 400,
          "loadPercent": 84,
          "oilTempC": 48,
          "windingTempC": 58,
          "dgaStatus": "Normal",
          "tapPosition": 5,
          "status": "healthy",
          "cooling": "OFAF"
        },
        {
          "id": "XFMR-BHK-GT2",
          "name": "Generator Transformer GT-2",
          "type": "GT",
          "ratingMVA": 150,
          "primaryKV": 11,
          "secondaryKV": 400,
          "loadPercent": 82.5,
          "oilTempC": 47.2,
          "windingTempC": 56.8,
          "dgaStatus": "Normal",
          "tapPosition": 5,
          "status": "healthy",
          "cooling": "OFAF"
        },
        {
          "id": "XFMR-BHK-ICT1",
          "name": "400/220kV Inter-Connecting ICT",
          "type": "ICT",
          "ratingMVA": 315,
          "primaryKV": 400,
          "secondaryKV": 220,
          "loadPercent": 76,
          "oilTempC": 45,
          "windingTempC": 53.5,
          "dgaStatus": "Normal",
          "tapPosition": 6,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "BBMB_DVC",
      "operatorIds": [
        "BBMB_DVC",
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-BHADLA",
      "name": "Bhadla 2.25GW Mega Solar Park",
      "city": "Phalodi",
      "district": "Phalodi (Bhadla)",
      "state": "Rajasthan",
      "pincode": "342301",
      "postalOffice": "Phalodi Head Post Office",
      "region": "NR",
      "type": "solar_plant",
      "voltage": "765kV / 400kV / 220kV",
      "lat": 27.53,
      "lon": 71.91,
      "capacityMW": 2245,
      "currentMW": 2180,
      "status": "healthy",
      "operator": "RSPDCL / ReNew / Adani Green / PGCIL",
      "notes": "World’s largest solar park spanning 14,000 acres in the Thar Desert.",
      "transformers": [
        {
          "id": "XFMR-BHD-ICT1",
          "name": "765/400kV Green Corridor ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 92.5,
          "oilTempC": 58,
          "windingTempC": 69.2,
          "dgaStatus": "Normal",
          "tapPosition": 11,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-BHD-ICT2",
          "name": "765/400kV Green Corridor ICT-2",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 91,
          "oilTempC": 56.8,
          "windingTempC": 67.5,
          "dgaStatus": "Normal",
          "tapPosition": 11,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "RENEW_GREENKO",
      "operatorIds": [
        "RENEW_GREENKO",
        "ADANI",
        "PGCIL"
      ],
      "ownershipType": "private"
    },
    {
      "id": "NR-RAWAT",
      "name": "Rawatbhata Nuclear Power Station (RAPS)",
      "city": "Rawatbhata",
      "district": "Chittorgarh (Rawatbhata)",
      "state": "Rajasthan",
      "pincode": "323307",
      "postalOffice": "Rawatbhata Bhabhanagar Post Office",
      "region": "NR",
      "type": "nuclear_plant",
      "voltage": "400kV / 220kV",
      "lat": 24.8722,
      "lon": 75.6022,
      "capacityMW": 1180,
      "currentMW": 1140,
      "status": "healthy",
      "operator": "NPCIL (Nuclear Power Corp of India)",
      "notes": "Base-load pressurized heavy water reactors (PHWR) providing Northern Grid inertia.",
      "transformers": [
        {
          "id": "XFMR-RAPS-GT1",
          "name": "Nuclear Unit-5 Generator Step-Up GT",
          "type": "GT",
          "ratingMVA": 260,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 94.2,
          "oilTempC": 53,
          "windingTempC": 63.8,
          "dgaStatus": "Normal (H2: 6 ppm)",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-RAPS-GT2",
          "name": "Nuclear Unit-6 Generator Step-Up GT",
          "type": "GT",
          "ratingMVA": 260,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 93.8,
          "oilTempC": 52.5,
          "windingTempC": 62.9,
          "dgaStatus": "Normal (H2: 5 ppm)",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NPCIL",
      "operatorIds": [
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-SINGRAULI",
      "name": "Singrauli Super Thermal Station",
      "city": "Shaktinagar",
      "district": "Sonbhadra",
      "state": "Uttar Pradesh",
      "pincode": "231222",
      "postalOffice": "Shaktinagar Post Office",
      "region": "NR",
      "type": "thermal_plant",
      "voltage": "765kV / 400kV",
      "lat": 24.1,
      "lon": 82.68,
      "capacityMW": 2000,
      "currentMW": 1950,
      "status": "healthy",
      "operator": "NTPC Northern Region",
      "notes": "Pioneer coal-fired super thermal power plant with high PLF feeding Northern Grid.",
      "transformers": [
        {
          "id": "XFMR-SNG-GT1",
          "name": "500MW Unit-6 Generator Transformer",
          "type": "GT",
          "ratingMVA": 600,
          "primaryKV": 21,
          "secondaryKV": 400,
          "loadPercent": 89,
          "oilTempC": 55.4,
          "windingTempC": 66.2,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-SNG-ICT1",
          "name": "765/400kV Evacuation ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 78.4,
          "oilTempC": 51,
          "windingTempC": 59.8,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC",
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-RIHAND",
      "name": "Rihand Thermal & HVDC Converter Station",
      "city": "Rihand Nagar",
      "district": "Sonbhadra",
      "state": "Uttar Pradesh",
      "pincode": "231223",
      "postalOffice": "Rihand Nagar Post Office",
      "region": "NR",
      "type": "hvdc_hub",
      "voltage": "±500kV HVDC / 400kV",
      "lat": 24.02,
      "lon": 82.79,
      "capacityMW": 3000,
      "currentMW": 2850,
      "status": "healthy",
      "operator": "NTPC / PGCIL",
      "notes": "Origin of the landmark Rihand–Dadri ±500kV HVDC bi-pole link directly feeding New Delhi.",
      "transformers": [
        {
          "id": "XFMR-RIH-HVDC1",
          "name": "±500kV Rectifier Transformer Pole-1",
          "type": "Converter XFMR",
          "ratingMVA": 750,
          "primaryKV": 400,
          "secondaryKV": 210,
          "loadPercent": 88,
          "oilTempC": 58.5,
          "windingTempC": 69.2,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-RIH-GT1",
          "name": "1000MW Unit-3 Generator Transformer",
          "type": "GT",
          "ratingMVA": 1100,
          "primaryKV": 24,
          "secondaryKV": 400,
          "loadPercent": 92,
          "oilTempC": 56,
          "windingTempC": 66,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC",
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-TEHRI",
      "name": "Tehri Hydro & Pumped Storage Complex",
      "city": "Tehri",
      "district": "Tehri Garhwal",
      "state": "Uttarakhand",
      "pincode": "249001",
      "postalOffice": "New Tehri Head Post Office",
      "region": "NR",
      "type": "hydro_plant",
      "voltage": "765kV / 400kV",
      "lat": 30.378,
      "lon": 78.48,
      "capacityMW": 2400,
      "currentMW": 2100,
      "status": "healthy",
      "operator": "THDC India Limited",
      "notes": "India’s highest dam (260.5m) with reversible pumped storage units for fast frequency response.",
      "transformers": [
        {
          "id": "XFMR-TEH-GT1",
          "name": "250MW Reversible Unit GT-1",
          "type": "GT",
          "ratingMVA": 300,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 85,
          "oilTempC": 49.2,
          "windingTempC": 58.6,
          "dgaStatus": "Normal",
          "tapPosition": 6,
          "status": "healthy",
          "cooling": "OFAF"
        },
        {
          "id": "XFMR-TEH-ICT1",
          "name": "765/400kV Step-Up ICT",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 81,
          "oilTempC": 51.5,
          "windingTempC": 60.5,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NHPC_SJVN",
      "operatorIds": [
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-NATHPA",
      "name": "Nathpa Jhakri Hydroelectric Station",
      "city": "Jhakri",
      "district": "Kinnaur (Nathpa Jhakri)",
      "state": "Himachal Pradesh",
      "pincode": "172102",
      "postalOffice": "Jhakri Sub Post Office",
      "region": "NR",
      "type": "hydro_plant",
      "voltage": "400kV",
      "lat": 31.56,
      "lon": 77.68,
      "capacityMW": 1500,
      "currentMW": 1420,
      "status": "healthy",
      "operator": "SJVN Limited (Satluj Jal Vidyut)",
      "notes": "India’s largest underground hydro power plant with 6x250 MW Francis turbines.",
      "transformers": [
        {
          "id": "XFMR-NAT-GT1",
          "name": "250MW Underground GT-1",
          "type": "GT",
          "ratingMVA": 280,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 91,
          "oilTempC": 51.4,
          "windingTempC": 61.2,
          "dgaStatus": "Normal",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "OFAF"
        },
        {
          "id": "XFMR-NAT-GT2",
          "name": "250MW Underground GT-2",
          "type": "GT",
          "ratingMVA": 280,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 90,
          "oilTempC": 50.8,
          "windingTempC": 60.5,
          "dgaStatus": "Normal",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "OFAF"
        }
      ],
      "operatorId": "NHPC_SJVN",
      "operatorIds": [
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-NARORA",
      "name": "Narora Atomic Power Station (NAPS)",
      "city": "Narora",
      "district": "Bulandshahr (Narora)",
      "state": "Uttar Pradesh",
      "pincode": "203389",
      "postalOffice": "Narora Township Post Office",
      "region": "NR",
      "type": "nuclear_plant",
      "voltage": "220kV / 400kV",
      "lat": 28.156,
      "lon": 78.411,
      "capacityMW": 440,
      "currentMW": 435,
      "status": "healthy",
      "operator": "NPCIL (Nuclear Power Corp of India)",
      "notes": "Reliable baseload nuclear facility with 2x220 MW PHWR units.",
      "transformers": [
        {
          "id": "XFMR-NAR-GT1",
          "name": "Unit-1 Generator Transformer",
          "type": "GT",
          "ratingMVA": 250,
          "primaryKV": 15.75,
          "secondaryKV": 220,
          "loadPercent": 96,
          "oilTempC": 54,
          "windingTempC": 63.5,
          "dgaStatus": "Normal",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "NPCIL",
      "operatorIds": [
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-SALAL",
      "name": "Salal Hydroelectric Project",
      "city": "Reasi",
      "district": "Reasi (Salal)",
      "state": "Jammu & Kashmir",
      "pincode": "182313",
      "postalOffice": "Reasi Main Post Office",
      "region": "NR",
      "type": "hydro_plant",
      "voltage": "220kV / 400kV",
      "lat": 33.14,
      "lon": 74.83,
      "capacityMW": 690,
      "currentMW": 640,
      "status": "healthy",
      "operator": "NHPC Limited",
      "notes": "Major run-of-the-river project on the Chenab River feeding Northern Region.",
      "transformers": [
        {
          "id": "XFMR-SAL-GT1",
          "name": "115MW Unit GT-1",
          "type": "GT",
          "ratingMVA": 130,
          "primaryKV": 11,
          "secondaryKV": 220,
          "loadPercent": 88,
          "oilTempC": 46.5,
          "windingTempC": 54,
          "dgaStatus": "Normal",
          "tapPosition": 5,
          "status": "healthy",
          "cooling": "OFAF"
        }
      ],
      "operatorId": "NHPC_SJVN",
      "operatorIds": [
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-MEERUT",
      "name": "Meerut 765kV Super Pooling Substation",
      "city": "Meerut",
      "district": "Meerut",
      "state": "Uttar Pradesh",
      "pincode": "250001",
      "postalOffice": "Meerut Cantt Head Post Office",
      "region": "NR",
      "type": "substation",
      "voltage": "765kV / 400kV",
      "lat": 28.9845,
      "lon": 77.7064,
      "capacityMW": 6000,
      "currentMW": 5100,
      "status": "healthy",
      "operator": "POWERGRID / UPPTCL",
      "notes": "Strategic ring node connecting Tehri Hydro, Agra 765kV, and Greater Noida grid.",
      "transformers": [
        {
          "id": "XFMR-MEE-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 78,
          "oilTempC": 50.4,
          "windingTempC": 59.8,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-KANPUR",
      "name": "Kanpur Mainpuri 765kV Grid Hub",
      "city": "Kanpur / Mainpuri",
      "district": "Kanpur",
      "state": "Uttar Pradesh",
      "pincode": "208001",
      "postalOffice": "Kanpur Head Post Office",
      "region": "NR",
      "type": "substation",
      "voltage": "765kV / 400kV",
      "lat": 26.4499,
      "lon": 80.3319,
      "capacityMW": 5500,
      "currentMW": 4800,
      "status": "healthy",
      "operator": "POWERGRID / UPPTCL",
      "notes": "Major synchronous hub on the Singrauli–Vindhyachal–Agra 765kV super-grid.",
      "transformers": [
        {
          "id": "XFMR-KAN-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 81.2,
          "oilTempC": 52,
          "windingTempC": 61.5,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NR-FATEHGARH",
      "name": "Fatehgarh RE Evacuation Substation",
      "city": "Fatehgarh",
      "district": "Jaisalmer (Fatehgarh)",
      "state": "Rajasthan",
      "pincode": "345001",
      "postalOffice": "Jaisalmer Head Post Office",
      "region": "NR",
      "type": "substation",
      "voltage": "765kV / 400kV",
      "lat": 26.65,
      "lon": 71.2,
      "capacityMW": 7000,
      "currentMW": 6200,
      "status": "healthy",
      "operator": "Adani Energy Solutions / PGCIL",
      "notes": "Western Rajasthan renewable green energy corridor substation pooling mega solar/wind.",
      "transformers": [
        {
          "id": "XFMR-FAT-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 88.5,
          "oilTempC": 55.8,
          "windingTempC": 67,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "ADANI",
      "operatorIds": [
        "ADANI",
        "PGCIL"
      ],
      "ownershipType": "private"
    },
    {
      "id": "NR-BIKANER",
      "name": "Bikaner 765kV RE Substation",
      "city": "Bikaner",
      "district": "Bikaner",
      "state": "Rajasthan",
      "pincode": "334001",
      "postalOffice": "Bikaner Head Post Office",
      "region": "NR",
      "type": "substation",
      "voltage": "765kV / 400kV",
      "lat": 28.0176,
      "lon": 73.3119,
      "capacityMW": 6000,
      "currentMW": 5300,
      "status": "healthy",
      "operator": "Sterlite Power / PGCIL",
      "notes": "Northern Green Energy Corridor hub pumping solar to Punjab and Haryana.",
      "transformers": [
        {
          "id": "XFMR-BIK-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 82,
          "oilTempC": 52.4,
          "windingTempC": 62,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "STERLITE_INDGRID",
      "operatorIds": [
        "STERLITE_INDGRID",
        "PGCIL"
      ],
      "ownershipType": "private"
    },
    {
      "id": "WR-RAIGARH",
      "name": "Raigarh ±800kV Super Pooling Hub",
      "city": "Raigarh",
      "district": "Raigarh",
      "state": "Chhattisgarh",
      "pincode": "496001",
      "postalOffice": "Raigarh Head Post Office",
      "region": "WR",
      "type": "hvdc_hub",
      "voltage": "±800kV UHVDC / 765kV / 400kV",
      "lat": 21.9,
      "lon": 83.4,
      "capacityMW": 12000,
      "currentMW": 10600,
      "status": "compromised",
      "operator": "POWERGRID (PGCIL WR-I)",
      "notes": "Origin terminal of 6,000 MW Raigarh–Pugalur UHVDC corridor to Southern Grid.",
      "transformers": [
        {
          "id": "XFMR-RAI-CONV1",
          "name": "±800kV Rectifier Transformer Bay-1",
          "type": "Converter XFMR",
          "ratingMVA": 800,
          "primaryKV": 765,
          "secondaryKV": 333.4,
          "loadPercent": 91.2,
          "oilTempC": 62.5,
          "windingTempC": 74,
          "dgaStatus": "Normal (H2: 14 ppm)",
          "tapPosition": 12,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-RAI-CONV2",
          "name": "±800kV Rectifier Transformer Bay-2",
          "type": "Converter XFMR",
          "ratingMVA": 800,
          "primaryKV": 765,
          "secondaryKV": 333.4,
          "loadPercent": 90.5,
          "oilTempC": 61.8,
          "windingTempC": 73.1,
          "dgaStatus": "Normal (H2: 12 ppm)",
          "tapPosition": 12,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-RAI-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 84,
          "oilTempC": 54,
          "windingTempC": 63.8,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "WR-CHAMPA",
      "name": "Champa ±800kV HVDC Pooling Hub",
      "city": "Champa",
      "district": "Janjgir-Champa",
      "state": "Chhattisgarh",
      "pincode": "495671",
      "postalOffice": "Champa Sub Post Office",
      "region": "WR",
      "type": "hvdc_hub",
      "voltage": "±800kV HVDC / 765kV",
      "lat": 22.05,
      "lon": 82.65,
      "capacityMW": 6000,
      "currentMW": 5400,
      "status": "healthy",
      "operator": "POWERGRID (PGCIL WR-I)",
      "notes": "Origin terminal of 3,000 MW bulk HVDC link to Kurukshetra (Northern Grid).",
      "transformers": [
        {
          "id": "XFMR-CHA-CONV1",
          "name": "±800kV Converter Transformer Pole-1",
          "type": "Converter XFMR",
          "ratingMVA": 600,
          "primaryKV": 765,
          "secondaryKV": 333.4,
          "loadPercent": 87.5,
          "oilTempC": 60.1,
          "windingTempC": 71,
          "dgaStatus": "Normal",
          "tapPosition": 11,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-CHA-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 80,
          "oilTempC": 52,
          "windingTempC": 61,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "WR-WARDHA",
      "name": "Wardha 765kV Super Pooling Substation",
      "city": "Wardha",
      "district": "Wardha",
      "state": "Maharashtra",
      "pincode": "442001",
      "postalOffice": "Wardha Head Post Office",
      "region": "WR",
      "type": "substation",
      "voltage": "765kV / 400kV",
      "lat": 20.7453,
      "lon": 78.6022,
      "capacityMW": 7500,
      "currentMW": 6800,
      "status": "healthy",
      "operator": "POWERGRID / MSETCL",
      "notes": "Central node of the 765kV Western Grid routing power between MP, CG, and Mumbai.",
      "transformers": [
        {
          "id": "XFMR-WRD-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 86,
          "oilTempC": 55,
          "windingTempC": 65.4,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-WRD-ICT2",
          "name": "765/400kV ICT-2",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 83.5,
          "oilTempC": 53.8,
          "windingTempC": 63.8,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "WR-SOLAPUR",
      "name": "Solapur 765kV Inter-Regional Substation",
      "city": "Solapur",
      "district": "Solapur",
      "state": "Maharashtra",
      "pincode": "413001",
      "postalOffice": "Solapur Head Post Office",
      "region": "WR",
      "type": "substation",
      "voltage": "765kV / 400kV",
      "lat": 17.6599,
      "lon": 75.9064,
      "capacityMW": 6000,
      "currentMW": 5200,
      "status": "healthy",
      "operator": "POWERGRID / MSETCL",
      "notes": "Key 765kV link synchronizing Western Grid (Maharashtra) with Southern Grid (Karnataka).",
      "transformers": [
        {
          "id": "XFMR-SOL-ICT1",
          "name": "765/400kV Inter-Regional ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 79.5,
          "oilTempC": 51.8,
          "windingTempC": 61,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "WR-VINDHYA",
      "name": "Vindhyachal Super Thermal (4.76GW)",
      "city": "Vindhyanagar",
      "district": "Singrauli (Vindhyachal & Sasan)",
      "state": "Madhya Pradesh",
      "pincode": "486885",
      "postalOffice": "Vindhyanagar Post Office",
      "region": "WR",
      "type": "thermal_plant",
      "voltage": "765kV / 400kV",
      "lat": 24.1,
      "lon": 82.67,
      "capacityMW": 4760,
      "currentMW": 4620,
      "status": "healthy",
      "operator": "NTPC Limited",
      "notes": "India’s largest thermal power plant (4,760 MW) with 13 operating generating units.",
      "transformers": [
        {
          "id": "XFMR-VIN-GT1",
          "name": "500MW Unit-13 Generator Transformer",
          "type": "GT",
          "ratingMVA": 600,
          "primaryKV": 21,
          "secondaryKV": 765,
          "loadPercent": 94,
          "oilTempC": 58,
          "windingTempC": 68.8,
          "dgaStatus": "Normal (H2: 11 ppm)",
          "tapPosition": 11,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-VIN-ICT1",
          "name": "765/400kV Step-Down ICT",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 88,
          "oilTempC": 54.6,
          "windingTempC": 64,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC",
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "WR-MUNDRA",
      "name": "Mundra Ultra Mega Power Project (UMPP)",
      "city": "Mundra",
      "district": "Kutch (Mundra & Khavda)",
      "state": "Gujarat",
      "pincode": "370421",
      "postalOffice": "Mundra Post Office, Kutch",
      "region": "WR",
      "type": "thermal_plant",
      "voltage": "±500kV HVDC / 400kV",
      "lat": 22.839,
      "lon": 69.525,
      "capacityMW": 4000,
      "currentMW": 3750,
      "status": "healthy",
      "operator": "Adani Power / Tata Power",
      "notes": "Flagship supercritical coastal coal-fired power station in the Gulf of Kutch.",
      "transformers": [
        {
          "id": "XFMR-MUN-GT1",
          "name": "800MW Supercritical Unit-1 GT",
          "type": "GT",
          "ratingMVA": 950,
          "primaryKV": 24,
          "secondaryKV": 400,
          "loadPercent": 91,
          "oilTempC": 56.4,
          "windingTempC": 66.8,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-MUN-GT2",
          "name": "800MW Supercritical Unit-2 GT",
          "type": "GT",
          "ratingMVA": 950,
          "primaryKV": 24,
          "secondaryKV": 400,
          "loadPercent": 89.5,
          "oilTempC": 55.2,
          "windingTempC": 65.4,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "ADANI",
      "operatorIds": [
        "ADANI",
        "TATA",
        "PGCIL"
      ],
      "ownershipType": "private"
    },
    {
      "id": "WR-KHAVDA",
      "name": "Khavda Renewable Mega Energy Park",
      "city": "Khavda",
      "district": "Kutch (Mundra & Khavda)",
      "state": "Gujarat",
      "pincode": "370140",
      "postalOffice": "Khavda Sub Post Office, Kutch",
      "region": "WR",
      "type": "solar_plant",
      "voltage": "765kV / 400kV",
      "lat": 23.85,
      "lon": 69.75,
      "capacityMW": 6000,
      "currentMW": 5400,
      "status": "healthy",
      "operator": "Adani Green / PGCIL",
      "notes": "World’s largest hybrid solar-wind energy park under construction in Rann of Kutch (30GW planned).",
      "transformers": [
        {
          "id": "XFMR-KHA-ICT1",
          "name": "765/400kV Evacuation ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 88,
          "oilTempC": 56,
          "windingTempC": 67.5,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-KHA-ICT2",
          "name": "765/400kV Evacuation ICT-2",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 86.5,
          "oilTempC": 54.8,
          "windingTempC": 66,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "ADANI",
      "operatorIds": [
        "ADANI",
        "PGCIL"
      ],
      "ownershipType": "private"
    },
    {
      "id": "WR-TARAPUR",
      "name": "Tarapur Atomic Power Station (TAPS)",
      "city": "Tarapur / Boisar",
      "district": "Palghar (Tarapur)",
      "state": "Maharashtra",
      "pincode": "401504",
      "postalOffice": "TAPP Tarapur Post Office",
      "region": "WR",
      "type": "nuclear_plant",
      "voltage": "400kV / 220kV",
      "lat": 19.829,
      "lon": 72.656,
      "capacityMW": 1400,
      "currentMW": 1360,
      "status": "healthy",
      "operator": "NPCIL (Nuclear Power Corp of India)",
      "notes": "India’s first commercial nuclear power station supplying base-load energy to Mumbai & Gujarat.",
      "transformers": [
        {
          "id": "XFMR-TAP-GT1",
          "name": "540MW Unit-3 Generator Step-Up GT",
          "type": "GT",
          "ratingMVA": 620,
          "primaryKV": 21,
          "secondaryKV": 400,
          "loadPercent": 95,
          "oilTempC": 55,
          "windingTempC": 65.5,
          "dgaStatus": "Normal (H2: 8 ppm)",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NPCIL",
      "operatorIds": [
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "WR-KAKRAPAR",
      "name": "Kakrapar Atomic Power Station (KAPS)",
      "city": "Vyara",
      "district": "Tapi (Kakrapar)",
      "state": "Gujarat",
      "pincode": "394651",
      "postalOffice": "Anumala Kakrapar Post Office",
      "region": "WR",
      "type": "nuclear_plant",
      "voltage": "400kV / 220kV",
      "lat": 21.236,
      "lon": 73.35,
      "capacityMW": 1840,
      "currentMW": 1780,
      "status": "healthy",
      "operator": "NPCIL (Nuclear Power Corp of India)",
      "notes": "Home to India’s first indigenously designed 700 MW pressurized heavy water reactors (Unit 3 & 4).",
      "transformers": [
        {
          "id": "XFMR-KAK-GT1",
          "name": "700MW Unit-3 Step-Up GT",
          "type": "GT",
          "ratingMVA": 820,
          "primaryKV": 21,
          "secondaryKV": 400,
          "loadPercent": 94.5,
          "oilTempC": 54.5,
          "windingTempC": 64.8,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NPCIL",
      "operatorIds": [
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "WR-KOYNA",
      "name": "Koyna Hydroelectric Project",
      "city": "Koynanagar",
      "district": "Satara (Koyna)",
      "state": "Maharashtra",
      "pincode": "415207",
      "postalOffice": "Koynanagar Post Office",
      "region": "WR",
      "type": "hydro_plant",
      "voltage": "400kV / 220kV",
      "lat": 17.4,
      "lon": 73.75,
      "capacityMW": 1960,
      "currentMW": 1820,
      "status": "healthy",
      "operator": "MAHAGENCO / MSETCL",
      "notes": "Largest completed hydroelectric power plant in India with extensive underground caverns.",
      "transformers": [
        {
          "id": "XFMR-KOY-GT1",
          "name": "Stage-IV 250MW Generator Transformer",
          "type": "GT",
          "ratingMVA": 280,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 91,
          "oilTempC": 50,
          "windingTempC": 59.5,
          "dgaStatus": "Normal",
          "tapPosition": 6,
          "status": "healthy",
          "cooling": "OFAF"
        }
      ],
      "operatorId": "STATE_TRANSCOS",
      "operatorIds": [
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_state"
    },
    {
      "id": "WR-SARDAR",
      "name": "Sardar Sarovar Hydro Project",
      "city": "Kevadia",
      "district": "Narmada (Sardar Sarovar)",
      "state": "Gujarat",
      "pincode": "393151",
      "postalOffice": "Kevadia Colony Post Office",
      "region": "WR",
      "type": "hydro_plant",
      "voltage": "400kV",
      "lat": 21.83,
      "lon": 73.75,
      "capacityMW": 1450,
      "currentMW": 1320,
      "status": "healthy",
      "operator": "SSNNL / GETCO",
      "notes": "Major multi-purpose gravity dam on the Narmada River generating clean peak power.",
      "transformers": [
        {
          "id": "XFMR-SAR-GT1",
          "name": "River Bed Powerhouse 200MW GT-1",
          "type": "GT",
          "ratingMVA": 230,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 87,
          "oilTempC": 48.5,
          "windingTempC": 57,
          "dgaStatus": "Normal",
          "tapPosition": 6,
          "status": "healthy",
          "cooling": "OFAF"
        }
      ],
      "operatorId": "STATE_TRANSCOS",
      "operatorIds": [
        "STATE_TRANSCOS",
        "PGCIL"
      ],
      "ownershipType": "govt_state"
    },
    {
      "id": "WR-SASAN",
      "name": "Sasan Ultra Mega Power Project (UMPP)",
      "city": "Sasan",
      "district": "Singrauli (Vindhyachal & Sasan)",
      "state": "Madhya Pradesh",
      "pincode": "486886",
      "postalOffice": "Waidhan Head Post Office, Singrauli",
      "region": "WR",
      "type": "thermal_plant",
      "voltage": "765kV / 400kV",
      "lat": 23.97,
      "lon": 82.62,
      "capacityMW": 3960,
      "currentMW": 3820,
      "status": "healthy",
      "operator": "Reliance Power / PGCIL",
      "notes": "Supercritical coal-fired power plant with 6x660 MW units connected to Western Grid 765kV backbone.",
      "transformers": [
        {
          "id": "XFMR-SAS-GT1",
          "name": "660MW Unit-1 Generator Transformer",
          "type": "GT",
          "ratingMVA": 750,
          "primaryKV": 22,
          "secondaryKV": 765,
          "loadPercent": 93,
          "oilTempC": 56.5,
          "windingTempC": 67,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "RELIANCE_JSW",
      "operatorIds": [
        "RELIANCE_JSW",
        "PGCIL"
      ],
      "ownershipType": "private"
    },
    {
      "id": "WR-KORBA",
      "name": "Korba Super Thermal Power Plant",
      "city": "Korba",
      "district": "Korba",
      "state": "Chhattisgarh",
      "pincode": "495677",
      "postalOffice": "Korba Head Post Office",
      "region": "WR",
      "type": "thermal_plant",
      "voltage": "400kV",
      "lat": 22.35,
      "lon": 82.68,
      "capacityMW": 2600,
      "currentMW": 2480,
      "status": "healthy",
      "operator": "NTPC Western Region-II",
      "notes": "Pit-head thermal power station with dedicated coal merry-go-round system.",
      "transformers": [
        {
          "id": "XFMR-KOR-GT1",
          "name": "500MW Unit-7 Generator Transformer",
          "type": "GT",
          "ratingMVA": 600,
          "primaryKV": 21,
          "secondaryKV": 400,
          "loadPercent": 91,
          "oilTempC": 54,
          "windingTempC": 64.5,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "WR-REWA",
      "name": "Rewa Ultra Mega Solar Park",
      "city": "Gurh",
      "district": "Rewa",
      "state": "Madhya Pradesh",
      "pincode": "486553",
      "postalOffice": "Gurh Post Office, Rewa",
      "region": "WR",
      "type": "solar_plant",
      "voltage": "400kV / 220kV",
      "lat": 24.47,
      "lon": 81.57,
      "capacityMW": 750,
      "currentMW": 730,
      "status": "healthy",
      "operator": "RUMSL / ReNew Power / PGCIL",
      "notes": "Groundbreaking solar project providing clean energy to Delhi Metro.",
      "transformers": [
        {
          "id": "XFMR-REW-ICT1",
          "name": "400/220kV Step-Up ICT-1",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 220,
          "loadPercent": 92,
          "oilTempC": 54,
          "windingTempC": 64,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "RENEW_GREENKO",
      "operatorIds": [
        "RENEW_GREENKO",
        "PGCIL"
      ],
      "ownershipType": "private"
    },
    {
      "id": "WR-BHADRAWATI",
      "name": "Bhadrawati HVDC Back-to-Back Terminal",
      "city": "Bhadrawati",
      "district": "Chandrapur",
      "state": "Maharashtra",
      "pincode": "442902",
      "postalOffice": "Bhadrawati Sub Post Office",
      "region": "WR",
      "type": "hvdc_terminal",
      "voltage": "±205kV HVDC / 400kV",
      "lat": 20.1,
      "lon": 79.12,
      "capacityMW": 1000,
      "currentMW": 950,
      "status": "healthy",
      "operator": "PGCIL WR-I",
      "notes": "Historic 1,000 MW back-to-back asynchronous interconnection between Western & Southern regions.",
      "transformers": [
        {
          "id": "XFMR-BHA-CONV1",
          "name": "500MW Converter Transformer Block-1",
          "type": "Converter XFMR",
          "ratingMVA": 300,
          "primaryKV": 400,
          "secondaryKV": 145,
          "loadPercent": 92,
          "oilTempC": 58,
          "windingTempC": 68,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-PUGALUR",
      "name": "Pugalur ±800kV UHVDC Terminal",
      "city": "Pugalur",
      "district": "Karur (Pugalur)",
      "state": "Tamil Nadu",
      "pincode": "639113",
      "postalOffice": "Pugalur Sugar Factory Post Office, Karur",
      "region": "SR",
      "type": "hvdc_hub",
      "voltage": "±800kV UHVDC / 400kV AC",
      "lat": 11.05,
      "lon": 78,
      "capacityMW": 6000,
      "currentMW": 5200,
      "status": "healthy",
      "operator": "POWERGRID (PGCIL SR-II)",
      "notes": "Inverter terminal receiving 6,000 MW bulk base-load power from Raigarh (WR).",
      "transformers": [
        {
          "id": "XFMR-PUG-CONV1",
          "name": "±800kV Inverter Transformer Bay-1",
          "type": "Converter XFMR",
          "ratingMVA": 800,
          "primaryKV": 400,
          "secondaryKV": 333.4,
          "loadPercent": 88,
          "oilTempC": 60.5,
          "windingTempC": 72,
          "dgaStatus": "Normal (H2: 8 ppm)",
          "tapPosition": 11,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-PUG-ICT1",
          "name": "400/230kV Grid Step-Down ICT-1",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 230,
          "loadPercent": 78,
          "oilTempC": 50,
          "windingTempC": 58.5,
          "dgaStatus": "Normal",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-KUDANKULAM",
      "name": "Kudankulam Nuclear Power Plant (KKNPP)",
      "city": "Kudankulam",
      "district": "Tirunelveli (Kudankulam)",
      "state": "Tamil Nadu",
      "pincode": "627106",
      "postalOffice": "Kudankulam Post Office, Radhapuram Taluk",
      "region": "SR",
      "type": "nuclear_plant",
      "voltage": "400kV AC",
      "lat": 8.17,
      "lon": 77.71,
      "capacityMW": 2000,
      "currentMW": 1980,
      "status": "healthy",
      "operator": "NPCIL (Nuclear Power Corp of India)",
      "notes": "India’s largest operating nuclear power station with 2x1000 MW VVER-1000 reactors.",
      "transformers": [
        {
          "id": "XFMR-KKN-GT1",
          "name": "Unit-1 1000MW VVER Step-Up GT",
          "type": "GT",
          "ratingMVA": 1150,
          "primaryKV": 24,
          "secondaryKV": 400,
          "loadPercent": 96,
          "oilTempC": 56.5,
          "windingTempC": 67.8,
          "dgaStatus": "Normal (H2: 7 ppm)",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-KKN-GT2",
          "name": "Unit-2 1000MW VVER Step-Up GT",
          "type": "GT",
          "ratingMVA": 1150,
          "primaryKV": 24,
          "secondaryKV": 400,
          "loadPercent": 95.2,
          "oilTempC": 55.8,
          "windingTempC": 66.9,
          "dgaStatus": "Normal (H2: 6 ppm)",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NPCIL",
      "operatorIds": [
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-KOLAR",
      "name": "Kolar ±500kV HVDC Terminal",
      "city": "Kolar",
      "district": "Kolar",
      "state": "Karnataka",
      "pincode": "563101",
      "postalOffice": "Kolar Head Post Office",
      "region": "SR",
      "type": "hvdc_terminal",
      "voltage": "±500kV HVDC / 400kV",
      "lat": 13.1367,
      "lon": 78.1292,
      "capacityMW": 2500,
      "currentMW": 2200,
      "status": "healthy",
      "operator": "POWERGRID (PGCIL SR-II)",
      "notes": "Terminal for 2,500 MW Talcher–Kolar HVDC corridor supplying Bangalore and Karnataka.",
      "transformers": [
        {
          "id": "XFMR-KOL-CONV1",
          "name": "±500kV Inverter Transformer Pole-1",
          "type": "Converter XFMR",
          "ratingMVA": 625,
          "primaryKV": 400,
          "secondaryKV": 210,
          "loadPercent": 86,
          "oilTempC": 58,
          "windingTempC": 69,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-PAVAGADA",
      "name": "Pavagada 2.05GW Solar Park (Shakti Sthala)",
      "city": "Pavagada",
      "district": "Tumkur (Pavagada)",
      "state": "Karnataka",
      "pincode": "572136",
      "postalOffice": "Pavagada Head Post Office, Tumkur",
      "region": "SR",
      "type": "solar_plant",
      "voltage": "400kV / 220kV",
      "lat": 14.1,
      "lon": 77.28,
      "capacityMW": 2050,
      "currentMW": 1980,
      "status": "healthy",
      "operator": "Tata Power Solar / KSPDCL / PGCIL",
      "notes": "Second largest solar power plant in India spanning 13,000 acres in Tumkur.",
      "transformers": [
        {
          "id": "XFMR-PAV-ICT1",
          "name": "400/220kV Pooling ICT-1",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 220,
          "loadPercent": 91.5,
          "oilTempC": 55,
          "windingTempC": 66,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ONAF"
        },
        {
          "id": "XFMR-PAV-ICT2",
          "name": "400/220kV Pooling ICT-2",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 220,
          "loadPercent": 89,
          "oilTempC": 53.8,
          "windingTempC": 64.5,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "TATA",
      "operatorIds": [
        "TATA",
        "RENEW_GREENKO",
        "PGCIL"
      ],
      "ownershipType": "private"
    },
    {
      "id": "SR-RAMAGUNDAM",
      "name": "Ramagundam Super Thermal Power Station",
      "city": "Ramagundam",
      "district": "Peddapalli (Ramagundam)",
      "state": "Telangana",
      "pincode": "505208",
      "postalOffice": "Jyothinagar Post Office, Ramagundam",
      "region": "SR",
      "type": "thermal_plant",
      "voltage": "400kV / 765kV",
      "lat": 18.76,
      "lon": 79.48,
      "capacityMW": 2600,
      "currentMW": 2510,
      "status": "healthy",
      "operator": "NTPC Southern Region",
      "notes": "Primary baseload thermal power plant for Telangana and Andhra Pradesh with floating solar array.",
      "transformers": [
        {
          "id": "XFMR-RAM-GT1",
          "name": "500MW Unit-7 Generator Transformer",
          "type": "GT",
          "ratingMVA": 600,
          "primaryKV": 21,
          "secondaryKV": 400,
          "loadPercent": 92,
          "oilTempC": 54,
          "windingTempC": 64.5,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-SRISAILAM",
      "name": "Srisailam Hydro & Pumped Storage Complex",
      "city": "Srisailam",
      "district": "Nagarkurnool (Srisailam)",
      "state": "AP / Telangana",
      "pincode": "509326",
      "postalOffice": "Srisailam Project Sub Post Office",
      "region": "SR",
      "type": "hydro_plant",
      "voltage": "400kV / 220kV",
      "lat": 16.08,
      "lon": 78.89,
      "capacityMW": 1670,
      "currentMW": 1510,
      "status": "healthy",
      "operator": "APGENCO / TSGENCO",
      "notes": "Left & Right bank hydro stations on the Krishna River offering pumped storage peaking.",
      "transformers": [
        {
          "id": "XFMR-SRI-GT1",
          "name": "150MW Reversible Unit GT-1",
          "type": "GT",
          "ratingMVA": 175,
          "primaryKV": 13.8,
          "secondaryKV": 400,
          "loadPercent": 88,
          "oilTempC": 48,
          "windingTempC": 57.5,
          "dgaStatus": "Normal",
          "tapPosition": 6,
          "status": "healthy",
          "cooling": "OFAF"
        }
      ],
      "operatorId": "STATE_TRANSCOS",
      "operatorIds": [
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_state"
    },
    {
      "id": "SR-KALPAKKAM",
      "name": "Madras Atomic Power Station (MAPS / PFBR)",
      "city": "Kalpakkam",
      "district": "Chengalpattu (Kalpakkam)",
      "state": "Tamil Nadu",
      "pincode": "603102",
      "postalOffice": "Kalpakkam Township Post Office",
      "region": "SR",
      "type": "nuclear_plant",
      "voltage": "230kV / 400kV",
      "lat": 12.557,
      "lon": 80.174,
      "capacityMW": 440,
      "currentMW": 430,
      "status": "healthy",
      "operator": "NPCIL / BHAVINI",
      "notes": "Nuclear power complex featuring PHWR reactors and the 500 MWe Prototype Fast Breeder Reactor.",
      "transformers": [
        {
          "id": "XFMR-KAL-GT1",
          "name": "Unit-1 220MW Generator Transformer",
          "type": "GT",
          "ratingMVA": 260,
          "primaryKV": 15.75,
          "secondaryKV": 230,
          "loadPercent": 95,
          "oilTempC": 53,
          "windingTempC": 62,
          "dgaStatus": "Normal",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "NPCIL",
      "operatorIds": [
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-KAIGA",
      "name": "Kaiga Generating Station",
      "city": "Kaiga",
      "district": "Uttara Kannada (Kaiga)",
      "state": "Karnataka",
      "pincode": "581400",
      "postalOffice": "Kaiga Post Office, Karwar Taluk",
      "region": "SR",
      "type": "nuclear_plant",
      "voltage": "400kV / 220kV",
      "lat": 14.86,
      "lon": 74.43,
      "capacityMW": 880,
      "currentMW": 860,
      "status": "healthy",
      "operator": "NPCIL (Nuclear Power Corp of India)",
      "notes": "Held world record for continuous operation (962 days) for PHWR-220 units in Western Ghats.",
      "transformers": [
        {
          "id": "XFMR-KAI-GT1",
          "name": "Unit-1 220MW Step-Up GT",
          "type": "GT",
          "ratingMVA": 260,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 94,
          "oilTempC": 52,
          "windingTempC": 61.5,
          "dgaStatus": "Normal",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NPCIL",
      "operatorIds": [
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-NEYVELI",
      "name": "Neyveli Lignite Thermal Complex",
      "city": "Neyveli",
      "district": "Cuddalore (Neyveli)",
      "state": "Tamil Nadu",
      "pincode": "607807",
      "postalOffice": "Neyveli-1 Head Post Office",
      "region": "SR",
      "type": "thermal_plant",
      "voltage": "400kV / 230kV",
      "lat": 11.59,
      "lon": 79.48,
      "capacityMW": 3940,
      "currentMW": 3650,
      "status": "healthy",
      "operator": "NLC India Limited / PGCIL",
      "notes": "Pioneer lignite pit-head power generation station with supercritical 1000MW expansion.",
      "transformers": [
        {
          "id": "XFMR-NEY-GT1",
          "name": "500MW Supercritical Unit GT",
          "type": "GT",
          "ratingMVA": 600,
          "primaryKV": 21,
          "secondaryKV": 400,
          "loadPercent": 90,
          "oilTempC": 54,
          "windingTempC": 64,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC",
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-MUPPANDAL",
      "name": "Muppandal Mega Wind Farm",
      "city": "Muppandal / Aralvaimozhi",
      "district": "Kanyakumari (Muppandal)",
      "state": "Tamil Nadu",
      "pincode": "629704",
      "postalOffice": "Aralvaimozhi Post Office, Kanyakumari",
      "region": "SR",
      "type": "solar_plant",
      "voltage": "230kV / 400kV",
      "lat": 8.26,
      "lon": 77.54,
      "capacityMW": 1500,
      "currentMW": 1350,
      "status": "healthy",
      "operator": "TANGEDCO / Private IPPs (Greenko/ReNew)",
      "notes": "India’s largest onshore wind farm complex situated in the high-wind mountain pass.",
      "transformers": [
        {
          "id": "XFMR-MUP-ICT1",
          "name": "230/400kV Green Wind Evacuation ICT",
          "type": "ICT",
          "ratingMVA": 315,
          "primaryKV": 230,
          "secondaryKV": 400,
          "loadPercent": 86,
          "oilTempC": 49,
          "windingTempC": 58,
          "dgaStatus": "Normal",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "RENEW_GREENKO",
      "operatorIds": [
        "RENEW_GREENKO",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "private"
    },
    {
      "id": "SR-KURNOOL",
      "name": "Kurnool Ultra Mega Solar Park",
      "city": "Gani / Sakunala",
      "district": "Kurnool (Ultra Solar)",
      "state": "Andhra Pradesh",
      "pincode": "518001",
      "postalOffice": "Kurnool Head Post Office",
      "region": "SR",
      "type": "solar_plant",
      "voltage": "400kV / 220kV",
      "lat": 15.68,
      "lon": 78.28,
      "capacityMW": 1000,
      "currentMW": 970,
      "status": "healthy",
      "operator": "APSPCL / ReNew Power / PGCIL",
      "notes": "1,000 MW integrated solar park connected to the 400kV Southern transmission highway.",
      "transformers": [
        {
          "id": "XFMR-KUR-ICT1",
          "name": "400/220kV Substation ICT",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 220,
          "loadPercent": 93,
          "oilTempC": 55,
          "windingTempC": 66,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "RENEW_GREENKO",
      "operatorIds": [
        "RENEW_GREENKO",
        "PGCIL"
      ],
      "ownershipType": "private"
    },
    {
      "id": "SR-GAZUWAKA",
      "name": "Gazuwaka HVDC Back-to-Back Terminal",
      "city": "Visakhapatnam",
      "district": "Visakhapatnam (Gazuwaka & Simhadri)",
      "state": "Andhra Pradesh",
      "pincode": "530044",
      "postalOffice": "BHPV Gajuwaka Post Office, Visakhapatnam",
      "region": "SR",
      "type": "hvdc_terminal",
      "voltage": "±205kV HVDC / 400kV",
      "lat": 17.69,
      "lon": 83.16,
      "capacityMW": 1000,
      "currentMW": 940,
      "status": "healthy",
      "operator": "POWERGRID (PGCIL SR-I)",
      "notes": "Historic 1,000 MW back-to-back HVDC link connecting Eastern and Southern regional grids.",
      "transformers": [
        {
          "id": "XFMR-GAZ-CONV1",
          "name": "500MW Converter Transformer Pole-1",
          "type": "Converter XFMR",
          "ratingMVA": 300,
          "primaryKV": 400,
          "secondaryKV": 145,
          "loadPercent": 91,
          "oilTempC": 57,
          "windingTempC": 67,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-SRIPERUM",
      "name": "Sriperumbudur 400kV Substation",
      "city": "Sriperumbudur / Chennai",
      "district": "Chengalpattu (Kalpakkam)",
      "state": "Tamil Nadu",
      "pincode": "602105",
      "postalOffice": "Sriperumbudur Sub Post Office, Kanchipuram",
      "region": "SR",
      "type": "substation",
      "voltage": "400kV / 230kV",
      "lat": 12.9667,
      "lon": 79.95,
      "capacityMW": 4500,
      "currentMW": 4100,
      "status": "healthy",
      "operator": "TANTRANSCO / PGCIL",
      "notes": "Critical power hub feeding Chennai metropolitan industrial corridor and auto hub.",
      "transformers": [
        {
          "id": "XFMR-SRI-ICT1",
          "name": "400/230kV ICT-1",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 230,
          "loadPercent": 88,
          "oilTempC": 54,
          "windingTempC": 63.5,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "STATE_TRANSCOS",
      "operatorIds": [
        "STATE_TRANSCOS",
        "PGCIL"
      ],
      "ownershipType": "govt_state"
    },
    {
      "id": "SR-BENGALURU",
      "name": "Bengaluru Hoodi / Nelamangala 400kV Hub",
      "city": "Nelamangala / Hoodi",
      "district": "Bengaluru Urban",
      "state": "Karnataka",
      "pincode": "560048",
      "postalOffice": "Hoodi Sub Post Office, Whitefield, Bengaluru",
      "region": "SR",
      "type": "substation",
      "voltage": "400kV / 220kV",
      "lat": 13.09,
      "lon": 77.39,
      "capacityMW": 5000,
      "currentMW": 4600,
      "status": "healthy",
      "operator": "KPTCL / BESCOM / PGCIL",
      "notes": "Primary bulk 400kV power gateway for Bengaluru IT corridor and aerospace hub.",
      "transformers": [
        {
          "id": "XFMR-BEN-ICT1",
          "name": "400/220kV ICT-1",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 220,
          "loadPercent": 89,
          "oilTempC": 53,
          "windingTempC": 62,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "STATE_TRANSCOS",
      "operatorIds": [
        "STATE_TRANSCOS",
        "PGCIL"
      ],
      "ownershipType": "govt_state"
    },
    {
      "id": "SR-HYDERABAD",
      "name": "Hyderabad Malkaram / Gajwel 765kV Hub",
      "city": "Malkaram / Hyderabad",
      "district": "Hyderabad / Malkaram",
      "state": "Telangana",
      "pincode": "500097",
      "postalOffice": "Malkaram Post Office, Rangareddy / Medchal",
      "region": "SR",
      "type": "substation",
      "voltage": "765kV / 400kV",
      "lat": 17.55,
      "lon": 78.7,
      "capacityMW": 6000,
      "currentMW": 5300,
      "status": "healthy",
      "operator": "POWERGRID / TSTRANSCO",
      "notes": "High-voltage ring substation stabilizing Hyderabad pharma and cyber city demand.",
      "transformers": [
        {
          "id": "XFMR-HYD-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 85,
          "oilTempC": 53.5,
          "windingTempC": 63,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "SR-THRISSUR",
      "name": "Thrissur Madakkathara ±320kV VSC HVDC Hub",
      "city": "Thrissur",
      "district": "Thrissur (Madakkathara)",
      "state": "Kerala",
      "pincode": "680008",
      "postalOffice": "Madakkathara Post Office, Thrissur",
      "region": "SR",
      "type": "hvdc_hub",
      "voltage": "±320kV VSC-HVDC / 400kV",
      "lat": 10.55,
      "lon": 76.25,
      "capacityMW": 2000,
      "currentMW": 1780,
      "status": "healthy",
      "operator": "POWERGRID / KSEB",
      "notes": "India’s first Voltage Source Converter (VSC) HVDC link connecting Pugalur to Kerala.",
      "transformers": [
        {
          "id": "XFMR-THRI-CONV1",
          "name": "±320kV VSC Converter Transformer",
          "type": "Converter XFMR",
          "ratingMVA": 450,
          "primaryKV": 400,
          "secondaryKV": 165,
          "loadPercent": 87,
          "oilTempC": 56,
          "windingTempC": 66.5,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "ER-TALCHER",
      "name": "Talcher Super Thermal & HVDC Terminal",
      "city": "Talcher",
      "district": "Angul (Talcher)",
      "state": "Odisha",
      "pincode": "759147",
      "postalOffice": "Talcher Thermal Post Office, Angul",
      "region": "ER",
      "type": "hvdc_hub",
      "voltage": "±500kV HVDC / 400kV",
      "lat": 20.95,
      "lon": 85.22,
      "capacityMW": 3000,
      "currentMW": 2820,
      "status": "healthy",
      "operator": "NTPC / PGCIL ER-II",
      "notes": "Origin of the ±500kV HVDC East-South power highway to Kolar (2,500 MW).",
      "transformers": [
        {
          "id": "XFMR-TAL-CONV1",
          "name": "±500kV Rectifier Transformer Pole-1",
          "type": "Converter XFMR",
          "ratingMVA": 625,
          "primaryKV": 400,
          "secondaryKV": 210,
          "loadPercent": 90,
          "oilTempC": 59,
          "windingTempC": 70,
          "dgaStatus": "Normal",
          "tapPosition": 11,
          "status": "healthy",
          "cooling": "ODAF"
        },
        {
          "id": "XFMR-TAL-GT1",
          "name": "500MW Unit-5 Generator Transformer",
          "type": "GT",
          "ratingMVA": 600,
          "primaryKV": 21,
          "secondaryKV": 400,
          "loadPercent": 92,
          "oilTempC": 55,
          "windingTempC": 65,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC",
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "ER-FARAKKA",
      "name": "Farakka Super Thermal Power Plant",
      "city": "Farakka",
      "district": "Murshidabad (Farakka)",
      "state": "West Bengal",
      "pincode": "742212",
      "postalOffice": "NTPC Farakka Post Office",
      "region": "ER",
      "type": "thermal_plant",
      "voltage": "400kV",
      "lat": 24.81,
      "lon": 87.9,
      "capacityMW": 2100,
      "currentMW": 1980,
      "status": "healthy",
      "operator": "NTPC Eastern Region-I",
      "notes": "Major Eastern grid generation hub on the Ganga River supplying WB, Bihar, and Jharkhand.",
      "transformers": [
        {
          "id": "XFMR-FAR-GT1",
          "name": "500MW Unit-6 Generator Transformer",
          "type": "GT",
          "ratingMVA": 600,
          "primaryKV": 21,
          "secondaryKV": 400,
          "loadPercent": 91,
          "oilTempC": 54,
          "windingTempC": 64,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC",
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "ER-SASARAM",
      "name": "Sasaram 765kV & HVDC Back-to-Back Hub",
      "city": "Sasaram",
      "district": "Rohtas (Sasaram)",
      "state": "Bihar",
      "pincode": "821115",
      "postalOffice": "Sasaram Head Post Office",
      "region": "ER",
      "type": "hvdc_terminal",
      "voltage": "765kV / 400kV / HVDC 500MW",
      "lat": 24.95,
      "lon": 84.03,
      "capacityMW": 4500,
      "currentMW": 3950,
      "status": "healthy",
      "operator": "POWERGRID (PGCIL ER-I)",
      "notes": "Strategic inter-regional node connecting Eastern coal plants to Northern demand.",
      "transformers": [
        {
          "id": "XFMR-SAS-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 82,
          "oilTempC": 51,
          "windingTempC": 60.5,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "ER-RANCHI",
      "name": "Ranchi 765kV Super Pooling Substation",
      "city": "Ranchi",
      "district": "Ranchi",
      "state": "Jharkhand",
      "pincode": "834001",
      "postalOffice": "Ranchi Head Post Office",
      "region": "ER",
      "type": "substation",
      "voltage": "765kV / 400kV",
      "lat": 23.3441,
      "lon": 85.3096,
      "capacityMW": 5000,
      "currentMW": 4300,
      "status": "healthy",
      "operator": "POWERGRID (PGCIL ER-I)",
      "notes": "Core 765kV pooling hub routing power between Raigarh (WR), Gaya, and Durgapur.",
      "transformers": [
        {
          "id": "XFMR-RAN-ICT1",
          "name": "765/400kV ICT-1",
          "type": "ICT",
          "ratingMVA": 1500,
          "primaryKV": 765,
          "secondaryKV": 400,
          "loadPercent": 83.5,
          "oilTempC": 52,
          "windingTempC": 62,
          "dgaStatus": "Normal",
          "tapPosition": 9,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "BBMB_DVC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "ER-DURGAPUR",
      "name": "Durgapur 400kV Grid Substation",
      "city": "Durgapur",
      "district": "Paschim Bardhaman (Durgapur)",
      "state": "West Bengal",
      "pincode": "713201",
      "postalOffice": "Durgapur City Centre Post Office",
      "region": "ER",
      "type": "substation",
      "voltage": "400kV / 220kV / 132kV",
      "lat": 23.5204,
      "lon": 87.3119,
      "capacityMW": 3500,
      "currentMW": 3100,
      "status": "healthy",
      "operator": "Damodar Valley Corp (DVC) / PGCIL",
      "notes": "Damodar Valley powerhouse industrial hub feeding steel and heavy metallurgy.",
      "transformers": [
        {
          "id": "XFMR-DUR-ICT1",
          "name": "400/220kV ICT-1",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 220,
          "loadPercent": 86,
          "oilTempC": 53,
          "windingTempC": 62.5,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "BBMB_DVC",
      "operatorIds": [
        "BBMB_DVC",
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "ER-BARH",
      "name": "NTPC Barh Super Thermal Power Station",
      "city": "Barh / Patna",
      "district": "Patna (Barh)",
      "state": "Bihar",
      "pincode": "803213",
      "postalOffice": "Barh Sub Post Office, Patna",
      "region": "ER",
      "type": "thermal_plant",
      "voltage": "765kV / 400kV",
      "lat": 25.48,
      "lon": 85.71,
      "capacityMW": 3300,
      "currentMW": 3150,
      "status": "healthy",
      "operator": "NTPC Limited",
      "notes": "Ultra-modern 3,300 MW supercritical thermal power station on the Ganga basin.",
      "transformers": [
        {
          "id": "XFMR-BAR-GT1",
          "name": "660MW Supercritical Unit-1 GT",
          "type": "GT",
          "ratingMVA": 750,
          "primaryKV": 22,
          "secondaryKV": 765,
          "loadPercent": 93.5,
          "oilTempC": 56,
          "windingTempC": 66.5,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "ER-ALIPURDUAR",
      "name": "Alipurduar 400kV Inter-Regional Terminal",
      "city": "Alipurduar",
      "district": "Alipurduar",
      "state": "West Bengal",
      "pincode": "736121",
      "postalOffice": "Alipurduar Head Post Office",
      "region": "ER",
      "type": "substation",
      "voltage": "400kV / 220kV / ±800kV HVDC",
      "lat": 26.49,
      "lon": 89.52,
      "capacityMW": 4000,
      "currentMW": 3400,
      "status": "healthy",
      "operator": "POWERGRID (PGCIL ER-II)",
      "notes": "Strategic gateway connecting North-Eastern Region hydro energy to the National Grid.",
      "transformers": [
        {
          "id": "XFMR-ALI-ICT1",
          "name": "400/220kV ICT-1",
          "type": "ICT",
          "ratingMVA": 500,
          "primaryKV": 400,
          "secondaryKV": 220,
          "loadPercent": 82,
          "oilTempC": 50,
          "windingTempC": 58.5,
          "dgaStatus": "Normal",
          "tapPosition": 8,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "ER-TEESTA",
      "name": "Teesta-V Hydroelectric Station",
      "city": "Singtam",
      "district": "East Sikkim (Gangtok)",
      "state": "Sikkim",
      "pincode": "737134",
      "postalOffice": "Singtam Post Office, East Sikkim",
      "region": "ER",
      "type": "hydro_plant",
      "voltage": "400kV",
      "lat": 27.23,
      "lon": 88.5,
      "capacityMW": 510,
      "currentMW": 490,
      "status": "healthy",
      "operator": "NHPC Limited",
      "notes": "Run-of-the-river hydro plant with 3x170 MW units harnessing the Teesta River in Sikkim.",
      "transformers": [
        {
          "id": "XFMR-TEE-GT1",
          "name": "170MW Unit GT-1",
          "type": "GT",
          "ratingMVA": 200,
          "primaryKV": 13.8,
          "secondaryKV": 400,
          "loadPercent": 92,
          "oilTempC": 47,
          "windingTempC": 56,
          "dgaStatus": "Normal",
          "tapPosition": 6,
          "status": "healthy",
          "cooling": "OFAF"
        }
      ],
      "operatorId": "NHPC_SJVN",
      "operatorIds": [
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NER-BISWANATH",
      "name": "Biswanath Chariali ±800kV UHVDC Hub",
      "city": "Biswanath Chariali",
      "district": "Biswanath (Chariali)",
      "state": "Assam",
      "pincode": "784176",
      "postalOffice": "Biswanath Chariali Head Post Office",
      "region": "NER",
      "type": "hvdc_hub",
      "voltage": "±800kV UHVDC / 400kV",
      "lat": 26.73,
      "lon": 93.15,
      "capacityMW": 6000,
      "currentMW": 4800,
      "status": "healthy",
      "operator": "POWERGRID (PGCIL NER)",
      "notes": "Origin terminal of the 1,728 km ±800 kV UHVDC multi-terminal line to Agra (NR).",
      "transformers": [
        {
          "id": "XFMR-BIS-CONV1",
          "name": "±800kV Rectifier Transformer Bay-1",
          "type": "Converter XFMR",
          "ratingMVA": 600,
          "primaryKV": 400,
          "secondaryKV": 333.4,
          "loadPercent": 85,
          "oilTempC": 58,
          "windingTempC": 68,
          "dgaStatus": "Normal",
          "tapPosition": 10,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NER-SUBANSIRI",
      "name": "Subansiri Lower Hydroelectric Project (2.0GW)",
      "city": "Gerukamukh",
      "district": "Lower Subansiri (Gerukamukh)",
      "state": "Arunachal / Assam",
      "pincode": "787059",
      "postalOffice": "Gerukamukh Sub Post Office",
      "region": "NER",
      "type": "hydro_plant",
      "voltage": "400kV AC",
      "lat": 27.55,
      "lon": 94.26,
      "capacityMW": 2000,
      "currentMW": 1850,
      "status": "healthy",
      "operator": "NHPC Limited",
      "notes": "India’s largest single hydroelectric powerhouse under development with 8x250 MW units.",
      "transformers": [
        {
          "id": "XFMR-SUB-GT1",
          "name": "250MW Unit Step-Up GT",
          "type": "GT",
          "ratingMVA": 280,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 91,
          "oilTempC": 49,
          "windingTempC": 58,
          "dgaStatus": "Normal",
          "tapPosition": 6,
          "status": "healthy",
          "cooling": "OFAF"
        }
      ],
      "operatorId": "NHPC_SJVN",
      "operatorIds": [
        "NHPC_SJVN",
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NER-LOKTAK",
      "name": "Loktak Hydroelectric Station",
      "city": "Komkeirap",
      "district": "Bishnupur (Loktak)",
      "state": "Manipur",
      "pincode": "795126",
      "postalOffice": "Bishnupur Head Post Office",
      "region": "NER",
      "type": "hydro_plant",
      "voltage": "132kV / 220kV",
      "lat": 24.55,
      "lon": 93.8,
      "capacityMW": 105,
      "currentMW": 98,
      "status": "healthy",
      "operator": "NHPC Limited",
      "notes": "Vital generation station supplying clean power to Manipur, Nagaland, and Mizoram.",
      "transformers": [
        {
          "id": "XFMR-LOK-GT1",
          "name": "35MW Generator Transformer",
          "type": "GT",
          "ratingMVA": 45,
          "primaryKV": 11,
          "secondaryKV": 132,
          "loadPercent": 89,
          "oilTempC": 45,
          "windingTempC": 53,
          "dgaStatus": "Normal",
          "tapPosition": 5,
          "status": "healthy",
          "cooling": "ONAF"
        }
      ],
      "operatorId": "NHPC_SJVN",
      "operatorIds": [
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "NER-BONGAIGAON",
      "name": "Bongaigaon 400kV Thermal & Grid Hub",
      "city": "Salakati",
      "district": "Chirang (Bongaigaon)",
      "state": "Assam",
      "pincode": "783380",
      "postalOffice": "Salakati Sub Post Office, Bongaigaon",
      "region": "NER",
      "type": "thermal_plant",
      "voltage": "400kV / 220kV",
      "lat": 26.5,
      "lon": 90.55,
      "capacityMW": 750,
      "currentMW": 710,
      "status": "healthy",
      "operator": "NTPC NER / PGCIL",
      "notes": "Pit-head thermal generation station anchoring North-East grid stability.",
      "transformers": [
        {
          "id": "XFMR-BON-GT1",
          "name": "250MW Unit-3 Step-Up GT",
          "type": "GT",
          "ratingMVA": 280,
          "primaryKV": 15.75,
          "secondaryKV": 400,
          "loadPercent": 92,
          "oilTempC": 52,
          "windingTempC": 61,
          "dgaStatus": "Normal",
          "tapPosition": 7,
          "status": "healthy",
          "cooling": "ODAF"
        }
      ],
      "operatorId": "NTPC",
      "operatorIds": [
        "NTPC",
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    }
  ],
  "corridors": [
    {
      "id": "LINE-HVDC-RAI-PUG",
      "name": "Raigarh–Pugalur ±800kV UHVDC Bulk Highway",
      "from": "WR-RAIGARH",
      "to": "SR-PUGALUR",
      "type": "HVDC",
      "voltage": "±800 kV",
      "distanceKm": 1830,
      "capacityMW": 6000,
      "currentFlowMW": 5200,
      "status": "compromised",
      "direction": "WR → SR (Western to Southern Grid)",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-HVDC-CHA-KUR",
      "name": "Champa–Kurukshetra ±800kV HVDC Highway",
      "from": "WR-CHAMPA",
      "to": "NR-KURUK",
      "type": "HVDC",
      "voltage": "±800 kV",
      "distanceKm": 1287,
      "capacityMW": 3000,
      "currentFlowMW": 2650,
      "status": "healthy",
      "direction": "WR → NR (Western to Northern Grid)",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-HVDC-TAL-KOL",
      "name": "Talcher–Kolar ±500kV HVDC East-South Highway",
      "from": "ER-TALCHER",
      "to": "SR-KOLAR",
      "type": "HVDC",
      "voltage": "±500 kV",
      "distanceKm": 1450,
      "capacityMW": 2500,
      "currentFlowMW": 2150,
      "status": "healthy",
      "direction": "ER → SR (Eastern to Southern Grid)",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-HVDC-BIS-AGR",
      "name": "Biswanath Chariali–Agra ±800kV Multi-Terminal UHVDC",
      "from": "NER-BISWANATH",
      "to": "NR-AGRA",
      "type": "HVDC",
      "voltage": "±800 kV",
      "distanceKm": 1728,
      "capacityMW": 6000,
      "currentFlowMW": 4800,
      "status": "healthy",
      "direction": "NER → NR (North-East to Northern Grid)",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-HVDC-RIH-DEL",
      "name": "Rihand–Dadri ±500kV HVDC Bulk Transmission",
      "from": "NR-RIHAND",
      "to": "NR-DELHI",
      "type": "HVDC",
      "voltage": "±500 kV",
      "distanceKm": 814,
      "capacityMW": 1500,
      "currentFlowMW": 1350,
      "status": "healthy",
      "direction": "NR Singrauli → Delhi NCR",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC",
        "STATE_TRANSCOS",
        "TATA"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-HVDC-PUG-THRI",
      "name": "Pugalur–Thrissur ±320kV VSC HVDC Link",
      "from": "SR-PUGALUR",
      "to": "SR-THRISSUR",
      "type": "HVDC",
      "voltage": "±320 kV",
      "distanceKm": 165,
      "capacityMW": 2000,
      "currentFlowMW": 1780,
      "status": "healthy",
      "direction": "SR Tamil Nadu → Kerala",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-HVDC-BHA-SR",
      "name": "Bhadrawati 1000MW HVDC Back-to-Back Link",
      "from": "WR-BHADRAWATI",
      "to": "SR-RAMAGUNDAM",
      "type": "HVDC",
      "voltage": "±205 kV",
      "distanceKm": 180,
      "capacityMW": 1000,
      "currentFlowMW": 950,
      "status": "healthy",
      "direction": "WR → SR Synchronous Tie",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-HVDC-GAZ-ER",
      "name": "Gazuwaka 1000MW HVDC Back-to-Back Interconnection",
      "from": "ER-TALCHER",
      "to": "SR-GAZUWAKA",
      "type": "HVDC",
      "voltage": "±205 kV",
      "distanceKm": 460,
      "capacityMW": 1000,
      "currentFlowMW": 940,
      "status": "healthy",
      "direction": "ER → SR Coastal Corridor",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-HVDC-SAS-NR",
      "name": "Sasaram 500MW HVDC Back-to-Back Link",
      "from": "ER-SASARAM",
      "to": "NR-SINGRAULI",
      "type": "HVDC",
      "voltage": "±205 kV",
      "distanceKm": 190,
      "capacityMW": 500,
      "currentFlowMW": 480,
      "status": "healthy",
      "direction": "ER → NR Inter-Regional Feed",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-RAI-WRD",
      "name": "Raigarh–Wardha 765kV Super-Grid Line",
      "from": "WR-RAIGARH",
      "to": "WR-WARDHA",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 420,
      "capacityMW": 4500,
      "currentFlowMW": 3800,
      "status": "healthy",
      "direction": "Bidirectional (WR Grid)",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-WRD-SOL",
      "name": "Wardha–Solapur 765kV Inter-State Link",
      "from": "WR-WARDHA",
      "to": "WR-SOLAPUR",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 380,
      "capacityMW": 4500,
      "currentFlowMW": 3600,
      "status": "healthy",
      "direction": "WR Maharashtra Backbone",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-SOL-HYD",
      "name": "Solapur–Hyderabad (Malkaram) 765kV Inter-Regional",
      "from": "WR-SOLAPUR",
      "to": "SR-HYDERABAD",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 310,
      "capacityMW": 4000,
      "currentFlowMW": 3200,
      "status": "healthy",
      "direction": "WR → SR Synchronized Corridor",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-HYD-PAV",
      "name": "Hyderabad–Pavagada 765kV Solar Power Line",
      "from": "SR-HYDERABAD",
      "to": "SR-PAVAGADA",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 410,
      "capacityMW": 4000,
      "currentFlowMW": 3100,
      "status": "healthy",
      "direction": "SR Inter-State Backbone",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS",
        "TATA",
        "RENEW_GREENKO"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-VIN-AGR",
      "name": "Vindhyachal–Agra 765kV Double Circuit Highway",
      "from": "WR-VINDHYA",
      "to": "NR-AGRA",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 650,
      "capacityMW": 5000,
      "currentFlowMW": 4300,
      "status": "healthy",
      "direction": "WR → NR Bulk Feed",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-AGR-DEL",
      "name": "Agra–Delhi Dadri 765kV High-Capacity Feeder",
      "from": "NR-AGRA",
      "to": "NR-DELHI",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 185,
      "capacityMW": 4500,
      "currentFlowMW": 3950,
      "status": "healthy",
      "direction": "NR Regional Demand Injection",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS",
        "TATA"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-AGR-MEE",
      "name": "Agra–Meerut 765kV National Capital Ring",
      "from": "NR-AGRA",
      "to": "NR-MEERUT",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 220,
      "capacityMW": 4000,
      "currentFlowMW": 3400,
      "status": "healthy",
      "direction": "NR Ring Synchronization",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-MEE-TEH",
      "name": "Meerut–Tehri 765kV Hydro Evacuation Link",
      "from": "NR-MEERUT",
      "to": "NR-TEHRI",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 195,
      "capacityMW": 3500,
      "currentFlowMW": 2800,
      "status": "healthy",
      "direction": "Hydro Peaking to NCR",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS",
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-FAT-BHD",
      "name": "Fatehgarh–Bhadla 765kV Green Energy Corridor",
      "from": "NR-FATEHGARH",
      "to": "NR-BHADLA",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 140,
      "capacityMW": 4500,
      "currentFlowMW": 4100,
      "status": "healthy",
      "direction": "Solar Evacuation",
      "operatorId": "ADANI",
      "operatorIds": [
        "PGCIL",
        "ADANI",
        "RENEW_GREENKO"
      ],
      "ownershipType": "private"
    },
    {
      "id": "LINE-765-BHD-BIK",
      "name": "Bhadla–Bikaner 765kV Green Corridor Backbone",
      "from": "NR-BHADLA",
      "to": "NR-BIKANER",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 160,
      "capacityMW": 4500,
      "currentFlowMW": 3900,
      "status": "healthy",
      "direction": "Solar to Northern Grid",
      "operatorId": "STERLITE_INDGRID",
      "operatorIds": [
        "PGCIL",
        "STERLITE_INDGRID",
        "RENEW_GREENKO",
        "ADANI"
      ],
      "ownershipType": "private"
    },
    {
      "id": "LINE-765-BIK-KUR",
      "name": "Bikaner–Kurukshetra 765kV Inter-State Feed",
      "from": "NR-BIKANER",
      "to": "NR-KURUK",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 380,
      "capacityMW": 4000,
      "currentFlowMW": 3300,
      "status": "healthy",
      "direction": "Rajasthan → Haryana",
      "operatorId": "STERLITE_INDGRID",
      "operatorIds": [
        "PGCIL",
        "STERLITE_INDGRID",
        "RENEW_GREENKO",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "private"
    },
    {
      "id": "LINE-765-KHA-MUN",
      "name": "Khavda–Mundra 765kV Coastal Energy Corridor",
      "from": "WR-KHAVDA",
      "to": "WR-MUNDRA",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 130,
      "capacityMW": 4500,
      "currentFlowMW": 3900,
      "status": "healthy",
      "direction": "Kutch Green Power",
      "operatorId": "ADANI",
      "operatorIds": [
        "PGCIL",
        "ADANI",
        "TATA"
      ],
      "ownershipType": "private"
    },
    {
      "id": "LINE-765-SAS-KAN",
      "name": "Sasan–Kanpur Mainpuri 765kV Bulk Line",
      "from": "WR-SASAN",
      "to": "NR-KANPUR",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 420,
      "capacityMW": 4000,
      "currentFlowMW": 3450,
      "status": "healthy",
      "direction": "MP → UP Supergrid",
      "operatorId": "RELIANCE_JSW",
      "operatorIds": [
        "PGCIL",
        "RELIANCE_JSW",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "private"
    },
    {
      "id": "LINE-765-RAN-SAS",
      "name": "Ranchi–Sasaram–Gaya 765kV Corridor",
      "from": "ER-RANCHI",
      "to": "ER-SASARAM",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 240,
      "capacityMW": 4000,
      "currentFlowMW": 3200,
      "status": "healthy",
      "direction": "Jharkhand → Bihar",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "BBMB_DVC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-765-BAR-RAN",
      "name": "Barh–Ranchi 765kV Super-Grid Link",
      "from": "ER-BARH",
      "to": "ER-RANCHI",
      "type": "765kV_AC",
      "voltage": "765 kV AC",
      "distanceKm": 260,
      "capacityMW": 4000,
      "currentFlowMW": 3100,
      "status": "healthy",
      "direction": "Bihar Thermal Export",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC",
        "BBMB_DVC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-DEL-KUR",
      "name": "Delhi–Kurukshetra 400kV Synchronous Line",
      "from": "NR-DELHI",
      "to": "NR-KURUK",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 160,
      "capacityMW": 1800,
      "currentFlowMW": 1450,
      "status": "healthy",
      "direction": "Delhi ↔ Haryana",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS",
        "TATA"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-KUR-BHK",
      "name": "Kurukshetra–Bhakra Nangal 400kV Line",
      "from": "NR-KURUK",
      "to": "NR-BHAKRA",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 175,
      "capacityMW": 1600,
      "currentFlowMW": 1200,
      "status": "healthy",
      "direction": "Punjab Hydro Export",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS",
        "BBMB_DVC",
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-BHK-NAT",
      "name": "Bhakra–Nathpa Jhakri 400kV Mountain Ring",
      "from": "NR-BHAKRA",
      "to": "NR-NATHPA",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 135,
      "capacityMW": 1500,
      "currentFlowMW": 1250,
      "status": "healthy",
      "direction": "HP Hydro Cascade",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "BBMB_DVC",
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-NAT-SAL",
      "name": "Nathpa Jhakri–Salal 400kV Northern Himalayan Tie",
      "from": "NR-NATHPA",
      "to": "NR-SALAL",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 340,
      "capacityMW": 1200,
      "currentFlowMW": 980,
      "status": "healthy",
      "direction": "HP ↔ J&K Grid",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-RAW-AGR",
      "name": "Rawatbhata Nuclear–Agra 400kV Feeder",
      "from": "NR-RAWAT",
      "to": "NR-AGRA",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 360,
      "capacityMW": 1500,
      "currentFlowMW": 1280,
      "status": "healthy",
      "direction": "Nuclear Baseload",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-NAR-DEL",
      "name": "Narora Nuclear–Delhi 400kV Link",
      "from": "NR-NARORA",
      "to": "NR-DELHI",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 140,
      "capacityMW": 1200,
      "currentFlowMW": 920,
      "status": "healthy",
      "direction": "UP ↔ Delhi Ring",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NPCIL",
        "STATE_TRANSCOS",
        "TATA"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-TAP-WRD",
      "name": "Tarapur Nuclear–Wardha 400kV Corridor",
      "from": "WR-TARAPUR",
      "to": "WR-WARDHA",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 650,
      "capacityMW": 1800,
      "currentFlowMW": 1420,
      "status": "healthy",
      "direction": "Coastal Nuclear Baseload",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NPCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-KAK-SAR",
      "name": "Kakrapar Nuclear–Sardar Sarovar 400kV Link",
      "from": "WR-KAKRAPAR",
      "to": "WR-SARDAR",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 90,
      "capacityMW": 1600,
      "currentFlowMW": 1350,
      "status": "healthy",
      "direction": "Gujarat Clean Baseload",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NPCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-SAR-MUD",
      "name": "Sardar Sarovar–Mundra 400kV Line",
      "from": "WR-SARDAR",
      "to": "WR-MUNDRA",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 440,
      "capacityMW": 1600,
      "currentFlowMW": 1280,
      "status": "healthy",
      "direction": "Gujarat West Grid",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS",
        "ADANI",
        "TATA"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-KOY-SOL",
      "name": "Koyna Hydro–Solapur 400kV Peaking Line",
      "from": "WR-KOYNA",
      "to": "WR-SOLAPUR",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 230,
      "capacityMW": 1800,
      "currentFlowMW": 1450,
      "status": "healthy",
      "direction": "Maharashtra Hydro Dispatch",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-KOR-RAI",
      "name": "Korba Thermal–Raigarh 400kV Evacuation Line",
      "from": "WR-KORBA",
      "to": "WR-RAIGARH",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 110,
      "capacityMW": 2000,
      "currentFlowMW": 1750,
      "status": "healthy",
      "direction": "Chhattisgarh Thermal Pooling",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-REW-VIN",
      "name": "Rewa Solar–Vindhyachal 400kV Link",
      "from": "WR-REWA",
      "to": "WR-VINDHYA",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 145,
      "capacityMW": 1400,
      "currentFlowMW": 1100,
      "status": "healthy",
      "direction": "MP Solar Evacuation",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "RENEW_GREENKO",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-KUD-PUG",
      "name": "Kudankulam Nuclear–Pugalur 400kV Line",
      "from": "SR-KUDANKULAM",
      "to": "SR-PUGALUR",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 340,
      "capacityMW": 2000,
      "currentFlowMW": 1850,
      "status": "healthy",
      "direction": "Nuclear Baseload",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-MUP-KUD",
      "name": "Muppandal Wind–Kudankulam 400kV Green Line",
      "from": "SR-MUPPANDAL",
      "to": "SR-KUDANKULAM",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 35,
      "capacityMW": 1500,
      "currentFlowMW": 1280,
      "status": "healthy",
      "direction": "Southern Wind Injection",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "RENEW_GREENKO",
        "STATE_TRANSCOS",
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-PAV-BEN",
      "name": "Pavagada Solar–Bengaluru Hoodi 400kV Feeder",
      "from": "SR-PAVAGADA",
      "to": "SR-BENGALURU",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 140,
      "capacityMW": 2000,
      "currentFlowMW": 1850,
      "status": "healthy",
      "direction": "Clean Solar to IT Capital",
      "operatorId": "TATA",
      "operatorIds": [
        "PGCIL",
        "TATA",
        "STATE_TRANSCOS",
        "RENEW_GREENKO"
      ],
      "ownershipType": "private"
    },
    {
      "id": "LINE-400-BEN-KOL",
      "name": "Bengaluru–Kolar 400kV Metropolitan Feeder",
      "from": "SR-BENGALURU",
      "to": "SR-KOLAR",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 75,
      "capacityMW": 2000,
      "currentFlowMW": 1750,
      "status": "healthy",
      "direction": "Kolar HVDC Intake",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-KAI-BEN",
      "name": "Kaiga Nuclear–Bengaluru 400kV Western Ghats Link",
      "from": "SR-KAIGA",
      "to": "SR-BENGALURU",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 390,
      "capacityMW": 1400,
      "currentFlowMW": 1180,
      "status": "healthy",
      "direction": "Nuclear Baseload",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NPCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-KAL-SRI",
      "name": "Kalpakkam Nuclear–Sriperumbudur 400kV Link",
      "from": "SR-KALPAKKAM",
      "to": "SR-SRIPERUM",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 65,
      "capacityMW": 1200,
      "currentFlowMW": 950,
      "status": "healthy",
      "direction": "Chennai Grid Base Feed",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS",
        "NPCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-NEY-PUG",
      "name": "Neyveli Lignite–Pugalur 400kV Inter-State Link",
      "from": "SR-NEYVELI",
      "to": "SR-PUGALUR",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 180,
      "capacityMW": 1800,
      "currentFlowMW": 1550,
      "status": "healthy",
      "direction": "Tamil Nadu Baseload",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-KUR-SRI",
      "name": "Kurnool Solar–Srisailam Hydro 400kV Hybrid Line",
      "from": "SR-KURNOOL",
      "to": "SR-SRISAILAM",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 95,
      "capacityMW": 1500,
      "currentFlowMW": 1250,
      "status": "healthy",
      "direction": "AP Solar & Hydro Balance",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "RENEW_GREENKO",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-SRI-HYD",
      "name": "Srisailam Hydro–Hyderabad 400kV Peaking Line",
      "from": "SR-SRISAILAM",
      "to": "SR-HYDERABAD",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 170,
      "capacityMW": 1800,
      "currentFlowMW": 1450,
      "status": "healthy",
      "direction": "Telangana Hydro Dispatch",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-RAM-HYD",
      "name": "Ramagundam Thermal–Hyderabad 400kV Double Circuit",
      "from": "SR-RAMAGUNDAM",
      "to": "SR-HYDERABAD",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 210,
      "capacityMW": 2000,
      "currentFlowMW": 1720,
      "status": "healthy",
      "direction": "Telangana Thermal Supply",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-GAZ-TAL",
      "name": "Gazuwaka–Talcher 400kV Coastal Inter-State Line",
      "from": "SR-GAZUWAKA",
      "to": "ER-TALCHER",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 460,
      "capacityMW": 1600,
      "currentFlowMW": 1250,
      "status": "healthy",
      "direction": "Odisha ↔ AP Grid Tie",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-FAR-DUR",
      "name": "Farakka Thermal–Durgapur 400kV Line",
      "from": "ER-FARAKKA",
      "to": "ER-DURGAPUR",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 170,
      "capacityMW": 1800,
      "currentFlowMW": 1450,
      "status": "healthy",
      "direction": "Bengal Industrial Corridor",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC",
        "BBMB_DVC",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-DUR-ALI",
      "name": "Durgapur–Alipurduar 400kV Gateway Line",
      "from": "ER-DURGAPUR",
      "to": "ER-ALIPURDUAR",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 380,
      "capacityMW": 1800,
      "currentFlowMW": 1520,
      "status": "healthy",
      "direction": "North Bengal & NER Link",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "BBMB_DVC",
        "STATE_TRANSCOS"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-ALI-BIS",
      "name": "Alipurduar–Biswanath Chariali 400kV North-East Link",
      "from": "ER-ALIPURDUAR",
      "to": "NER-BISWANATH",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 360,
      "capacityMW": 1800,
      "currentFlowMW": 1450,
      "status": "healthy",
      "direction": "Assam ↔ Bengal Interconnection",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-TEE-ALI",
      "name": "Teesta-V Hydro–Alipurduar 400kV Mountain Line",
      "from": "ER-TEESTA",
      "to": "ER-ALIPURDUAR",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 140,
      "capacityMW": 1200,
      "currentFlowMW": 980,
      "status": "healthy",
      "direction": "Sikkim Hydro Evacuation",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-SUB-BIS",
      "name": "Subansiri Hydro–Biswanath Chariali 400kV Green Highway",
      "from": "NER-SUBANSIRI",
      "to": "NER-BISWANATH",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 145,
      "capacityMW": 2000,
      "currentFlowMW": 1780,
      "status": "healthy",
      "direction": "Arunachal Hydro Pooling",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-BON-BIS",
      "name": "Bongaigaon–Biswanath Chariali 400kV Assam Ring",
      "from": "NER-BONGAIGAON",
      "to": "NER-BISWANATH",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 260,
      "capacityMW": 1400,
      "currentFlowMW": 1100,
      "status": "healthy",
      "direction": "Assam Grid Ring",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NTPC"
      ],
      "ownershipType": "govt_central"
    },
    {
      "id": "LINE-400-LOK-BIS",
      "name": "Loktak Hydro–Biswanath Chariali 132kV/400kV Link",
      "from": "NER-LOKTAK",
      "to": "NER-BISWANATH",
      "type": "400kV_AC",
      "voltage": "400 kV AC",
      "distanceKm": 280,
      "capacityMW": 600,
      "currentFlowMW": 420,
      "status": "healthy",
      "direction": "Manipur Grid Integration",
      "operatorId": "PGCIL",
      "operatorIds": [
        "PGCIL",
        "NHPC_SJVN"
      ],
      "ownershipType": "govt_central"
    }
  ],
  "operators": [
    {
      "id": "PGCIL",
      "name": "Power Grid Corporation of India (POWERGRID)",
      "shortName": "POWERGRID (PGCIL)",
      "firmType": "Govt CPSU (Central Maharatna)",
      "category": "central_govt",
      "badgeClass": "badge-forest",
      "color": "#166534",
      "bgLight": "#f0fdf4",
      "hq": "Gurugram, Haryana",
      "founded": 1989,
      "description": "Central Transmission Utility (CTU) of India operating 85%+ of interstate transmission highways, ±800kV UHVDC terminals, and 765kV super-substations.",
      "website": "www.powergrid.in",
      "circuitKm": "177,000+ ckm",
      "interstateCapacityMW": 118250,
      "substationsCount": 42,
      "corridorsCount": 46
    },
    {
      "id": "NTPC",
      "name": "NTPC Limited",
      "shortName": "NTPC",
      "firmType": "Govt CPSU (Central Maharatna)",
      "category": "central_govt",
      "badgeClass": "badge-forest",
      "color": "#0f766e",
      "bgLight": "#f0fdfa",
      "hq": "New Delhi",
      "founded": 1975,
      "description": "India’s largest power generation conglomerate operating major thermal super-plants, hydro cascades, and ultra-mega solar parks.",
      "website": "www.ntpc.co.in",
      "circuitKm": "Dedicated Evacuation Corridors",
      "interstateCapacityMW": 73000,
      "substationsCount": 14,
      "corridorsCount": 14
    },
    {
      "id": "NPCIL",
      "name": "Nuclear Power Corporation of India (NPCIL)",
      "shortName": "NPCIL",
      "firmType": "Govt PSU (Dept of Atomic Energy)",
      "category": "central_govt",
      "badgeClass": "badge-forest",
      "color": "#0369a1",
      "bgLight": "#f0f9ff",
      "hq": "Mumbai, Maharashtra",
      "founded": 1987,
      "description": "Sole operator of commercial nuclear power stations in India (Kudankulam, Tarapur, Kakrapar, Rawatbhata, Kaiga, Narora) delivering critical baseload.",
      "website": "www.npcil.nic.in",
      "circuitKm": "Dedicated Nuclear 400kV Grid Rings",
      "interstateCapacityMW": 7480,
      "substationsCount": 6,
      "corridorsCount": 6
    },
    {
      "id": "NHPC_SJVN",
      "name": "NHPC, SJVN & THDC (National Hydroelectric Power Corp)",
      "shortName": "NHPC / SJVN / THDC",
      "firmType": "Govt CPSU (Hydro)",
      "category": "central_govt",
      "badgeClass": "badge-forest",
      "color": "#1e40af",
      "bgLight": "#eff6ff",
      "hq": "Faridabad / Shimla",
      "founded": 1975,
      "description": "Premier Himalayan hydro and river-basin power generators (Nathpa Jhakri, Subansiri, Salal, Teesta, Tehri, Loktak).",
      "website": "www.nhpcindia.com",
      "circuitKm": "High-Altitude 400kV Peaking Lines",
      "interstateCapacityMW": 12500,
      "substationsCount": 7,
      "corridorsCount": 8
    },
    {
      "id": "BBMB_DVC",
      "name": "BBMB & Damodar Valley Corporation (DVC)",
      "shortName": "BBMB / DVC",
      "firmType": "Statutory Inter-State Corp",
      "category": "central_govt",
      "badgeClass": "badge-forest",
      "color": "#4338ca",
      "bgLight": "#eef2ff",
      "hq": "Chandigarh / Kolkata",
      "founded": 1948,
      "description": "Historic multipurpose river basin and power transmission corporations anchoring Punjab, Haryana, Rajasthan, Jharkhand, and Bengal grids.",
      "website": "www.bbmb.gov.in",
      "circuitKm": "Northern / Eastern 400kV Backbone",
      "interstateCapacityMW": 8500,
      "substationsCount": 4,
      "corridorsCount": 4
    },
    {
      "id": "ADANI",
      "name": "Adani Energy Solutions & Adani Power / Green",
      "shortName": "Adani Energy Solutions",
      "firmType": "Private Power Conglomerate",
      "category": "private",
      "badgeClass": "badge-gold",
      "color": "#c2410c",
      "bgLight": "#fff7ed",
      "hq": "Ahmedabad, Gujarat",
      "founded": 1996,
      "description": "India’s largest private transmission utility and renewable park developer, operating the Khavda 30GW park, Mundra thermal/solar, and interstate HVDC/765kV concessions.",
      "website": "www.adani.com",
      "circuitKm": "21,100+ ckm",
      "interstateCapacityMW": 25000,
      "substationsCount": 8,
      "corridorsCount": 9
    },
    {
      "id": "TATA",
      "name": "Tata Power Company Limited",
      "shortName": "Tata Power",
      "firmType": "Private Power Pioneer",
      "category": "private",
      "badgeClass": "badge-gold",
      "color": "#b45309",
      "bgLight": "#fefce8",
      "hq": "Mumbai, Maharashtra",
      "founded": 1915,
      "description": "Pioneering integrated private utility with Mundra UMPP, Trombay, Pavagada Solar tranches, and city transmission rings across Mumbai and Delhi.",
      "website": "www.tatapower.com",
      "circuitKm": "5,500+ ckm",
      "interstateCapacityMW": 14000,
      "substationsCount": 6,
      "corridorsCount": 6
    },
    {
      "id": "STERLITE_INDGRID",
      "name": "Sterlite Power & India Grid Trust (IndGrid)",
      "shortName": "Sterlite Power / IndGrid",
      "firmType": "Private Transmission Utility / InvIT",
      "category": "private",
      "badgeClass": "badge-gold",
      "color": "#d97706",
      "bgLight": "#fffbeb",
      "hq": "New Delhi / Pune",
      "founded": 2006,
      "description": "Leading private transmission asset developer delivering complex interstate 765kV/400kV corridors (NRSS, Odisha lines, Bhopal-Dhule).",
      "website": "www.sterlitepower.com",
      "circuitKm": "13,700+ ckm",
      "interstateCapacityMW": 11000,
      "substationsCount": 5,
      "corridorsCount": 7
    },
    {
      "id": "RENEW_GREENKO",
      "name": "ReNew Energy Global & Greenko Group",
      "shortName": "ReNew / Greenko / Azure",
      "firmType": "Private Clean Energy IPPs",
      "category": "private",
      "badgeClass": "badge-gold",
      "color": "#ca8a04",
      "bgLight": "#fef08a",
      "hq": "Gurugram / Hyderabad",
      "founded": 2011,
      "description": "Largest pure-play renewable IPPs in India operating ultra-mega solar and wind farms across Bhadla, Kurnool, Rewa, and Pavagada.",
      "website": "www.renew.com",
      "circuitKm": "Green Energy Evacuation Links",
      "interstateCapacityMW": 18500,
      "substationsCount": 6,
      "corridorsCount": 6
    },
    {
      "id": "RELIANCE_JSW",
      "name": "JSW Energy & Reliance Power",
      "shortName": "JSW Energy / Reliance",
      "firmType": "Private Generation & Transmission",
      "category": "private",
      "badgeClass": "badge-gold",
      "color": "#ea580c",
      "bgLight": "#ffedd5",
      "hq": "Mumbai, Maharashtra",
      "founded": 1994,
      "description": "Major private utilities operating Sasan UMPP, Vijayanagar, Ratnagiri, Barmer, and hydro projects with high-voltage evacuation.",
      "website": "www.jsw.in/energy",
      "circuitKm": "4,000+ ckm",
      "interstateCapacityMW": 12000,
      "substationsCount": 4,
      "corridorsCount": 5
    },
    {
      "id": "STATE_TRANSCOS",
      "name": "State Electricity Transmission Utilities (TRANSCOs / DISCOMs)",
      "shortName": "State TRANSCOs (MSETCL, GETCO, TANTRANSCO, UPPTCL, etc.)",
      "firmType": "State Government Utilities",
      "category": "state_govt",
      "badgeClass": "badge-blue",
      "color": "#4f46e5",
      "bgLight": "#e0e7ff",
      "hq": "Respective State Capitals",
      "founded": 2003,
      "description": "State government transmission and distribution corporations managing intra-state 400kV/220kV rings, city distribution grids, and state load despatch centres (SLDCs).",
      "website": "www.powermin.nic.in",
      "circuitKm": "250,000+ ckm",
      "interstateCapacityMW": 160000,
      "substationsCount": 38,
      "corridorsCount": 30
    }
  ]
};

// Export to window
window.INDIA_GRID_DATA = INDIA_GRID_DATA;
window.INDIA_MAP_DATA = INDIA_GRID_DATA;
