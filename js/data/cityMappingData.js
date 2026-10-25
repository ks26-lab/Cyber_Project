/**
 * GRIDSEC — Verified City to Electrical Bus Network Mappings
 * Explicitly binds Review 1 scheduling city names to known physical substation nodes.
 * 
 * Strict Physical Integrity Rule:
 * If a city has a verified mapping in the active network model, topological inspection is enabled.
 * If no mapping exists, 'Network Mapping Unavailable' is displayed without fabricating connections.
 */

window.CITY_MAPPING_DATA = {
  INDIA_GRID_59: {
    "mumbai": {
      busId: "WR-PADGHE",
      busName: "Padghe / Mumbai 400kV Substation",
      region: "WR",
      state: "Maharashtra",
      lat: 19.34,
      lon: 73.15,
      voltage: "400 kV",
      type: "Bulk Transmission Substation"
    },
    "delhi": {
      busId: "NR-DADRI",
      busName: "Dadri Combined Thermal/Gas Substation",
      region: "NR",
      state: "Delhi NCR / UP",
      lat: 28.55,
      lon: 77.55,
      voltage: "765/400 kV",
      type: "Regional Generation & Transmission Hub"
    },
    "bengaluru": {
      busId: "SR-KOLAR",
      busName: "Kolar / Bengaluru HVDC Terminal",
      region: "SR",
      state: "Karnataka",
      lat: 13.13,
      lon: 78.13,
      voltage: "±500 kV HVDC / 400 kV",
      type: "HVDC Converter Terminal"
    },
    "bangalore": {
      busId: "SR-KOLAR",
      busName: "Kolar / Bengaluru HVDC Terminal",
      region: "SR",
      state: "Karnataka",
      lat: 13.13,
      lon: 78.13,
      voltage: "±500 kV HVDC / 400 kV",
      type: "HVDC Converter Terminal"
    },
    "agra": {
      busId: "NR-AGRA",
      busName: "Agra Multi-Terminal UHVDC Terminal",
      region: "NR",
      state: "Uttar Pradesh",
      lat: 27.18,
      lon: 78.01,
      voltage: "±800 kV UHVDC / 765 kV",
      type: "UHVDC Inverter Terminal"
    },
    "kurukshetra": {
      busId: "NR-KURUK",
      busName: "Kurukshetra HVDC Terminal",
      region: "NR",
      state: "Haryana",
      lat: 29.97,
      lon: 76.88,
      voltage: "±800 kV HVDC / 400 kV",
      type: "HVDC Converter Station"
    },
    "kanpur": {
      busId: "NR-KANPUR",
      busName: "Kanpur / Mainpuri Substation",
      region: "NR",
      state: "Uttar Pradesh",
      lat: 26.45,
      lon: 80.33,
      voltage: "765/400 kV",
      type: "Bulk Transmission Substation"
    },
    "meerut": {
      busId: "NR-MEERUT",
      busName: "Meerut 765kV Substation",
      region: "NR",
      state: "Uttar Pradesh",
      lat: 28.98,
      lon: 77.70,
      voltage: "765/400 kV",
      type: "Bulk Transmission Substation"
    },
    "pune": {
      busId: "WR-PUNE",
      busName: "Pune PG Substation",
      region: "WR",
      state: "Maharashtra",
      lat: 18.52,
      lon: 73.85,
      voltage: "400 kV",
      type: "Transmission Substation"
    },
    "raigarh": {
      busId: "WR-RAIGARH",
      busName: "Raigarh Generation Pooling Substation",
      region: "WR",
      state: "Chhattisgarh",
      lat: 21.90,
      lon: 83.40,
      voltage: "765 kV / ±800 kV HVDC",
      type: "National Super Grid Pooling Hub"
    }
  },

  IEEE_30: {
    "city_a": { busId: "2", busName: "IEEE Bus 2 (Generator / Load)", voltage: "132 kV", type: "PV Bus" },
    "city_b": { busId: "3", busName: "IEEE Bus 3 (Load Bus)", voltage: "132 kV", type: "PQ Bus" },
    "city_c": { busId: "4", busName: "IEEE Bus 4 (Load Bus)", voltage: "132 kV", type: "PQ Bus" },
    "city_d": { busId: "7", busName: "IEEE Bus 7 (Load Bus)", voltage: "132 kV", type: "PQ Bus" },
    "city_e": { busId: "8", busName: "IEEE Bus 8 (Load Bus)", voltage: "132 kV", type: "PQ Bus" }
  },

  getMapping: function(cityName, networkModel = "INDIA_GRID_59") {
    if (!cityName) return null;
    const norm = cityName.toLowerCase().trim();
    const model = (networkModel === 'IEEE_30') ? 'IEEE_30' : 'INDIA_GRID_59';
    const dict = this[model] || this.INDIA_GRID_59;
    return dict[norm] || null;
  }
};
