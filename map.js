// ===========================
// CONFIG
// ===========================
mapboxgl.accessToken = "YOUR_MAPBOX_ACCESS_TOKEN_HERE";

const HYDRANTS_URL = "/data/hydrants.geojson";
const STATIONS_URL = "/data/stations.geojson";
const INCIDENTS_URL = "/api/incidents";

const RECENT_MINUTES = 30;
const INCIDENT_REFRESH_MS = 30000;

// ===========================
// MAP INIT
// ===========================
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center: [175.5, -40.45], // Manawatu / Foxton Region
  zoom: 8,
});

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

const statusEl = document.getElementById("status-pill");

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text;
}

// ===========================
// LOAD LAYERS
// ===========================
map.on("load", async () => {

  // Hydrants — tiny grey dots
  map.addSource("hydrants", { type: "geojson", data: HYDRANTS_URL });
  map.addLayer({
    id: "hydrants",
    type: "circle",
    source: "hydrants",
    paint: {
      "circle-radius": 2,
      "circle-color": "#9ca3af",
      "circle-opacity": 0.55
    }
  });

  // Stations — white dots
  map.addSource("stations", { type: "geojson", data: STATIONS_URL });
  map.addLayer({
    id: "stations",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": 4,
      "circle-color": "#ffffff",
      "circle-opacity": 0.9,
      "circle-stroke-color": "#020617",
      "circle-stroke-width": 1
    }
  });

  // Incidents source (empty until refresh)
  map.addSource("incidents", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  // incident inner dot
  map.addLayer({
    id: "incident-inner",
    type: "circle",
    source: "incidents",
    paint: {
      "circle-radius": 6,
      "circle-color": [
        "match",
        ["get", "category"],
        "FIRE", "#ef4444",
        "MEDICAL", "#22c55e",
        "RESCUE", "#38bdf8",
        "#e5e7eb"
      ]
    }
  });

  // incident outer glow
  map.addLayer({
    id: "incident-outer",
    type: "circle",
    source: "incidents",
    paint: {
      "circle-radius": 14,
      "circle-color": [
        "match",
        ["get", "category"],
        "FIRE", "rgba(239,68,68,0.35)",
        "MEDICAL", "rgba(34,197,94,0.35)",
        "RESCUE", "rgba(56,189,248,0.35)",
        "rgba(229,231,235,0.35)"
      ],
      "circle-blur": 0.8
    }
  });

  setupIncidentClickPopup();

  // Initial load
  await refreshIncidents();

  // Auto-refresh
  setInterval(refreshIncidents, INCIDENT_REFRESH_MS);
});

// ===========================
// FETCH INCIDENTS
// ===========================
async function refreshIncidents() {
  try {
    setStatus("Updating…");

    const response = await fetch(INCIDENTS_URL);
    const raw = await response.json();

    const cutoff = Date.now() - RECENT_MINUTES * 60 * 1000;

    const featureCollection = {
      type: "FeatureCollection",
      features: raw
        .map(parseIncident)
        .filter(f => f && f.properties.timestampMs >= cutoff)
    };

    map.getSource("incidents").setData(featureCollection);

    setStatus(`${featureCollection.features.length} calls in last ${RECENT_MINUTES} minutes`);
  } catch (err) {
    setStatus("Error loading incidents");
    console.error(err);
  }
}

function parseIncident(i) {
  if (!i.lat || !i.lng || !i.timestamp) return null;

  const ts = new Date(i.timestamp).getTime();
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [i.lng, i.lat] },
    properties: {
      type: i.type || "Unknown",
      address: i.address || "",
      category: i.category || "OTHER",
      priority: i.priority || "",
      units: i.units || [],
      timestamp: i.timestamp,
      timestampMs: ts
    }
  };
}

// ===========================
// POPUPS
// ===========================
function setupIncidentClickPopup() {
  let popup;

  function showPopup(e) {
    const f = e.features[0];
    const p = f.properties;

    const units = JSON.parse(p.units || "[]").join(", ");
    const time = new Date(p.timestamp).toLocaleTimeString();

    const html = `
      <div>
        <div class="popup-header">Live Incident</div>
        <div class="popup-title">${p.type}</div>
        <div class="popup-meta">${p.address} · ${time}</div>
        <div class="popup-chip ${p.category.toLowerCase()}">${p.category}</div>
        <div><strong>Units:</strong> ${units}</div>
      </div>
    `;

    if (popup) popup.remove();
    popup = new mapboxgl.Popup({ offset: 12 })
      .setLngLat(f.geometry.coordinates)
      .setHTML(html)
      .addTo(map);
  }

  map.on("click", "incident-inner", showPopup);
  map.on("click", "incident-outer", showPopup);
}
