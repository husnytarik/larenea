// assets/js/eventModal.js

// Firestore Timestamp / Date / string için tarih formatı
function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Modal kapatma davranışını ayarlar (ESC, arka plan, X butonu)
export function setupEventModal() {
  const modal = document.getElementById("event-modal");
  if (!modal) return; // Bu sayfada modal yoksa sessizce çık

  const closeBtn = modal.querySelector(".event-modal-close");
  const backdrop = modal.querySelector(".event-modal-backdrop");

  function close() {
    modal.classList.remove("event-modal--visible");
  }

  if (closeBtn) closeBtn.addEventListener("click", close);
  if (backdrop) backdrop.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      modal.classList.contains("event-modal--visible")
    ) {
      close();
    }
  });
}

/**
 * Modalı açmak için ortak fonksiyon.
 * Beklenen alanlar:
 *  - title
 *  - images (array) => [0] poster
 *  - startDate, endDate (Timestamp/Date/string)
 *  - locationName
 *  - address
 *  - lat, lng (number, opsiyonel)
 */
export function openEventModal(ev) {
  const modal = document.getElementById("event-modal");
  if (!modal) return;

  const imgWrapper = modal.querySelector(".event-modal-media");
  const imgEl = modal.querySelector("#event-modal-image");
  const titleEl = modal.querySelector("#event-modal-title");
  const dateEl = modal.querySelector("#event-modal-date");
  const locationEl = modal.querySelector("#event-modal-location");
  const addressEl = modal.querySelector("#event-modal-address");
  const mapBtn = modal.querySelector("#event-modal-map-btn");

  const images = Array.isArray(ev.images) ? ev.images : [];
  const posterUrl = images.length ? images[0] : null;

  // Görsel
  if (posterUrl && imgEl && imgWrapper) {
    imgEl.src = posterUrl;
    imgEl.alt = ev.title || "";
    imgWrapper.style.display = "";
  } else if (imgWrapper) {
    imgWrapper.style.display = "none";
    if (imgEl) {
      imgEl.src = "";
      imgEl.alt = "";
    }
  }

  // Başlık
  if (titleEl) titleEl.textContent = ev.title || "Etkinlik";

  // Tarih + saat aralığı
  const startStr = ev.startDate ? formatDate(ev.startDate) : "";
  const endStr = ev.endDate ? formatDate(ev.endDate) : "";

  const startTime = ev.startTime || "";
  const endTime = ev.endTime || "";

  let dateText = "";

  if (startStr && endStr && startStr !== endStr) {
    dateText = `${startStr} – ${endStr}`;
  } else {
    dateText = startStr || endStr || "";
  }

  // Saat bilgisi varsa ekle
  if (startTime && endTime) {
    dateText += ` (${startTime} – ${endTime})`;
  } else if (startTime) {
    dateText += ` (${startTime})`;
  }

  if (dateEl) dateEl.textContent = dateText;

  // Konum (şehir / mekan)
  if (locationEl) {
    locationEl.textContent = ev.locationName || "";
    locationEl.style.display = ev.locationName ? "" : "none";
  }

  // Yazılı adres
  if (addressEl) {
    addressEl.textContent = ev.address || "";
    addressEl.style.display = ev.address ? "" : "none";
  }

  // "Haritalarda aç" butonu
  if (mapBtn) {
    mapBtn.onclick = () => {
      const hasLat =
        typeof ev.lat === "number" &&
        !Number.isNaN(ev.lat) &&
        typeof ev.lng === "number" &&
        !Number.isNaN(ev.lng);

      let url = "";
      if (hasLat) {
        url = `https://www.google.com/maps?q=${ev.lat},${ev.lng}`;
      } else if (ev.address) {
        url = `https://www.google.com/maps?q=${encodeURIComponent(ev.address)}`;
      }

      if (url) {
        window.open(url, "_blank");
      }
    };
  }

  modal.classList.add("event-modal--visible");
}
