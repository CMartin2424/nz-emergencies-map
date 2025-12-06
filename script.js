// ===============================
// NZ EMERGENCIES MAP - SCRIPT
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
// ICON HELPER
// ===============================

// ❗ No iconSize on purpose = use the image’s natural size
// (so nothing gets squashed)
function makeIcon(file) {
  return L.icon({
    iconUrl: `icons/${file}`,
    // let Leaflet use the image’s own size
    iconAnchor: [16, 32],   // rough “bottom middle” guess
    popupAnchor: [0, -30]
  });
}

// ===============================
// ICONS  (match the filenames in your screenshot exactly)
// ===============================

const iconCache = {
  // ---- FIRE CALLS (FENZ TYPES) ----
  STRU: makeIcon("STRU.png"),      // structure / house fire
  MIN: makeIcon("MIN.PNG"),
  MVC: makeIcon("MVC.PNG"),
  VEG: makeIcon("VEG.PNG"),
  MED: makeIcon("MED.png"),
  HAZ: makeIcon("HAZ.PNG"),
  NAT: makeIcon("NAT.PNG"),
  ALARM: makeIcon("ALARM.png"),
  FIREALM: makeIcon("ALARM.png"),

  FIRE_FALLBACK: makeIcon("ALARM.png"),

  // ---- AMBULANCE COLOUR CALLS ----
  RED: makeIcon("RED.png"),
  ORANGE: makeIcon("ORANGE.png"),
  GREEN: makeIcon("GREEN.png"),
  PURPLE: makeIcon("PURPLE.png"),

  AMBO_FALLBACK: makeIcon("GREEN.png"),

  // ---- STATIONS ----
  FIRE_STATION: makeIcon("fire-station.png"),
  AMBO_STATION: makeIcon("ambo-station.png")
};

// ===============================
// HELPERS
// ===============================

function isAmbulanceCallType(t) {
  t = (t || "").toUpperCase();
  return ["RED", "ORANGE", "GREEN", "PURPLE"].includes(t);
}

function isRecentCall(call) {
  if (!call.timestamp) return true;
  const ts = new Date(call.timestamp);
  if (isNaN(ts)) return true;
  const ageMs = Date.now() - ts.getTime();
  const maxMs = MAX_CALL_AGE_DAYS * 24 * 60 * 60 * 1000;
  return ageMs <= maxMs;
}

function getIconForCall(call) {
  const type = (call.type || "").toUpperCase();

  // Ambulance (colour-based)
  if (isAmbulanceCallType(type)) {
    return iconCache[type] || iconCache.AMBO_FALLBACK;
  }

  // Fire (FENZ type code)
  return iconCache[type] || iconCache.FIRE_FALLBACK;
}

function buildPopupHtml(call) {
  const type = call.type || "Unknown";
  const details = call.details || "";
  const address = call.address || "";
  const station = call.station || "";
  const ts = call.timestamp || "";

  return `
    <div class="popup">
      <b>Type:</b> ${type}<br>
      ${details ? `<b>Details:</b> ${details}<br>` : ""}
      ${address ? `<b>Address:</b> ${address}<br>` : ""}
      ${station ? `<b>Station:</b> ${station}<br>` : ""}
      ${ts ? `<b>Time:</b> ${ts}` : ""}
    </div>
  `;
}

// ===============================
// LOAD CALLS
// ===============================

async function loadCalls() {
  try {
    const res = await fetch(CALLS_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const calls = await res.json();

    fireLayer.clearLayers();
    amboLayer.clearLayers();

    calls.forEach(call => {
      if (!call.lat || !call.lon) return;
      if (!isRecentCall(call)) return;

      const icon = getIconForCall(call);
      const popupHtml = buildPopupHtml(call);

      const marker = L.marker([call.lat, call.lon], { icon }).bindPopup(popupHtml);

      if (isAmbulanceCallType(call.type)) {
        marker.addTo(amboLayer);
      } else {
        marker.addTo(fireLayer);
      }
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
    const res = await fetch(STATIONS_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const stations = await res.json();

    stationLayer.clearLayers();

    stations.forEach(s => {
      if (!s.lat || !s.lon) return;

      const t = (s.type || "").toUpperCase();
      const icon =
        t === "AMBO" || t === "AMBULANCE"
          ? iconCache.AMBO_STATION
          : iconCache.FIRE_STATION;

      L.marker([s.lat, s.lon], { icon })
        .addTo(stationLayer)
        .bindPopup(`<b>${s.name || "Station"}</b><br>Type: ${t}`);
    });
  } catch (err) {
    console.error("Error loading stations.json:", err);
  }
}

// ===============================
// LOAD HYDRANTS
// ===============================

async function loadHydrants() {
  try {
    const res = await fetch(HYDRANTS_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const hydrants = await res.json();

    hydrantLayer.clearLayers();

    hydrants.forEach(h => {
      if (!h.lat || !h.lon) return;

      L.circleMarker([h.lat, h.lon], {
        radius: 4,
        color: "blue",
        weight: 1,
        fillColor: "blue",
        fillOpacity: 1
      }).addTo(hydrantLayer);
    });
  } catch (err) {
    console.error("Error loading hydrants.json:", err);
  }
}

// Only show hydrants when zoomed in far enough (>=16)
map.on("zoomend", () => {
  if (map.getZoom() >= 16) {
    if (!map.hasLayer(hydrantLayer)) map.addLayer(hydrantLayer);
  } else {
    if (map.hasLayer(hydrantLayer)) map.removeLayer(hydrantLayer);
  }
});

// ===============================
// LAYER CONTROL
// ===============================

L.control
  .layers(
    null,
    {
      "Fire Calls": fireLayer,
      "Ambo Calls": amboLayer,
      "Stations": stationLayer,
      "Hydrants": hydrantLayer
    },
    { collapsed: false }
  )
  .addTo(map);

// ===============================
// INITIAL LOAD
// ===============================

loadCalls();
loadStations();
loadHydrants();
