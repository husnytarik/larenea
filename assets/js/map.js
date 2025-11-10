// assets/js/map.js

import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { setupEventModal, openEventModal } from "./eventModal.js";

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

// isVisible alanı: false / "false" ise gizli kabul et
function isRecordVisible(item) {
  if (!item || typeof item !== "object") return true;
  const v = item.isVisible;
  if (v === false || v === "false") return false;
  return true;
}

// Basit escape
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Harita init */
function initMap() {
  const mapEl = document.getElementById("events-map");
  if (!mapEl) return null;

  const map = L.map("events-map", {
    scrollWheelZoom: true,
    zoomControl: true,
  }).setView([39.0, 35.0], 6);

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

  // Ortak modal kapatma davranışlarını kur
  setupEventModal();

  const listContainer = document.getElementById("map-events-list");
  if (listContainer) {
    listContainer.innerHTML =
      '<p style="opacity:.7;">Etkinlikler yükleniyor...</p>';
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

    // Marker
    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: "#c79a54",
      weight: 1,
      fillColor: "#c79a54",
      fillOpacity: 0.9,
    }).addTo(map);

    marker._lareneaId = ev.id;

    // POPUP (label) – tekrar gelsin diye bunu koruyoruz
    const popupHtml = `
      <div class="map-popup">
        <strong>${escapeHtml(title)}</strong><br/>
        <span>${dateStr}${
      locationName ? " – " + escapeHtml(locationName) : ""
    }</span>
      </div>
    `;
    marker.bindPopup(popupHtml);

    // Markere tıklayınca modal da açılsın
    marker.on("click", () => {
      openEventModal(ev);
    });

    // Bounds
    boundsLatLngs.push([lat, lng]);

    // Alt liste
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

  if (boundsLatLngs.length) {
    map.fitBounds(boundsLatLngs, { padding: [40, 40] });
  }

  // Liste tıklamaları → marker’a zoom + modal
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

        openEventModal(ev);
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
