// =========================================
// DARK TONER MAP (STAMEN)
// =========================================
const darkStyle = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution:
        "Map tiles by Stamen — Data © OpenStreetMap contributors"
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

// =========================================
// MAP INIT
// =========================================
const map = new maplibregl.Map({
  container: "map",
  style: darkStyle,
  center: [175.5, -40.45],  // Foxton area
  zoom: 10
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusEl = document.getElementById("status-pill");
const setStatus = (t) => (statusEl.textContent = t);

// =========================================
// FILE LOCATIONS
// =========================================
const HYDRANTS_URL = "hydrants.json";
const STATIONS_URL = "stations.json";
const INCIDENTS_URL = "incidents.json"; // can be API later

const RECENT_MINUTES = 30;

// =========================================
// GEOCODER (Address → Coordinates)
// =========================================
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    address
  )}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NZ-Emergencies-Map" }
    });
    const json = await res.json();

    if (!json[0]) return null;

    return {
      lat: parseFloat(json[0].lat),
      lng: parseFloat(json[0].lon)
    };
  } catch (e) {
    console.error("Geocode failed:", e);
    return null;
  }
}

// =========================================
// LOAD STATIONS (Supports Address OR Coordinates)
// =========================================
async function loadStations() {
  const res = await fetch(STATIONS_URL);
  const rawStations = await res.json();

  const features = [];

  for (const s of rawStations) {
    let coords = null;

    if (s.lat && s.lng) {
      // already has coordinates
      coords = { lat: s.lat, lng: s.lng };
    } else if (s.address) {
      // geocode address
      coords = await geocodeAddress(s.address);
    }

    if (!coords) continue;

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [coords.lng, coords.lat]
      },
      properties: {
        name: s.name || "Station"
      }
    });
  }

  map.getSource("stations").setData({
    type: "FeatureCollection",
    features
  });
}

// =========================================
// MAP LOAD EVENT
// =========================================
map.on("load", async () => {
  // ---------------------------
  // HYDRANTS
  // ---------------------------
  map.addSource("hydrants", { type: "geojson", data: HYDRANTS_URL });
  map.addLayer({
    id: "hydrants",
    type: "circle",
    source: "hydrants",
    paint: {
      "circle-radius": 2,
      "circle-color": "#aaaaaa",
      "circle-opacity": 0.5
    }
  });

  // ---------------------------
  // STATIONS (Starts Empty, Filled After Geocoding)
  // ---------------------------
  map.addSource("stations", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
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

  loadStations(); // <--- load stations

  // ---------------------------
  // INCIDENTS
  // ---------------------------
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
      "circle-color": "rgba(239, 68, 68, 0.25)",
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

// =========================================
// INCIDENT REFRESH
// =========================================
async function refreshIncidents() {
  try {
    const res = await fetch(INCIDENTS_URL);
    const raw = await res.json();

    const cutoff = Date.now() - RECENT_MINUTES * 60 * 1000;

    const features = raw
      .map(parseIncident)
      .filter((f) => f.properties.timestampMs >= cutoff);

    map.getSource("incidents").setData({
      type: "FeatureCollection",
      features
    });

    setStatus(`${features.length} calls in last ${RECENT_MINUTES} minutes`);
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
      type: i.type || "Unknown",
      address: i.address || "",
      units: i.units || [],
      timestamp: i.timestamp,
      timestampMs: ts
    }
  };
}

// =========================================
// POPUP HANDLING
// =========================================
function setupIncidentPopup() {
  let popup = null;

  const click = (e) => {
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

    popup = new maplibregl.Popup({ offset: 12 })
      .setLngLat(f.geometry.coordinates)
      .setHTML(html)
      .addTo(map);
  };

  map.on("click", "incident-inner", click);
  map.on("click", "incident-outer", click);
}
