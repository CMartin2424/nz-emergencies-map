// ===============================
// NZ EMERGENCIES MAP - MAIN SCRIPT
// ===============================

// --- DATA SOURCES (GitHub RAW URLs) ---
// Make sure these files exist in your nz-emergencies-data repo
const CALLS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-data/main/calls.json";
const STATIONS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-data/main/stations.json";
const HYDRANTS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-data/main/hydrants.json";

// How long a call stays on the map (days)
const MAX_CALL_AGE_DAYS = 7;

// ===============================
// MAP SETUP
// ===============================

const map = L.map("map").setView([-41.2, 174.7], 6); // centre of NZ

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Layers
const fireLayer = L.layerGroup().addTo(map);
const amboLayer = L.layerGroup().addTo(map);
const stationLayer = L.layerGroup().addTo(map);
const hydrantLayer = L.layerGroup(); // we add/remove based on zoom

// ===============================
// ICONS
// ===============================

function makeIcon(fileName) {
  return L.icon({
    iconUrl: `icons/${fileName}`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
  });
}

// Call icons (you already have these files in /icons)
const iconCache = {
  // 🔥 FIRE CALLS (FENZ codes)
  MIN: makeIcon("MIN.PNG"),
  STRU: makeIcon("housefire.PNG"),
  MVC: makeIcon("MVC.PNG"),
  VEG: makeIcon("VEG.PNG"),
  MED: makeIcon("MED.PNG"),
  HAZ: makeIcon("HAZ.PNG"),
  NAT: makeIcon("NAT.PNG"),
  ALARM: makeIcon("Alarm.PNG"),
  FIREALM: makeIcon("Alarm.PNG"),
  FIRE_FALLBACK: makeIcon("fire.png"),

  // 🚑 AMBULANCE CALLS (type IS colour)
  RED: makeIcon("RED.PNG"),
  ORANGE: makeIcon("Orange.PNG"),
  GREEN: makeIcon("Green.PNG"),
  PURPLE: makeIcon("purple.PNG"),
  AMBO_FALLBACK: makeIcon("ambo.png"),

  // 🏢 STATIONS
  FIRE_STATION: makeIcon("firestation.png"),   // make sure this exists
  AMBO_STATION: makeIcon("ambostation.png")    // and this too
};

// ===============================
// HELPERS
// ===============================

function isRecentCall(call) {
  if (!call.timestamp) return true;

  const ts = new Date(call.timestamp);
  if (isNaN(ts)) return true;

  const ageMs = Date.now() - ts.getTime();
  const maxMs = MAX_CALL_AGE_DAYS * 24 * 60 * 60 * 1000;
  return ageMs <= maxMs;
}

function isAmbulanceCallType(callType) {
  const t = (callType || "").toUpperCase();
  return ["RED", "ORANGE", "GREEN", "PURPLE"].includes(t);
}

function getIconForCall(call) {
  const rawType = (call.type || "").toUpperCase();

  // 🚑 Ambulance: type is the colour
  if (isAmbulanceCallType(rawType)) {
    return iconCache[rawType] || iconCache.AMBO_FALLBACK;
  }

  // 🔥 Fire: type is FENZ code
  if (iconCache[rawType]) {
    return iconCache[rawType];
  }

  if (rawType.startsWith("FIREALM")) return iconCache.FIREALM;
  return iconCache.FIRE_FALLBACK;
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
    console.error("Error loading calls.json:", err);
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
      let icon = iconCache.FIRE_STATION;

      if (t === "AMBO" || t === "AMBULANCE") {
        icon = iconCache.AMBO_STATION;
      }

      const name = s.name || "Station";

      L.marker([s.lat, s.lon], { icon })
        .addTo(stationLayer)
        .bindPopup(`<b>${name}</b><br>Type: ${t}`);
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
// LAYER CONTROL (TOGGLES)
// ===============================

L.control
  .layers(
    null,
    {
      "Fire Calls": fireLayer,
      "Ambo Calls": amboLayer,
      "Stations": stationLayer,
      "Hydrants": hydrantLayer // note: only visible when zoomed in
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

// Optional: auto-refresh calls every 60s
// setInterval(loadCalls, 60000);
