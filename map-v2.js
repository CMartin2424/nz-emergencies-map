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
// LOAD MULTIPLE STATION FILES
// ===========================
async function loadStations() {
  try {
    // Add any number of station files here:
    const stationFiles = [
      "stations.json?v=" + Date.now(),        // Local Horowhenua stations
      "stations-nz.json?v=" + Date.now()     // Full NZ stations
    ];

    let allFeatures = [];

    for (const file of stationFiles) {
      console.log("Loading:", file);

      const res = await fetch(file);
      const geo = await res.json();

      if (geo && geo.features) {
        allFeatures = allFeatures.concat(geo.features);
      } else {
        console.warn("Invalid GeoJSON in:", file);
      }
    }

    const mergedGeoJSON = {
      type: "FeatureCollection",
      features: allFeatures
    };

    console.log("Total stations loaded:", mergedGeoJSON.features.length);

    // Add merged station source
    map.addSource("stations", {
      type: "geojson",
      data: mergedGeoJSON
    });

    // Draw station dots
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

    // Popups when clicking a station
    map.on("click", "stations-layer", e => {
      const f = e.features[0];
      const p = f.properties;
      const coords = f.geometry.coordinates;

      new maplibregl.Popup({ offset: 8 })
        .setLngLat(coords)
        .setHTML(`
          <div class="popup-header">Fire Station</div>
          <div class="popup-title">${p.name}</div>
          <div class="popup-meta">${p.address || ""}</div>
        `)
        .addTo(map);
    });

    setStatus(`Loaded ${mergedGeoJSON.features.length} stations`);

  } catch (err) {
    console.error("Error loading station files:", err);
    setStatus("Failed to load stations");
  }
}

// ===========================
// CLICK-TO-GET COORDINATES (optional helper)
// ===========================
function enableCoordPicker() {
  map.on("click", e => {
    const { lng, lat } = e.lngLat;
    console.log("Clicked at:", lng, lat);

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
  enableCoordPicker(); // You can remove this if not needed anymore
});
