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
// LOAD FIRE STATIONS (MERGES BOTH FILES)
// ===========================
async function loadStations() {
  try {
    const stationFiles = [
      "stations.json?v=" + Date.now(),
      "stations-nz.json?v=" + Date.now()
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

    if (map.getSource("stations")) {
      map.getSource("stations").setData(mergedGeoJSON);
    } else {
      map.addSource("stations", {
        type: "geojson",
        data: mergedGeoJSON
      });

      // Station dots
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

      // Station popup
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
          `)
          .addTo(map);
      });
    }

    setStatus(`Loaded ${mergedGeoJSON.features.length} stations`);

  } catch (err) {
    console.error("Error loading station files:", err);
    setStatus("Failed to load stations");
  }
}

// ===========================
// LOAD LIVE CALLS
// ===========================
async function loadCalls() {
  try {
    const url = "calls.json?v=" + Date.now();
    console.log("Loading calls from:", url);

    const res = await fetch(url);
    const calls = await res.json();

    const features = calls.map(c => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [c.lng, c.lat]
      },
      properties: {
        type: c.type,
        address: c.address,
        timestamp: c.timestamp,
        units: c.units || []
      }
    }));

    const geo = {
      type: "FeatureCollection",
      features: features
    };

    if (map.getSource("calls")) {
      map.getSource("calls").setData(geo);
    } else {
      map.addSource("calls", { type: "geojson", data: geo });

      // Glowing outer ring
      map.addLayer({
        id: "calls-outer",
        type: "circle",
        source: "calls",
        paint: {
          "circle-radius": 16,
          "circle-color": "rgba(255,0,0,0.4)",
          "circle-blur": 1.2
        }
      });

      // Solid red center
      map.addLayer({
        id: "calls-inner",
        type: "circle",
        source: "calls",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ff0000"
        }
      });

      // Call popup
      map.on("click", "calls-inner", e => {
        const p = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates;

        new maplibregl.Popup({ offset: 10 })
          .setLngLat(coords)
          .setHTML(`
            <div class="popup-header">Active Incident</div>
            <div class="popup-title">${p.type}</div>
            <div class="popup-meta">${p.address}</div>
            <div class="popup-meta">Units: ${p.units.join(", ")}</div>
            <div class="popup-meta">${new Date(p.timestamp).toLocaleTimeString()}</div>
          `)
          .addTo(map);
      });
    }

    console.log("Calls loaded:", features.length);

  } catch (err) {
    console.error("Failed to load calls:", err);
  }
}

// ===========================
// CLICK-TO-GET COORDS (HELPER)
// ===========================
function enableCoordPicker() {
  map.on("click", e => {
    const { lng, lat } = e.lngLat;

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
// MAP LOADED
// ===========================
map.on("load", () => {
  setStatus("Loading data…");

  loadStations();
  loadCalls();

  // Refresh calls every 30 seconds
  setInterval(loadCalls, 30000);

  enableCoordPicker();
});
