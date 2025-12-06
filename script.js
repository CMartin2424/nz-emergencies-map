// ===============================
// NZ EMERGENCIES MAP - MAIN SCRIPT
// ===============================

// --- DATA SOURCES (GitHub RAW URLs) ---
const CALLS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-data/main/calls.json";

const STATIONS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-map/main/stations.json";

const HYDRANTS_URL =
  "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-map/main/data/hydrants-nz.geojson";

const MAX_CALL_AGE_DAYS = 7;

// ===============================
// MAP SETUP
// ===============================

const map = L.map("map").setView([-41.2, 174.7], 6); // Centre of NZ

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Layers
const fireLayer = L.layerGroup().addTo(map);
const amboLayer = L.layerGroup().addTo(map);
const stationLayer = L.layerGroup().addTo(map);
const hydrantLayer = L.layerGroup();

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

// All icons available in /icons folder
const iconCache = {
  // Fire call types
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

  // Ambulance call colours
  RED: makeIcon("RED.PNG"),
  ORANGE: makeIcon("Orange.PNG"),
  GREEN: makeIcon("Green.PNG"),
  PURPLE: makeIcon("purple.PNG"),
  AMBO_FALLBACK: makeIcon("ambo.png"),

  // Stations
  FIRE_STATION: makeIcon("fire.png"),
  AMBO_STATION: makeIcon("ambo.png")
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

function isAmbulanceColor(type) {
  const t = (type || "").toUpperCase();
  return ["RED", "ORANGE", "GREEN", "PURPLE"].includes(t);
}

function getIconForCall(call) {
  const type = (call.type || "").toUpperCase();

  // Ambulance call (colour-coded)
  if (isAmbulanceColor(type)) {
    return iconCache[type] || iconCache.AMBO_FALLBACK;
  }

  // Fire call (FENZ codes)
  if (iconCache[type]) {
    return iconCache[type];
  }

  if (type.startsWith("FIREALM")) return iconCache.FIREALM;

  return iconCache.FIRE_FALLBACK;
}

function buildPopupHtml(call) {
  return `
    <div class="popup">
      <b>Type:</b> ${call.type || "Unknown"}<br>
      ${call.details ? `<b>Details:</b> ${call.details}<br>` : ""}
      ${call.address ? `<b>Address:</b> ${call.address}<br>` : ""}
      ${call.station ? `<b>Station:</b> ${call.station}<br>` : ""}
      ${call.timestamp ? `<b>Time:</b> ${call.timestamp}` : ""}
    </div>
  `;
}

// ===============================
// LOAD CALLS
// ===============================

async function loadCalls() {
  try {
    const res = await fetch(CALLS_URL, { cache: "no-cache" });
    const calls = await res.json();

    fireLayer.clearLayers();
    amboLayer.clearLayers();

    calls.forEach(call => {
      if (!call.lat || !call.lon) return;
      if (!isRecentCall(call)) return;

      const marker = L.marker([call.lat, call.lon], {
        icon: getIconForCall(call)
      }).bindPopup(buildPopupHtml(call));

      if (isAmbulanceColor(call.type)) {
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
    const stations = await res.json();

    stationLayer.clearLayers();

    stations.forEach(st => {
      if (!st.lat || !st.lon) return;

      const type = (st.type || "").toUpperCase();
      const icon =
        type === "AMBO" || type === "AMBULANCE"
          ? iconCache.AMBO_STATION
          : iconCache.FIRE_STATION;

      L.marker([st.lat, st.lon], { icon })
        .addTo(stationLayer)
        .bindPopup(`<b>${st.name}</b><br>Type: ${type}`);
    });
  } catch (err) {
    console.error("Error loading stations:", err);
  }
}

// ===============================
// LOAD HYDRANTS (GEOJSON)
// ===============================

async function loadHydrants() {
  try {
    const res = await fetch(HYDRANTS_URL, { cache: "no-cache" });
    const geo = await res.json();

    hydrantLayer.clearLayers();

    L.geoJSON(geo, {
      pointToLayer: (_, latlng) =>
        L.circleMarker(latlng, {
          radius: 4,
          color: "blue",
          weight: 1,
          fillColor: "blue",
          fillOpacity: 1
        })
    }).addTo(hydrantLayer);
  } catch (err) {
    console.error("Error loading hydrants:", err);
  }
}

// Show hydrants only when zoomed in
map.on("zoomend", () => {
  if (map.getZoom() >= 16) {
    if (!map.hasLayer(hydrantLayer)) map.addLayer(hydrantLayer);
  } else {
    if (map.hasLayer(hydrantLayer)) map.removeLayer(hydrantLayer);
  }
});

// ===============================
// LAYER TOGGLES
// ===============================

L.control
  .layers(
    null,
    {
      "Fire Calls": fireLayer,
      "Ambo Calls": amboLayer,
      Stations: stationLayer,
      Hydrants: hydrantLayer
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

// Auto-refresh calls every 60 seconds (optional)
// setInterval(loadCalls, 60000);
