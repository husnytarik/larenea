// assets/js/events/event-detail.js

import { db } from "../firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { formatDate, escapeHtml } from "../helpers.js";
import { createLareneaMap } from "./mapBase.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

async function loadEventDetail(id) {
  const container = document.getElementById("event-detail");
  if (!container) {
    console.error("event-detail elementi bulunamadı.");
    return;
  }

  if (!id) {
    container.innerHTML = "<p>Etkinlik bulunamadı.</p>";
    return;
  }

  try {
    const ref = doc(db, "events", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      container.innerHTML = "<p>Etkinlik bulunamadı.</p>";
      return;
    }

    const ev = { id: snap.id, ...snap.data() };
    renderEvent(ev);
  } catch (err) {
    console.error("Etkinlik detayını yüklerken hata:", err);
    const container = document.getElementById("event-detail");
    if (container) {
      container.innerHTML =
        "<p>Etkinlik yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>";
    }
  }
}

function buildDateText(ev) {
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

  return dateText;
}

function extractFirstImage(ev) {
  const rawImages = Array.isArray(ev.images) ? ev.images : [];
  if (!rawImages.length) return null;

  const entry = String(rawImages[0]);
  const [urlPart] = entry.split("||");
  const url = (urlPart || "").trim();
  return url || null;
}

function renderEvent(ev) {
  const container = document.getElementById("event-detail");
  if (!container) return;

  const title = escapeHtml(ev.title || "Etkinlik");
  const summary = escapeHtml(ev.summary || "");
  const content = ev.content || "";
  const locationName = ev.locationName ? escapeHtml(ev.locationName) : "";
  const address = ev.address ? escapeHtml(ev.address) : "";
  const dateText = buildDateText(ev);
  const category = ev.category ? escapeHtml(ev.category) : "";
  const sourceUrl = (ev.sourceUrl || "").trim();
  const sourceLabel = (ev.sourceLabel || "").trim();
  const imageUrl = extractFirstImage(ev);

  let sourceHtml = "";
  if (sourceUrl || sourceLabel) {
    const safeUrl = escapeHtml(sourceUrl || "#");
    const safeLabel = escapeHtml(sourceLabel || sourceUrl || "Kaynak");
    sourceHtml = `
      <p class="event-detail-source">
        Kaynak:
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
          ${safeLabel}
        </a>
      </p>
    `;
  }

  let locationHtml = "";
  if (locationName || address) {
    locationHtml = `
      <p class="event-detail-location">
        <strong>Mekan:</strong>
        ${locationName}${locationName && address ? " – " : ""}${address}
      </p>
    `;
  }

  const dateHtml = dateText
    ? `<p class="event-detail-date"><strong>Tarih:</strong> ${escapeHtml(
        dateText
      )}</p>`
    : "";

  const categoryHtml = category
    ? `<p class="event-detail-category">${category}</p>`
    : "";

  const imageHtml = imageUrl
    ? `
    <div class="event-detail-media">
      <img src="${escapeHtml(imageUrl)}" alt="${title}" />
    </div>
  `
    : "";

  container.innerHTML = `
    <article class="event-detail-article">
      <header class="event-detail-header">
        ${categoryHtml}
        <h1 class="event-detail-title">${title}</h1>
        ${dateHtml}
        ${locationHtml}
        ${sourceHtml}
      </header>

      ${imageHtml}

      ${summary ? `<p class="event-detail-summary">${summary}</p>` : ""}

      <section class="event-detail-content">
        ${content}
      </section>

      <section class="event-detail-map-section">
        <div id="map" class="event-detail-map"></div>
      </section>
    </article>
  `;

  setupMap(ev);
}

function setupMap(ev) {
  const hasLat =
    typeof ev.lat === "number" &&
    !Number.isNaN(ev.lat) &&
    typeof ev.lng === "number" &&
    !Number.isNaN(ev.lng);

  const mapContainer = document.getElementById("map");
  if (!mapContainer || !hasLat) {
    if (mapContainer) {
      mapContainer.style.display = "none";
    }
    return;
  }

  const map = createLareneaMap("map", {
    center: [ev.lat, ev.lng],
    zoom: 13,
    scrollWheel: true,
  });

  if (!map) return;
  if (typeof L === "undefined") return;

  L.marker([ev.lat, ev.lng])
    .addTo(map)
    .bindPopup(ev.title || "Etkinlik");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!eventId) {
    const container = document.getElementById("event-detail");
    if (container) {
      container.innerHTML = "<p>Etkinlik bulunamadı.</p>";
    }
    return;
  }

  loadEventDetail(eventId);
});
