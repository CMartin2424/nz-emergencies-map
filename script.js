// ============================
// CONFIG
// ============================

const CALLS_URL = "https://raw.githubusercontent.com/CMartin2424/nz-emergencies-data/main/calls.json";

// Icon definitions
const fireIcon = L.icon({
    iconUrl: "icons/fire.png",
    iconSize: [32, 32]
});

const amboIcon = L.icon({
    iconUrl: "icons/ambulance.png",
    iconSize: [32, 32]
});

const hydrantIcon = L.icon({
    iconUrl: "icons/hydrant.png",
    iconSize: [24, 24]
});

const fireStationIcon = L.icon({
    iconUrl: "icons/firestation.png",
    iconSize: [28, 28]
});

const amboStationIcon = L.icon({
    iconUrl: "icons/ambostation.png",
    iconSize: [28, 28]
});

// ============================
// MAP INITIALIZATION
// ============================
const map = L.map("map").setView([-40.463, 175.283], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
}).addTo(map);

// ============================
// LAYERS
// ============================

const callLayer = L.layerGroup().addTo(map);
const hydrantLayer = L.layerGroup().addTo(map);
const stationLayer = L.layerGroup().addTo(map);

// ============================
// LOAD CALLS.JSON
// ============================

async function loadCalls() {
    try {
        const res = await fetch(CALLS_URL + "?cache=" + Date.now());
        const calls = await res.json();

        callLayer.clearLayers();
        
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        calls.forEach(call => {
            const callTime = new Date(call.timestamp).getTime();
            if (now - callTime > sevenDays) {
                // Older than 7 days → skip
                return;
            }

            const icon = call.type === "FIRE" ? fireIcon : amboIcon;

            L.marker([call.lat, call.lon], { icon })
                .bindPopup(`
                    <b>${call.type} CALL</b><br>
                    Station: ${call.station}<br>
                    Address: ${call.address}<br>
                    Details: ${call.details}<br>
                    Time: ${call.timestamp}
                `)
                .addTo(callLayer);
        });

    } catch (err) {
        console.error("Error loading calls:", err);
    }
}

// Refresh every 30 seconds
setInterval(loadCalls, 30000);
loadCalls();

// ============================
// HYDRANTS (Example – you will add real data later)
// ============================

const exampleHydrants = [
    { lat: -40.4640, lon: 175.2830 },
    { lat: -40.4650, lon: 175.2840 }
];

exampleHydrants.forEach(h => {
    L.marker([h.lat, h.lon], { icon: hydrantIcon })
        .bindPopup("Fire Hydrant")
        .addTo(hydrantLayer);
});

// ============================
// FIRE + AMBO STATIONS (Example)
// ============================

const exampleStations = [
    {
        type: "FIRE",
        name: "Foxton Fire Station",
        lat: -40.46432,
        lon: 175.28295
    },
    {
        type: "AMBO",
        name: "St John Ambulance Foxton",
        lat: -40.46735,
        lon: 175.28782
    }
];

exampleStations.forEach(s => {
    const icon = s.type === "FIRE" ? fireStationIcon : amboStationIcon;

    L.marker([s.lat, s.lon], { icon })
        .bindPopup(`${s.type} Station: ${s.name}`)
        .addTo(stationLayer);
});
