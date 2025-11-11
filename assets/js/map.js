// assets/js/map.js

import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// NOT: Artık bu sayfada tam ekran modal kullanmıyoruz
// import { setupEventModal, openEventModal } from "./eventModal.js";

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

// "url||caption" veya düz string → sadece URL
function extractImageUrl(entry) {
  if (!entry) return "";
  const str = String(entry);
  const [urlPart] = str.split("||");
  return (urlPart || "").trim();
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

/**
 * Modal ile aynı mantıkta ama haritada küçük kart olarak gözükecek HTML
 */
function buildEventPopupHtml(ev) {
  const title = escapeHtml(ev.title || "Etkinlik");
  const locationName = ev.locationName ? escapeHtml(ev.locationName) : "";
  const address = ev.address ? escapeHtml(ev.address) : "";

  // Görsel
  const rawImages = Array.isArray(ev.images) ? ev.images : [];
  const posterUrl = rawImages.length ? extractImageUrl(rawImages[0]) : null;

  // Tarih + saat
  const startStr = ev.startDate ? formatDate(ev.startDate) : "";
  const endStr = ev.endDate ? formatDate(ev.endDate) : "";

  let dateText = "";
  if (startStr && endStr && startStr !== endStr) {
    dateText = `${startStr} – ${endStr}`;
  } else {
    dateText = startStr || endStr || "";
  }

  const startTime = ev.startTime || "";
  const endTime = ev.endTime || "";

  if (startTime && endTime) {
    dateText += ` (${startTime} – ${endTime})`;
  } else if (startTime) {
    dateText += ` (${startTime})`;
  }

  const dateHtml = dateText
    ? `<div class="event-map-card-date">${escapeHtml(dateText)}</div>`
    : "";

  const locationHtml =
    locationName || address
      ? `
  <div class="event-map-card-location">
    ${locationName ? `<span>${locationName}</span>` : ""}
    ${locationName && address ? " · " : ""}
    ${address ? `<span>${address}</span>` : ""}
  </div>`
      : "";

  const imageHtml = posterUrl
    ? `
  <div class="event-map-card-media">
    <img src="${posterUrl}" alt="${title}" />
  </div>`
    : "";

  return `
    <div class="event-map-card">
      ${imageHtml}
      <div class="event-map-card-body">
        <h3 class="event-map-card-title">${title}</h3>
        ${dateHtml}
        ${locationHtml}
      </div>
    </div>
  `;
}

/* Harita init */
function initMap() {
  const mapEl = document.getElementById("events-map");
  if (!mapEl) return null;

  const map = L.map("events-map", {
    scrollWheelZoom: true,
    zoomControl: false,
  }).setView([39.0, 35.0], 6);
  map.attributionControl.remove(); // Sağ alttaki varsayılan metni kaldır
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

/* Firestore'dan etkinlikleri çekip haritaya ekle */
async function loadEventsOnMap() {
  const map = initMap();
  if (!map) return;

  // Bu sayfada tam ekran modal kullanılmıyor
  // setupEventModal();

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
  const markersById = new Map();

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
    markersById.set(ev.id, marker);

    // Popup: modalın küçük kartı gibi
    const popupHtml = buildEventPopupHtml(ev);
    marker.bindPopup(popupHtml, {
      className: "event-map-popup",
      maxWidth: 260,
      closeButton: true,
      autoPan: true,
    });

    // Marker tıklanınca sadece harita popup'ı aç – modal yok
    marker.on("click", () => {
      const latLng = [lat, lng];
      map.setView(latLng, 13, { animate: true });
      marker.openPopup();
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

  // Liste tıklamaları → marker’a zoom + popup
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

        const marker = markersById.get(id);
        if (marker) {
          marker.openPopup();
        }
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
