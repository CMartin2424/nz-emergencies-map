// ===========================
// CARTO DARK BASEMAP (WORKING)
// ===========================
const darkStyle = {
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
      attribution: "© OpenStreetMap © CARTO"
    }
  },
  layers: [{
    id: "basemap",
    type: "raster",
    source: "basemap"
  }]
};

// ===========================
// MAP INIT
// ===========================
const map = new maplibregl.Map({
  container: "map",
  style: darkStyle,
  center: [175.28, -40.47], // Foxton
  zoom: 10
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusEl = document.getElementById("status-pill");
const setStatus = (txt) => statusEl.textContent = txt;

// ===========================
// LOAD EVERYTHING
// ===========================
map.on("load", async () => {

  // HYDRANTS
  map.addSource("hydrants", {
    type: "geojson",
    data: "hydrants.json"
  });
  map.addLayer({
    id: "hydrants",
    type: "circle",
    source: "hydrants",
    paint: {
      "circle-radius": 2,
      "circle-color": "#9ca3af",
      "circle-opacity": 0.5
    }
  });

  // STATIONS
  map.addSource("stations", {
    type: "geojson",
    data: "stations.json"
  });
  map.addLayer({
    id: "stations",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": 6,
      "circle-color": "#00b7ff",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1
    }
  });

  // INCIDENTS
  map.addSource("incidents", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  map.addLayer({
    id: "incident-outer",
    type: "circle",
    source: "incidents",
    paint: {
      "circle-radius": 15,
      "circle-color": "rgba(239, 68, 68, 0.35)",
      "circle-blur": 1.0
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
    const res = await fetch("incidents.json");
    const raw = await res.json();

    const cutoff = Date.now() - 30 * 60 * 1000;

    const features = raw
      .map(parseIncident)
      .filter(f => f.properties.timestampMs >= cutoff);

    map.getSource("incidents").setData({
      type: "FeatureCollection",
      features
    });

    setStatus(`${features.length} calls in last 30 minutes`);
  } catch (err) {
    console.error("Incident load error:", err);
    setStatus("Failed to load incidents");
  }
}

function parseIncident(i) {
  const ts = new Date(i.timestamp).getTime();
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [i.lng, i.lat] },
    properties: {
      type: i.type,
      address: i.address,
      units: i.units,
      timestamp: i.timestamp,
      timestampMs: ts
    }
  };
}

// ===========================
// POPUP HANDLER
// ===========================
function setupIncidentPopup() {
  let popup;

  const show = (e) => {
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
  };

  map.on("click", "incident-inner", show);
  map.on("click", "incident-outer", show);
}
