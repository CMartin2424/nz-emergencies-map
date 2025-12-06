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
  center: [175.28, -40.47], // Foxton region
  zoom: 10
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusEl = document.getElementById("status-pill");
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

// ===========================
// LOAD STATIONS
// ===========================
async function loadStations() {
  try {
    const url = "https://cmartin2424.github.io/nz-emergencies-map/stations.json?v=" + Date.now();
    console.log("Loading stations from:", url);

    const res = await fetch(url);
    const geo = await res.json();

    console.log("Stations loaded:", geo);

    map.addSource("stations", {
      type: "geojson",
      data: geo
    });

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

    // Station popups
    map.on("click", "stations-layer", e => {
      const f = e.features[0];
      const p = f.properties;
      const coords = f.geometry.coordinates;

      new maplibregl.Popup({ offset: 10 })
        .setLngLat(coords)
        .setHTML(`
          <div class="popup-header">Fire Station</div>
          <div class="popup-title">${p.name}</div>
          <div class="popup-meta">${p.address || ""}</div>
          <div class="popup-meta">
            Lng: ${coords[0].toFixed(5)}, Lat: ${coords[1].toFixed(5)}
          </div>
        `)
        .addTo(map);
    });

    setStatus(`Loaded ${geo.features.length} stations`);

  } catch (err) {
    console.error("Stations failed to load:", err);
    setStatus("Failed to load stations");
  }
}

// ===========================
// CLICK-TO-GET-COORDS HELPER
// ===========================
function enableCoordPicker() {
  map.on("click", e => {
    const { lng, lat } = e.lngLat;
    console.log("Clicked at:", lng, lat);

    // Small popup so you don't have to look in console if you don't want
    new maplibregl.Popup({ offset: 6 })
      .setLngLat([lng, lat])
      .setHTML(`
        <div class="popup-header">Picked point</div>
        <div class="popup-meta">Lng: ${lng.toFixed(5)}</div>
        <div class="popup-meta">Lat: ${lat.toFixed(5)}</div>
      `)
      .addTo(map);
  });
}

// ===========================
// START
// ===========================
map.on("load", () => {
  setStatus("Loading stations…");
  loadStations();
  enableCoordPicker();
});
