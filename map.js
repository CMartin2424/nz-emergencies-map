// ===========================
// DARK MATTER FREE BASEMAP
// ===========================

const darkMatterStyle = {
  version: 8,
  sources: {
    "basemap": {
      type: "raster",
      tiles: [
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          .replace("{s}", "a"),
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          .replace("{s}", "b"),
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          .replace("{s}", "c")
      ],
      tileSize: 256,
      attribution:
        "&copy; OpenStreetMap contributors &copy; CARTO"
    }
  },
  layers: [
    {
      id: "basemap",
      type: "raster",
      source: "basemap",
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

// ===========================
// MAP INIT
// ===========================
const map = new maplibregl.Map({
  container: "map",
  style: darkMatterStyle,
  center: [175.5, -40.45],
  zoom: 8
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusEl = document.getElementById("status-pill");

function setStatus(t) {
  if (statusEl) statusEl.textContent = t;
}

// ===========================
// YOUR DATA SRCs
// ===========================
const HYDRANTS_URL = "/data/hydrants.geojson";
const STATIONS_URL = "/data/stations.geojson";
const INCIDENTS_URL = "/api/incidents";

const RECENT_MINUTES = 30;

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
      "circle-opacity": 0.9,
      "circle-stroke-color": "#020617",
      "circle-stroke-width": 1
    }
  });

  // Incidents (dynamic)
  map.addSource("incidents", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  // glowing incidents
  map.addLayer({
    id: "incident-outer",
    type: "circle",
    source: "incidents",
    paint: {
      "circle-radius": 14,
      "circle-color": "rgba(239,68,68,0.35)",
      "circle-blur": 0.8
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
// INCIDENT REFRESH
// ===========================
async function refreshIncidents() {
  try {
    setStatus("Updating…");

    const res = await fetch(INCIDENTS_URL);
    const raw = await res.json();

    const cutoff = Date.now() - RECENT_MINUTES * 60 * 1000;

    const features = raw
      .map(parseIncident)
      .filter(f => f.properties.timestampMs >= cutoff);

    map.getSource("incidents").setData({
      type: "FeatureCollection",
      features
    });

    setStatus(`${features.length} calls in last ${RECENT_MINUTES} minutes`);

  } catch (err) {
    console.error(err);
    setStatus("Failed to load incidents");
  }
}

function parseIncident(i) {
  const ts = new Date(i.timestamp).getTime();
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [i.lng, i.lat] },
    properties: {
      type: i.type || "Unknown",
      address: i.address || "",
      units: i.units || [],
      timestamp: i.timestamp,
      timestampMs: ts
    }
  };
}

// ===========================
// POPUP
// ===========================
function setupIncidentPopup() {
  let popup;

  map.on("click", "incident-inner", e => showPopup(e));
  map.on("click", "incident-outer", e => showPopup(e));

  function showPopup(e) {
    const f = e.features[0];
    const p = f.properties;

    const html = `
      <div class="popup-header">Live Incident</div>
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
  }
}
