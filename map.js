// ===========================
// CONFIG
// ===========================
mapboxgl.accessToken = "YOUR_MAPBOX_ACCESS_TOKEN_HERE"; // TODO: put yours here

// Your data endpoints / files:
// - Hydrants: GeoJSON with Point features
// - Stations: GeoJSON with Point features
// - Incidents: JSON array or GeoJSON – see INCIDENTS_URL below
const HYDRANTS_URL = "/data/hydrants.geojson"; // change to your path
const STATIONS_URL = "/data/stations.geojson"; // change to your path
const INCIDENTS_URL = "/api/incidents";        // change to your backend endpoint

// In minutes – only show calls in this window
const RECENT_MINUTES = 30;

// How often to refresh incidents (ms)
const INCIDENT_REFRESH_MS = 30 * 1000;

// ===========================
// MAP INIT
// ===========================
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center: [175.5, -40.7], // Roughly lower NI – change if you want
  zoom: 6.2,
  pitch: 0,
  bearing: 0,
});

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

// Status pill reference
const statusEl = document.getElementById("status-pill");

function setStatus(text, count) {
  if (!statusEl) return;
  if (typeof count === "number") {
    statusEl.innerHTML = `<span class="count">${count}</span> active calls in last ${RECENT_MINUTES} mins · ${text}`;
  } else {
    statusEl.textContent = text;
  }
}

// ===========================
// DATA SOURCES + LAYERS
// ===========================
map.on("load", async () => {
  // Base options: dark, minimal. You can tweak style here if you like.

  // --- Hydrants source/layer (tiny grey dots) ---
  map.addSource("hydrants", {
    type: "geojson",
    data: HYDRANTS_URL,
  });

  map.addLayer({
    id: "hydrants-dots",
    type: "circle",
    source: "hydrants",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5, 1.5,
        14, 3.5,
      ],
      "circle-color": "#9ca3af",
      "circle-opacity": 0.55,
    },
  });

  // --- Stations source/layer (slightly larger white dots) ---
  map.addSource("stations", {
    type: "geojson",
    data: STATIONS_URL,
  });

  map.addLayer({
    id: "stations-dots",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5, 2.3,
        14, 5,
      ],
      "circle-color": "#f9fafb",
      "circle-opacity": 0.9,
      "circle-stroke-color": "#111827",
      "circle-stroke-width": 1,
    },
  });

  // --- Incidents source (empty initially) ---
  map.addSource("incidents", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  });

  // Inner solid dot
  map.addLayer({
    id: "incidents-inner",
    type: "circle",
    source: "incidents",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5, 4,
        14, 7,
      ],
      "circle-color": [
        "match",
        ["get", "category"],
        "FIRE", "#f97373",
        "MEDICAL", "#22c55e",
        "RESCUE", "#38bdf8",
        /* default */ "#e5e7eb",
      ],
      "circle-opacity": 0.95,
      "circle-stroke-color": "#020617",
      "circle-stroke-width": 1,
    },
  });

  // Outer glow ring
  map.addLayer({
    id: "incidents-outer",
    type: "circle",
    source: "incidents",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5, 7,
        14, 14,
      ],
      "circle-color": [
        "match",
        ["get", "category"],
        "FIRE", "rgba(248,113,113,0.25)",
        "MEDICAL", "rgba(34,197,94,0.25)",
        "RESCUE", "rgba(56,189,248,0.25)",
        /* default */ "rgba(248,250,252,0.25)",
      ],
      "circle-blur": 0.7,
      "circle-opacity": 0.9,
    },
  });

  // Optional: order so incidents sit on top of everything
  map.moveLayer("incidents-outer");
  map.moveLayer("incidents-inner");

  // Click behaviour
  setupIncidentClickPopup();

  // First load + interval refresh
  await refreshIncidents();
  setInterval(refreshIncidents, INCIDENT_REFRESH_MS);
});

// ===========================
// INCIDENTS FETCH + FILTER
// ===========================

async function refreshIncidents() {
  try {
    setStatus("Updating…");
    const response = await fetch(INCIDENTS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);

    // Two possibilities:
    // A) Already GeoJSON FeatureCollection
    // B) Plain array from backend
    let json = await response.json();

    let featureCollection;
    if (json.type === "FeatureCollection") {
      featureCollection = json;
    } else if (Array.isArray(json)) {
      featureCollection = {
        type: "FeatureCollection",
        features: json.map(toIncidentFeature).filter(Boolean),
      };
    } else {
      console.warn("Unexpected incidents payload format", json);
      featureCollection = {
        type: "FeatureCollection",
        features: [],
      };
    }

    // Filter to last RECENT_MINUTES
    const cutoff = Date.now() - RECENT_MINUTES * 60 * 1000;
    featureCollection.features = featureCollection.features.filter((f) => {
      const ts = f.properties.timestampMs;
      return typeof ts === "number" && ts >= cutoff;
    });

    const count = featureCollection.features.length;

    const src = map.getSource("incidents");
    if (src) src.setData(featureCollection);

    if (count === 0) {
      setStatus("No calls in last " + RECENT_MINUTES + " mins");
    } else {
      setStatus("Last updated " + new Date().toLocaleTimeString(), count);
    }
  } catch (err) {
    console.error("Error loading incidents:", err);
    setStatus("Error loading incidents");
  }
}

/**
 * Convert your backend incident object into a GeoJSON feature.
 * Adjust this to match your actual data keys.
 *
 * Example expected incident object:
 * {
 *   id: "INC123",
 *   lat: -40.123,
 *   lng: 175.123,
 *   timestamp: "2025-12-07T12:34:56Z",
 *   type: "STRUCTURE FIRE",
 *   category: "FIRE",
 *   address: "123 Main St, Foxton",
 *   units: ["FOXT0N477", "LEVIN431"],
 *   priority: "P1"
 * }
 */
function toIncidentFeature(incident) {
  if (
    incident == null ||
    typeof incident.lng !== "number" ||
    typeof incident.lat !== "number" ||
    !incident.timestamp
  ) {
    return null;
  }

  const timestampMs = new Date(incident.timestamp).getTime();
  if (isNaN(timestampMs)) return null;

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [incident.lng, incident.lat],
    },
    properties: {
      id: incident.id || String(timestampMs),
      category: incident.category || "OTHER",
      type: incident.type || "Unknown incident",
      address: incident.address || "",
      timestamp: incident.timestamp,
      timestampMs,
      units: incident.units || [],
      priority: incident.priority || "",
    },
  };
}

// ===========================
// CLICK POPUP FOR INCIDENTS
// ===========================

function setupIncidentClickPopup() {
  let popup;

  function showPopup(e) {
    const feature = e.features && e.features[0];
    if (!feature) return;

    const props = feature.properties || {};
    const lngLat = feature.geometry.coordinates;

    const dt = props.timestamp ? new Date(props.timestamp) : null;
    const localTime = dt ? dt.toLocaleTimeString() : "Unknown time";

    const units = Array.isArray(props.units)
      ? props.units
      : typeof props.units === "string"
      ? props.units.split(",").map((s) => s.trim())
      : [];

    const category = props.category || "OTHER";
    const chips = [];

    const safeType = escapeHtml(props.type || "Unknown incident");
    const safePriority = escapeHtml(props.priority || "");
    const safeAddress = escapeHtml(props.address || "");

    // Category chip
    let catClass = "";
    if (category === "FIRE") catClass = "fire";
    else if (category === "MEDICAL") catClass = "medical";

    chips.push(
      `<span class="popup-chip ${catClass}">${escapeHtml(category)}</span>`
    );

    if (safePriority) {
      chips.push(
        `<span class="popup-chip">${escapeHtml("Priority " + safePriority)}</span>`
      );
    }

    const unitsHtml =
      units.length > 0
        ? units.map((u) => `<code>${escapeHtml(u)}</code>`).join(", ")
        : "Unknown units";

    const html = `
      <div>
        <div class="popup-header">Live incident</div>
        <div class="popup-title">${safeType}</div>
        <div class="popup-meta">
          ${safeAddress ? safeAddress + " · " : ""}${localTime}
        </div>
        <div>${chips.join(" ")}</div>
        <div class="popup-units"><strong>Units:</strong> ${unitsHtml}</div>
      </div>
    `;

    if (popup) popup.remove();
    popup = new mapboxgl.Popup({ closeButton: true, offset: 12 })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map);
  }

  map.on("click", "incidents-inner", showPopup);
  map.on("click", "incidents-outer", showPopup);

  // Change cursor to pointer on hover
  map.on("mouseenter", "incidents-inner", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "incidents-inner", () => {
    map.getCanvas().style.cursor = "";
  });
}

/** Simple XSS-safe text */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
