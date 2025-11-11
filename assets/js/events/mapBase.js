// assets/js/events/mapBase.js

export function createLareneaMap(
  containerId,
  { center = [39.0, 35.0], zoom = 6, scrollWheel = true } = {}
) {
  const el = document.getElementById(containerId);
  if (!el) return null;
  if (typeof L === "undefined") {
    console.warn("Leaflet yüklenemedi, harita oluşturulamadı.");
    return null;
  }

  const map = L.map(containerId, {
    scrollWheelZoom: scrollWheel,
    zoomControl: false,
  }).setView(center, zoom);

  map.attributionControl.remove();

  L.tileLayer(
    "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
    {
      opacity: 0.6,
      maxZoom: 19,
      attribution: "© Esri — Source: Esri, USGS, NOAA",
    }
  ).addTo(map);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    opacity: 0.8,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);

  return map;
}
