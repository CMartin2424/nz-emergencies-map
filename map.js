// ===========================
// DARK BASEMAP (CARTO)
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
      attribution: "© OpenStreetMap — © CARTO"
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
  style: darkStyle,
  center: [175.283, -40.463], // Foxton area
  zoom: 10
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusEl = document.getElementById("status-pill");
const setStatus = txt => (statusEl.textContent = txt);

// ===========================
// DATA PATHS
// ===========================

const HYDRANTS_URL = "hydrants.json";
const STATIONS_URL = "stations.json";

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
      "circle-opacity": 0.5
    }
  });

  // Stations
  map.addSource("stations", { type: "geojson", data: STATIONS_URL });
  map.addLayer({
    id: "stations",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": 5,
      "circle-color": "#00eaff",
      "circle-stroke-color": "#003b46",
      "circle-stroke-width": 2
    }
  });

  setupStationPopup();

  setStatus("Stations Loaded");
});

// ===========================
// POPUP FOR STATIONS
// ===========================

function setupStationPopup() {
  let popup = null;

  map.on("click", "stations", e => {
    const f = e.features[0];
    const p = f.properties;

    const html = `
      <div class="popup-header">Fire Station</div>
      <div class="popup-title">${p.name}</div>
      <div class="popup-meta">Type: ${p.type}</div>
    `;

    if (popup) popup.remove();

    popup = new maplibregl.Popup({ offset: 8 })
      .setLngLat(f.geometry.coordinates)
      .setHTML(html)
      .addTo(map);
  });
}
