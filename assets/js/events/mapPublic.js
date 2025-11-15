// assets/js/events/mapPublic.js
import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { formatDate, escapeHtml, isRecordVisible } from "../helpers.js";
import { createLareneaMap } from "./mapBase.js";
import { buildEventPopupHtml } from "./eventCards.js";

function setupEventSearch() {
  const input = document.getElementById("search-events-input");
  const list = document.getElementById("map-events-list");

  if (!input || !list) return;

  input.addEventListener("input", () => {
    const text = input.value.toLowerCase();

    // ⬇⬇⬇ BURASI ÖNEMLİ: .map-event-row DEĞİL, .map-event-item OLACAK
    list.querySelectorAll(".map-event-item").forEach((row) => {
      const t = row.innerText.toLowerCase();
      row.style.display = t.includes(text) ? "" : "none";
    });
  });
}

async function loadEventsOnMap() {
  const map = createLareneaMap("events-map", {
    center: [39.0, 35.0],
    zoom: 6,
    scrollWheel: true,
  });
  if (!map) return;

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

  // Liste altındaki açık detay panelini takip ederiz
  let openDetailsEl = null;

  events.forEach((ev) => {
    const lat = ev.lat;
    const lng = ev.lng;
    const title = ev.title || "Etkinlik";
    const locationName = ev.locationName || "";
    const dateStr = ev.startDate ? formatDate(ev.startDate) : "";
    const eventUrl = (ev.eventUrl || "").trim();

    // açıklama metni: summary > description > ""
    const desc =
      (ev.summary && String(ev.summary)) ||
      (ev.description && String(ev.description)) ||
      "";

    // --- Marker ve popup ---
    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: "#c79a54",
      weight: 1,
      fillColor: "#c79a54",
      fillOpacity: 0.9,
    }).addTo(map);

    marker._lareneaId = ev.id;
    markersById.set(ev.id, marker);

    const popupHtml = buildEventPopupHtml(ev);
    marker.bindPopup(popupHtml, {
      className: "event-map-popup",
      maxWidth: 260,
      closeButton: true,
      autoPan: true,
    });

    marker.on("click", () => {
      const latLng = [lat, lng];
      map.setView(latLng, 10, { animate: true });
      marker.openPopup();
    });

    boundsLatLngs.push([lat, lng]);

    // --- Harita altı liste öğesi (başlık + gizli detay) ---
    const safeTitle = escapeHtml(title);
    const safeLoc = locationName ? escapeHtml(locationName) : "";
    const safeDesc = desc ? escapeHtml(desc) : "";
    const linkHtml = eventUrl
      ? `<a href="${escapeHtml(
          eventUrl
        )}" target="_blank" rel="noopener noreferrer" class="map-event-link">Etkinlik linki ↗</a>`
      : "";

    itemsHtml.push(`
      <article class="map-event-item" data-id="${ev.id}">
        <button type="button" class="map-event-btn">
          <div class="map-event-title">${safeTitle}</div>
          <div class="map-event-meta">
            <span>${dateStr || ""}</span>
            ${
              safeLoc ? `<span class="sep">•</span><span>${safeLoc}</span>` : ""
            }
          </div>
        </button>
        <div class="map-event-details" hidden>
          ${safeDesc ? `<p class="map-event-desc">${safeDesc}</p>` : ""}
          ${linkHtml}
        </div>
      </article>
    `);
  });

  if (boundsLatLngs.length) {
    map.fitBounds(boundsLatLngs, { padding: [40, 40] });
  }

  if (listContainer) {
    listContainer.innerHTML = itemsHtml.join("");

    const items = Array.from(listContainer.querySelectorAll(".map-event-item"));

    items.forEach((itemEl) => {
      const btn = itemEl.querySelector(".map-event-btn");
      const details = itemEl.querySelector(".map-event-details");
      const id = itemEl.getAttribute("data-id");
      const ev = events.find((e) => e.id === id);

      btn.addEventListener("click", () => {
        // İlgili marker/popup'ı göster
        if (ev) {
          const latLng = [ev.lat, ev.lng];
          map.setView(latLng, 13, { animate: true });
          const marker = markersById.get(id);
          if (marker) marker.openPopup();
        }

        // Başka açık detay varsa kapat
        if (openDetailsEl && openDetailsEl !== details) {
          openDetailsEl.hidden = true;
          openDetailsEl.parentElement.classList.remove("open");
        }

        // Bu öğeyi toggle et
        const willOpen = details.hidden;
        details.hidden = !willOpen;
        itemEl.classList.toggle("open", willOpen);
        openDetailsEl = willOpen ? details : null;
      });
    });

    // Liste dışına tıklayınca açık detay kapanır
    document.addEventListener("click", (e) => {
      if (!openDetailsEl) return;
      const clickedInsideList = listContainer.contains(e.target);
      if (!clickedInsideList) {
        openDetailsEl.hidden = true;
        openDetailsEl.parentElement.classList.remove("open");
        openDetailsEl = null;
      }
    });

    // Haritaya (boş bir yere) tıklayınca da kapat
    map.on("click", () => {
      if (openDetailsEl) {
        openDetailsEl.hidden = true;
        openDetailsEl.parentElement.classList.remove("open");
        openDetailsEl = null;
      }
    });

    // Herhangi bir popup açıldığında istersen liste detayını da kapat
    map.on("popupopen", () => {
      if (openDetailsEl) {
        openDetailsEl.hidden = true;
        openDetailsEl.parentElement.classList.remove("open");
        openDetailsEl = null;
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupEventSearch();
  loadEventsOnMap().catch((err) =>
    console.error("Etkinlik haritası yükleme hatası:", err)
  );
});
