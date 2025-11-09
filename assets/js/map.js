// assets/js/map.js

import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* Yardımcı: tarih formatı */
function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* Yardımcı: isVisible alanı */
function isRecordVisible(item) {
  if (!item || typeof item !== "object") return true;
  const v = item.isVisible;
  if (v === false || v === "false") return false;
  return true; // alan yoksa varsayılan: görünür
}

/* XSS'den kaçınmak için basit escape */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Leaflet haritasını başlat */
function initMap() {
  const mapEl = document.getElementById("events-map");
  if (!mapEl) return null;

  const map = L.map("events-map", {
    scrollWheelZoom: true,
    zoomControl: true,
  }).setView([39.0, 35.0], 6);

  // Koyu tema tile (Carto Dark)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);

  return map;
}

/* Firestore'dan etkinlikleri çekip haritaya ekle */
async function loadEventsOnMap() {
  const map = initMap();
  if (!map) return;

  const listContainer = document.getElementById("map-events-list");
  if (listContainer) {
    listContainer.innerHTML =
      '<p style="opacity:.7;">Etkinlikler yükleniyor.</p>';
  }

  const evRef = collection(db, "events");
  const q = query(evRef, orderBy("startDate", "asc"));
  const snap = await getDocs(q);

  const eventsAll = [];
  snap.forEach((docSnap) =>
    eventsAll.push({ id: docSnap.id, ...docSnap.data() })
  );

  // Görünür + konumu tanımlı etkinlikler
  const events = eventsAll
    .filter(isRecordVisible)
    .filter(
      (ev) =>
        typeof ev.lat === "number" &&
        !Number.isNaN(ev.lat) &&
        typeof ev.lng === "number" &&
        !Number.isNaN(ev.lng)
    );

  if (!events.length) {
    if (listContainer) {
      listContainer.innerHTML =
        "<p style='opacity:.7;'>Konumu tanımlı etkinlik bulunamadı.</p>";
    }
    return;
  }

  const boundsLatLngs = [];
  const itemsHtml = [];

  events.forEach((ev) => {
    const lat = ev.lat;
    const lng = ev.lng;
    const title = ev.title || "Etkinlik";
    const locationName = ev.locationName || "";
    const dateStr = ev.startDate ? formatDate(ev.startDate) : "";

    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: "#c79a54",
      weight: 1,
      fillColor: "#c79a54",
      fillOpacity: 0.9,
    }).addTo(map);

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    const popupHtml = `
      <div class="map-popup">
        <strong>${escapeHtml(title)}</strong><br/>
        <span>${dateStr}${
      locationName ? " – " + escapeHtml(locationName) : ""
    }</span><br/>
        <a href="${mapsUrl}" target="_blank" rel="noopener" class="map-popup-link">
          Haritalarda aç
        </a>
      </div>
    `;

    marker.bindPopup(popupHtml);

    // harita listesiyle eşleştirmek için id sakla
    marker._lareneaId = ev.id;

    boundsLatLngs.push([lat, lng]);

    // Alt listede göstermek için
    itemsHtml.push(`
      <article class="map-event-item">
        <button type="button" data-id="${ev.id}" class="map-event-btn">
          <div class="map-event-title">${escapeHtml(title)}</div>
          <div class="map-event-meta">
            <span>${dateStr}</span>
            ${
              locationName
                ? `<span class="sep">•</span><span>${escapeHtml(
                    locationName
                  )}</span>`
                : ""
            }
          </div>
        </button>
      </article>
    `);
  });

  if (boundsLatLngs.length >= 1) {
    const bounds = L.latLngBounds(boundsLatLngs);
    map.fitBounds(bounds.pad(0.3));
  }

  if (listContainer) {
    listContainer.innerHTML = itemsHtml.join("");

    const buttons = Array.from(
      listContainer.querySelectorAll(".map-event-btn")
    );
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const ev = events.find((e) => e.id === id);
        if (!ev) return;

        const latLng = [ev.lat, ev.lng];
        map.setView(latLng, 13, { animate: true });

        map.eachLayer((layer) => {
          if (layer._lareneaId && layer._lareneaId === id) {
            layer.openPopup();
          }
        });
      });
    });
  }
}

/* Başlat */
document.addEventListener("DOMContentLoaded", () => {
  loadEventsOnMap().catch((err) =>
    console.error("Etkinlik haritası yükleme hatası:", err)
  );
});
