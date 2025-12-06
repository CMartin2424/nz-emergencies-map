// ===========================
// DARK BASEMAP (Carto)
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
// INIT MAP
// ===========================
const map = new maplibregl.Map({
  container: "map",
  style: darkStyle,
  center: [175.28, -40.47], 
  zoom: 10
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusEl = document.getElementById("status-pill");
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

// ===========================
// LOAD STATIONS (local + NZ)
// ===========================
async function loadStations() {
  console.log("Loading stations…");
  setStatus("Loading stations…");

  const sources = [
    "stations-local.json",
    "stations-nz.json"
  ];

  const allFeatures = [];

  for (const src of sources) {
    console.log("Loading file:", src);

    try {
      const res = await fetch(src);

      if (!res.ok) {
        console.error("❌ Failed to load:", src, res.status);
        continue;
      }

      const geo = await res.json();
      console.log("Loaded", src, "Features:", geo.features.length);

      allFeatures.push(...geo.features);

    } catch (err) {
      console.error("❌ Error loading station file:", src, err);
    }
  }

  if (allFeatures.length === 0) {
    setStatus("Failed to load stations");
    return;
  }

  // Add combined station data to map
  map.addSource("stations", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: allFeatures
    }
  });

  // Station markers
  map.addLayer({
    id: "stations-layer",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": 6,
      "circle-color": "#ffffff",
      "circle-stroke-color": "#ef4444",
      "circle-stroke-width": 2
    }
  });

  // Popup
  map.on("click", "stations-layer", e => {
    const f = e.features[0];
    const p = f.properties;
    const coords = f.geometry.coordinates;

    new maplibregl.Popup({ offset: 8 })
      .setLngLat(coords)
      .setHTML(`
        <div class="popup-header">Station</div>
        <div class="popup-title">${p.name}</div>
        ${p.address ? `<div class="popup-meta">${p.address}</div>` : ""}
      `)
      .addTo(map);
  });

  setStatus(`Stations loaded: ${allFeatures.length}`);
}

// ===========================
// LOAD CALLS (STATIC for now)
// ===========================
async function loadCalls() {
  console.log("Loading calls…");

  try {
    const res = await fetch("calls.json");
    if (!res.ok) {
      console.warn("Calls JSON missing or empty");
      return;
    }

    const geo = await res.json();

    map.addSource("calls", {
      type: "geojson",
      data: geo
    });

    map.addLayer({
      id: "calls-layer",
      type: "circle",
      source: "calls",
      paint: {
        "circle-radius": 10,
        "circle-color": "#ff0000",
        "circle-blur": 0.5
      }
    });

    setStatus("Calls loaded");

  } catch (err) {
    console.error("Error loading calls:", err);
  }
}

// ===========================
// ON MAP LOAD
// ===========================
map.on("load", () => {
  loadStations();
  loadCalls(); // keep this here for later live call updates
});
