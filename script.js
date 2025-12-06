// ===============================
// NZ EMERGENCIES MAP - FIXED SCRIPT (MATCHED TO EXACT ICON FILENAMES)
// ===============================

// --- DATA SOURCES ---
const CALLS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-data/main/calls.json";

const STATIONS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-map/main/stations.json";

const HYDRANTS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-map/main/hydrants.json";

// How long calls stay on the map (days)
const MAX_CALL_AGE_DAYS = 7;

// ===============================
// MAP
// ===============================

const map = L.map("map").setView([-41.2, 174.7], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Layers
const fireLayer = L.layerGroup().addTo(map);
const amboLayer = L.layerGroup().addTo(map);
const stationLayer = L.layerGroup().addTo(map);
const hydrantLayer = L.layerGroup();

// ===============================
// ICON MAKER
// ===============================

function makeIcon(file) {
  return L.icon({
    iconUrl: `icons/${file}`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
  });
}

// ===============================
// CORRECT ICON MAPPING (CASE EXACT)
// ===============================

const iconCache = {
  // FIRE CALLS
  STRU: makeIcon("STRU.png"),
  MIN: makeIcon("MIN.PNG"),
  MVC: makeIcon("MVC.PNG"),
  VEG: makeIcon("VEG.PNG"),
  MED: makeIcon("MED.png"),
  HAZ: makeIcon("HAZ.PNG"),
  NAT: makeIcon("NAT.PNG"),
  ORANGE: makeIcon("ORANGE.png"),
  PURPLE: makeIcon("PURPLE.png"),
  RED: makeIcon("RED.png"),

  ALARM: makeIcon("ALARM.png"),
  FIREALM: makeIcon("ALARM.png"),
  FIRE_FALLBACK: makeIcon("ALARM.png"),

  // AMBULANCE COLOURS
  GREEN: makeIcon("GREEN.png"),
  AMBO_FALLBACK: makeIcon("GREEN.png"),

  // STATIONS **MATCH YOUR REAL FILES**
  FIRE_STATION: makeIcon("fire-station.png"),
  AMBO_STATION: makeIcon("ambo-station.png"),

  // HYDRANT
  HYDRANT: makeIcon("hydrant.png")
};

// ===============================
// HELPERS
// ===============================

function isAmbulanceCallType(t) {
  t = (t || "").toUpperCase();
  return ["RED", "ORANGE", "GREEN", "PURPLE"].includes(t);
}

function getIconForCall(call) {
  const type = (call.type || "").toUpperCase();
  if (isAmbulanceCallType(type)) return iconCache[type] || iconCache.AMBO_FALLBACK;
  return iconCache[type] || iconCache.FIRE_FALLBACK;
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

      const icon = getIconForCall(call);

      const marker = L.marker([call.lat, call.lon], { icon })
        .bindPopup(`<b>${call.type}</b><br>${call.address || ""}`);

      if (isAmbulanceCallType(call.type))
        marker.addTo(amboLayer);
      else
        marker.addTo(fireLayer);
    });

  } catch (err) {
    console.error("Error loading calls:", err);
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

      const icon = (s.type === "AMBO")
        ? iconCache.AMBO_STATION
        : iconCache.FIRE_STATION;

      L.marker([s.lat, s.lon], { icon })
        .addTo(stationLayer)
        .bindPopup(`<b>${s.name}</b><br>Type: ${s.type}`);
    });

  } catch (err) {
    console.error("Error loading stations:", err);
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
    console.error("Error loading hydrants.json:", err);
  }
}

// Only show hydrants while zoomed in
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
