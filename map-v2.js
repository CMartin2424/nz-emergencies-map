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
  center: [175.28, -40.47], // Foxton-ish
  zoom: 10
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusEl = document.getElementById("status-pill");
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

// ===========================
// LOAD STATIONS FROM GeoJSON
// ===========================
async function loadStations() {
  try {
    const res = await fetch("stations.json");
    const geo = await res.json();

    // add source
    map.addSource("stations", {
      type: "geojson",
      data: geo
    });

    // nicer fire-station style (white dot, red ring)
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

    // POPUPS
    map.on("click", "stations-layer", e => {
      const f = e.features[0];
      const p = f.properties;
      const coords = f.geometry.coordinates;

      new maplibregl.Popup({ offset: 8 })
        .setLngLat(coords)
        .setHTML(`
          <div class="popup-header">Fire Station</div>
          <div class="popup-title">${p.name}</div>
          ${p.address ? `<div class="popup-meta">${p.address}</div>` : ""}
        `)
        .addTo(map);
    });

    setStatus(`Loaded ${geo.features.length} stations`);
  } catch (err) {
    console.error("Stations load error:", err);
    setStatus("Failed to load stations");
  }
}

map.on("load", () => {
  setStatus("Loading stations…");
  loadStations();
});
