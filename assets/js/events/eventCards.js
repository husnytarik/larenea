// assets/js/events/eventCards.js
import { formatDate, escapeHtml } from "../helpers.js";

// "url||caption" biçimini ya da düz stringi URL'e indirger
function extractImageUrl(entry) {
  if (!entry) return "";
  const str = String(entry);
  const [urlPart] = str.split("||");
  return (urlPart || "").trim();
}

/**
 * Harita popup kartı HTML'i
 * - Sol üst: Etkinlik linki (eventUrl)
 * - Sağ üst: Fiyat etiketi (priceType: free/paid)
 * - Görsel yoksa karta `no-media` sınıfı eklenir (CSS'te topbar static akışa alınır)
 */
export function buildEventPopupHtml(ev) {
  const title = escapeHtml(ev.title || "Etkinlik");
  const locationName = ev.locationName ? escapeHtml(ev.locationName) : "";
  const address = ev.address ? escapeHtml(ev.address) : "";

  // Görsel/poster
  const rawImages = Array.isArray(ev.images) ? ev.images : [];
  const posterUrl = rawImages.length ? extractImageUrl(rawImages[0]) : null;
  const hasMedia = !!posterUrl;

  // Tarih ve saat
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
    dateText += dateText
      ? ` (${startTime} – ${endTime})`
      : `${startTime} – ${endTime}`;
  } else if (startTime) {
    dateText += dateText ? ` (${startTime})` : startTime;
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

  // Üst bar içerikleri
  const eventUrl = (ev.eventUrl || "").trim();
  const priceType = (ev.priceType || "").toString().toLowerCase(); // "free" | "paid"
  const badge =
    priceType === "free"
      ? `<span class="event-map-card-badge badge-free">Ücretsiz</span>`
      : priceType === "paid"
      ? `<span class="event-map-card-badge badge-paid">Ücretli</span>`
      : "";

  const linkHtml = eventUrl
    ? `<a class="event-map-card-link" href="${escapeHtml(
        eventUrl
      )}" target="_blank" rel="noopener noreferrer">Etkinlik linki ↗</a>`
    : "";

  const topbarHtml = `
    <div class="event-map-card-topbar">
      <div class="left">${linkHtml}</div>
      <div class="right">${badge}</div>
    </div>
  `;

  const imageHtml = hasMedia
    ? `
  <div class="event-map-card-media">
    <img src="${escapeHtml(posterUrl)}" alt="${title}" />
  </div>`
    : "";

  // Görsel yoksa `no-media` sınıfı ekle
  return `
    <div class="event-map-card ${hasMedia ? "" : "no-media"}">
      ${imageHtml}
      ${topbarHtml}
      <div class="event-map-card-body">
        <h3 class="event-map-card-title">${title}</h3>
        ${dateHtml}
        ${locationHtml}
      </div>
    </div>
  `;
}
