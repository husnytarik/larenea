// assets/js/events/eventCards.js
import { formatDate, escapeHtml } from "../helpers.js";

// "url||caption" veya düz string → sadece URL
function extractImageUrl(entry) {
  if (!entry) return "";
  const str = String(entry);
  const [urlPart] = str.split("||");
  return (urlPart || "").trim();
}

/**
 * Harita popup kart HTML'i
 */
export function buildEventPopupHtml(ev) {
  const title = escapeHtml(ev.title || "Etkinlik");
  const locationName = ev.locationName ? escapeHtml(ev.locationName) : "";
  const address = ev.address ? escapeHtml(ev.address) : "";

  const rawImages = Array.isArray(ev.images) ? ev.images : [];
  const posterUrl = rawImages.length ? extractImageUrl(rawImages[0]) : null;

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
    <img src="${escapeHtml(posterUrl)}" alt="${title}" />
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
