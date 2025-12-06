// ===============================
// NZ EMERGENCIES MAP - FIXED SCRIPT
// ===============================

// --- DATA SOURCES ---
const CALLS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-data/main/calls.json";

const STATIONS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-map/main/stations.json";

const HYDRANTS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-map/main/hydrants.json";


// ===============================
// MAP
// ===============================

const map = L.map("map").setView([-41.2, 174.7], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20
}).addTo(map);

// Layers
const fireLayer = L.layerGroup().addTo(map);
const amboLayer = L.layerGroup().addTo(map);
const stationLayer = L.layerGroup().addTo(map);
const hydrantLayer = L.layerGroup();


// ===============================
// ICON HELPER
// ===============================

function makeIcon(fileName) {
  return L.icon({
    iconUrl: `icons/${fileName}`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
  });
}


// ===============================
// ICON DEFINITIONS (MATCH YOUR REAL FILE NAMES)
// ===============================

const iconCache = {
  // Fire calls
  STRU: makeIcon("STRU.png"),
  MIN: makeIcon("MIN.PNG"),
  MVC: makeIcon("MVC.PNG"),
  VEG: makeIcon("VEG.PNG"),
  HAZ: makeIcon("HAZ.PNG"),
  NAT: makeIcon("NAT.PNG"),
  MED: makeIcon("MED.png"),

  ALARM: makeIcon("ALARM.png"),
  FIREALM: makeIcon("ALARM.png"),

  FIRE_FALLBACK: makeIcon("ALARM.png"),

  // Ambulance colour calls
  RED: makeIcon("RED.png"),
  GREEN: makeIcon("GREEN.png"),
  ORANGE: makeIcon("ORANGE.png"),
  PURPLE: makeIcon("PURPLE.png"),

  AMBO_FALLBACK: makeIcon("GREEN.png"),

  // Stations (your real names)
  FIRE_STATION: makeIcon("fire-station.png"),
  AMBO_STATION: makeIcon("ambo-station.png"),

  // Hydrant
  HYDRANT: makeIcon("hydrant.png")
};


// ===============================
// HELPERS
// ===============================

function isAmbulance(type) {
  return ["RED", "GREEN", "ORANGE", "PURPLE"].includes(type);
}

function getIconForCall(call) {
  const type = (call.type || "").toUpperCase();
  return iconCache[type] || iconCache.FIRE_FALLBACK;
}


// ===============================
// LOAD CALLS
// ===============================

async function loadCalls() {
  const res = await fetch(CALLS_URL);
  const calls = await res.json();

  fireLayer.clearLayers();
  amboLayer.clearLayers();

  calls.forEach(call => {
    if (!call.lat || !call.lon) return;

    const icon = getIconForCall(call);
    const marker = L.marker([call.lat, call.lon], { icon })
      .bindPopup(`<b>${call.type}</b><br>${call.address || ""}`);

    if (isAmbulance(call.type.toUpperCase()))
      marker.addTo(amboLayer);
    else
      marker.addTo(fireLayer);
  });
}


// ===============================
// LOAD STATIONS
// ===============================

async function loadStations() {
  const res = await fetch(STATIONS_URL);
  const stations = await res.json();

  stationLayer.clearLayers();

  stations.forEach(s => {
    const icon = s.type === "AMBO" ? iconCache.AMBO_STATION : iconCache.FIRE_STATION;

    L.marker([s.lat, s.lon], { icon })
      .addTo(stationLayer)
      .bindPopup(`<b>${s.name}</b><br>${s.type}`);
  });
}


// ===============================
// LOAD HYDRANTS
// ===============================

async function loadHydrants() {
  const res = await fetch(HYDRANTS_URL);
  const hydrants = await res.json();

  hydrantLayer.clearLayers();

  hydrants.forEach(h => {
    L.circleMarker([h.lat, h.lon], {
      radius: 4,
      color: "blue",
      fillColor: "blue",
      fillOpacity: 1
    }).addTo(hydrantLayer);
  });
}


// Zoom-dependent hydrants
map.on("zoomend", () => {
  if (map.getZoom() >= 16) map.addLayer(hydrantLayer);
  else map.removeLayer(hydrantLayer);
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
