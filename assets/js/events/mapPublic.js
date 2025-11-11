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
      map.setView(latLng, 13, { animate: true });
      marker.openPopup();
    });

    boundsLatLngs.push([lat, lng]);

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

document.addEventListener("DOMContentLoaded", () => {
  loadEventsOnMap().catch((err) =>
    console.error("Etkinlik haritası yükleme hatası:", err)
  );
});
