// ===========================
// DARK MATTER MAP (CARTO) — NEW NON-CACHED VERSION
// ===========================

const darkStyleV2 = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO"
    }
  },
  layers: [
    {
      id: "basemap",
      type: "raster",
      source: "basemap"
    }
  ]
};

// ===========================
// MAP INIT
// ===========================

const map = new maplibregl.Map({
  container: "map",
  style: darkStyleV2,        // ← NEW STYLE NAME (forces GitHub refresh)
  center: [175.28, -40.46],  // Foxton
  zoom: 11
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusEl = document.getElementById("status-pill");
const setStatus = t => statusEl.textContent = t;

// ===========================
// DATA SOURCES
// ===========================

const HYDRANTS_URL = "hydrants.json";
const STATIONS_URL = "stations.json";
const INCIDENTS_URL = "incidents.json";

// ===========================
// LOAD LAYERS
// ===========================

map.on("load", async () => {

  // Hydrants
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

  // Stations
  map.addSource("stations", { type: "geojson", data: STATIONS_URL });
  map.addLayer({
    id: "stations",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": 4,
      "circle-color": "#ffffff",
      "circle-opacity": 0.95,
      "circle-stroke-color": "#000",
      "circle-stroke-width": 1
    }
  });

  // Incidents
  map.addSource("incidents", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  map.addLayer({
    id: "incident-outer",
    type: "circle",
    source: "incidents",
    paint: {
      "circle-radius": 16,
      "circle-color": "rgba(239, 68, 68, 0.4)",
      "circle-blur": 1
    }
  });

  map.addLayer({
    id: "incident-inner",
    type: "circle",
    source: "incidents",
    paint: {
      "circle-radius": 6,
      "circle-color": "#ef4444"
    }
  });

  setupIncidentPopup();
  await refreshIncidents();
  setInterval(refreshIncidents, 30000);
});

// ===========================
// INCIDENT LOADING
// ===========================

async function refreshIncidents() {
  try {
    const res = await fetch(INCIDENTS_URL);
    const raw = await res.json();

    const cutoff = Date.now() - 30 * 60000;

    const features = raw
      .map(parseIncident)
      .filter(f => f.properties.timestampMs >= cutoff);

    map.getSource("incidents").setData({
      type: "FeatureCollection",
      features
    });

    setStatus(`${features.length} recent calls`);

  } catch (err) {
    console.error(err);
    setStatus("Failed to load incidents");
  }
}

function parseIncident(i) {
  const t = new Date(i.timestamp).getTime();

  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [i.lng, i.lat] },
    properties: {
      type: i.type || "Unknown",
      address: i.address || "",
      units: i.units || [],
      timestamp: i.timestamp,
      timestampMs: t
    }
  };
}

// ===========================
// POPUPS
// ===========================

function setupIncidentPopup() {
  let popup;

  map.on("click", ["incident-inner", "incident-outer"], e => {
    const f = e.features[0];
    const p = f.properties;

    const html = `
      <div class="popup-header">Incident</div>
      <div class="popup-title">${p.type}</div>
      <div class="popup-meta">${p.address}</div>
      <div class="popup-meta">${new Date(p.timestamp).toLocaleTimeString()}</div>
      <div><strong>Units:</strong> ${p.units}</div>
    `;

    if (popup) popup.remove();

    popup = new maplibregl.Popup({ offset: 10 })
      .setLngLat(f.geometry.coordinates)
      .setHTML(html)
      .addTo(map);
  });
}
