// =====================================================
// NZ EMERGENCIES MAP - CLEAN, OPTIMISED, ERROR-PROOF VERSION
// =====================================================

// ===============================
// DATA SOURCES (RAW GITHUB FILES)
// ===============================

const CALLS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-data/main/calls.json";

const STATIONS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-map/main/stations.json";

const HYDRANTS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-map/main/hydrants.json";

// Calls remain visible for X days
const MAX_CALL_AGE_DAYS = 7;


// ===============================
// MAP INITIALISATION
// ===============================

const map = L.map("map").setView([-41.2, 174.7], 6); // Center on NZ

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// ===============================
// LAYERS
// ===============================

const fireLayer = L.layerGroup().addTo(map);
const amboLayer = L.layerGroup().addTo(map);
const stationLayer = L.layerGroup().addTo(map);
const hydrantLayer = L.layerGroup(); // added/removed with zoom


// ===============================
// ICON HELPER FUNCTION
// ===============================

function makeIcon(filename) {
  return L.icon({
    iconUrl: `icons/${filename}`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
  });
}


// ===============================
// ICON CACHE (MATCHES EXACT FILENAMES)
// ===============================

const iconCache = {
  // 🔥 FIRE CALL ICONS
  STRU: makeIcon("housefire.PNG"),
  MIN: makeIcon("MIN.PNG"),
  MVC: makeIcon("MVC.PNG"),
  VEG: makeIcon("VEG.PNG"),
  MED: makeIcon("MED.PNG"),
  HAZ: makeIcon("HAZ.PNG"),
  NAT: makeIcon("NAT.PNG"),
  ALARM: makeIcon("Alarm.PNG"),
  FIREALM: makeIcon("Alarm.PNG"),

  FIRE_FALLBACK: makeIcon("Alarm.PNG"),

  // 🚑 AMBULANCE COLOUR CALLS
  RED: makeIcon("RED.PNG"),
  ORANGE: makeIcon("Orange.PNG"),
  GREEN: makeIcon("Green.PNG"),
  PURPLE: makeIcon("purple.PNG"),

  AMBO_FALLBACK: makeIcon("Green.PNG"),

  // 🚒 STATIONS
  FIRE_STATION: makeIcon("firestation.png"),
  AMBO_STATION: makeIcon("ambostation.png")
};


// ===============================
// HELPER FUNCTIONS
// ===============================

// Ambulance call types
function isAmbulanceColor(type) {
  type = (type || "").toUpperCase();
  return ["RED", "ORANGE", "GREEN", "PURPLE"].includes(type);
}

// Select correct icon
function getIcon(call) {
  const t = (call.type || "").toUpperCase();

  if (isAmbulanceColor(t)) return iconCache[t] || iconCache.AMBO_FALLBACK;

  return iconCache[t] || iconCache.FIRE_FALLBACK;
}

// Keep only recent calls
function isRecent(timestamp) {
  if (!timestamp) return true;
  const ts = new Date(timestamp);
  if (isNaN(ts)) return true;

  const ageMs = Date.now() - ts.getTime();
  const maxMs = MAX_CALL_AGE_DAYS * 24 * 60 * 60 * 1000;
  return ageMs < maxMs;
}


// ===============================
// LOAD CALLS
// ===============================

async function loadCalls() {
  try {
    const res = await fetch(CALLS_URL);
    const calls = await res.json();

    fireLayer.clearLayers();
    amboLayer.clearLayers();

    calls.forEach(call => {
      if (!call.lat || !call.lon) return;
      if (!isRecent(call.timestamp)) return;

      const marker = L.marker([call.lat, call.lon], {
        icon: getIcon(call)
      }).bindPopup(`
        <b>${call.type}</b><br>
        ${call.address || ""}<br>
        ${call.station || ""}<br>
        <i>${call.timestamp || ""}</i>
      `);

      if (isAmbulanceColor(call.type))
        marker.addTo(amboLayer);
      else
        marker.addTo(fireLayer);
    });

  } catch (err) {
    console.error("ERROR loading calls.json:", err);
  }
}


// ===============================
// LOAD STATIONS
// ===============================

async function loadStations() {
  try {
    const res = await fetch(STATIONS_URL);
    const stations = await res.json();

    stationLayer.clearLayers();

    stations.forEach(s => {
      if (!s.lat || !s.lon) return;

      const icon =
        s.type === "AMBO"
          ? iconCache.AMBO_STATION
          : iconCache.FIRE_STATION;

      L.marker([s.lat, s.lon], { icon })
        .addTo(stationLayer)
        .bindPopup(`<b>${s.name}</b><br>Type: ${s.type}`);
    });
  } catch (err) {
    console.error("ERROR loading stations.json:", err);
  }
}


// ===============================
// LOAD HYDRANTS
// ===============================

async function loadHydrants() {
  try {
    const res = await fetch(HYDRANTS_URL);
    const hydrants = await res.json();

    hydrantLayer.clearLayers();

    hydrants.forEach(h => {
      if (!h.lat || !h.lon) return;

      L.circleMarker([h.lat, h.lon], {
        radius: 4,
        color: "blue",
        fillColor: "blue",
        fillOpacity: 1
      }).addTo(hydrantLayer);
    });

  } catch (err) {
    console.error("ERROR loading hydrants.json:", err);
  }
}


// ===============================
// HYDRANTS ONLY VISIBLE WHEN ZOOMED IN
// ===============================

map.on("zoomend", () => {
  if (map.getZoom() >= 16) {
    if (!map.hasLayer(hydrantLayer)) map.addLayer(hydrantLayer);
  } else {
    map.removeLayer(hydrantLayer);
  }
});


// ===============================
// LAYER CONTROL
// ===============================

L.control.layers(
  null,
  {
    "Fire Calls": fireLayer,
    "Ambo Calls": amboLayer,
    "Stations": stationLayer,
    "Hydrants": hydrantLayer
  },
  { collapsed: false }
).addTo(map);


// ===============================
// INITIAL LOAD
// ===============================

loadCalls();
loadStations();
loadHydrants();

// Auto-refresh calls every 60 sec (optional)
// setInterval(loadCalls, 60000);
