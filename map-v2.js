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
  center: [175.28, -40.47], // Foxton area
  zoom: 10
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusEl = document.getElementById("status-pill");
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

// ===========================
// LOAD STATIONS FROM stations.json
// ===========================
async function loadStations() {
  try {
    const response = await fetch("stations.json");
    const stations = await response.json();

    const features = stations.map(s => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      properties: {
        name: s.name,
        address: s.address
      }
    }));

    map.addSource("stations", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: features
      }
    });

    // Station markers
    map.addLayer({
      id: "stations-layer",
      type: "circle",
      source: "stations",
      paint: {
        "circle-radius": 6,
        "circle-color": "#00eaff",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2
      }
    });

    // Popups
    map.on("click", "stations-layer", (e) => {
      const p = e.features[0].properties;
      const coords = e.features[0].geometry.coordinates;

      new maplibregl.Popup({ offset: 8 })
        .setLngLat(coords)
        .setHTML(`
          <div class="popup-title">${p.name}</div>
          <div class="popup-meta">${p.address}</div>
        `)
        .addTo(map);
    });

    setStatus(`Loaded ${stations.length} stations`);
  } catch (err) {
    console.error("Stations load error:", err);
    setStatus("Failed to load stations");
  }
}

// Load on map ready
map.on("load", () => {
  setStatus("Loading stations…");
  loadStations();
});
