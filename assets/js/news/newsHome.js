// assets/js/news/newsHome.js

import { db } from "../firebase.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { renderFeaturedCard, renderSmallNews } from "./newsCards.js";

import { setupEventModal, openEventModal } from "../events/eventModal.js";

import { isRecordVisible } from "../helpers.js";

/* ---------------------------------------------------
   1) HABERLERİ YÜKLE
--------------------------------------------------- */
async function loadNews() {
  const ref = collection(db, "news");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const list = [];
  snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));

  // görünür olanlar
  const visible = list.filter(isRecordVisible);

  if (!visible.length) return;

  // 1. haber manşet
  renderFeaturedCard(visible[0]);

  // geri kalan küçük kartlar
  renderSmallNews(visible.slice(1));

  // haber ticker
  loadNewsTicker(visible);
}

/* ---------------------------------------------------
   2) HABER TICKER
--------------------------------------------------- */
function loadNewsTicker(newsList) {
  const ticker = document.querySelector(".ticker-items");
  if (!ticker) return;

  ticker.innerHTML = newsList
    .slice(0, 15)
    .map(
      (n) => `
      <a class="ticker-item" href="haber.html?id=${n.id}">
        ${n.title}
      </a>`
    )
    .join("");
}

/* ---------------------------------------------------
   3) YAKLAŞAN ETKİNLİKLER
--------------------------------------------------- */
async function loadUpcomingEvents() {
  const listEl = document.getElementById("home-upcoming-events");
  if (!listEl) return;

  listEl.innerHTML =
    '<li><span style="opacity:.7;">Etkinlikler yükleniyor...</span></li>';

  const evRef = collection(db, "events");
  const q = query(evRef, orderBy("startDate", "asc"));
  const snap = await getDocs(q);

  const eventsAll = [];
  snap.forEach((doc) => eventsAll.push({ id: doc.id, ...doc.data() }));

  const visible = eventsAll.filter(isRecordVisible);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = visible
    .filter((ev) => {
      if (!ev.startDate) return false;
      const d = ev.startDate.toDate
        ? ev.startDate.toDate()
        : new Date(ev.startDate);
      if (Number.isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d >= today;
    })
    .slice(0, 5);

  if (!upcoming.length) {
    listEl.innerHTML =
      '<li><span style="opacity:.7;">Yaklaşan etkinlik bulunamadı.</span></li>';
    return;
  }

  // id → event map'i
  const eventMap = new Map();
  upcoming.forEach((ev) => eventMap.set(ev.id, ev));

  listEl.innerHTML = upcoming
    .map((ev) => {
      const d = ev.startDate
        ? ev.startDate.toDate
          ? ev.startDate.toDate()
          : new Date(ev.startDate)
        : null;

      let dateHtml = "";
      if (d && !Number.isNaN(d.getTime())) {
        const gun = d.toLocaleDateString("tr-TR", { day: "numeric" });
        const ay = d.toLocaleDateString("tr-TR", { month: "short" });
        const yil = d.toLocaleDateString("tr-TR", { year: "numeric" });
        dateHtml = `${gun} ${ay}<br>${yil}`;
      }

      const title = ev.title || "Etkinlik";
      const loc = ev.locationName || ev.city || "";

      return `
        <li data-event-id="${ev.id}">
          <div class="event-date">${dateHtml}</div>
          <button type="button" class="nearby-event-btn">
            <div class="event-info">
              <strong>${title}</strong>
              ${loc ? `<span>${loc}</span>` : ""}
            </div>
          </button>
        </li>
      `;
    })
    .join("");

  // 🔗 Butonlara modal açma davranışı ekle
  listEl
    .querySelectorAll("li[data-event-id] .nearby-event-btn")
    .forEach((btn) => {
      const li = btn.closest("li[data-event-id]");
      if (!li) return;
      const id = li.getAttribute("data-event-id");
      const ev = eventMap.get(id);
      if (!ev) return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openEventModal(ev);
      });
    });
}

/* ---------------------------------------------------
   4) YAKININIZDAKİ ETKİNLİKLER (lat/lng + mesafe sınırı + modal)
--------------------------------------------------- */
async function loadNearbyEvents() {
  const listEl = document.getElementById("home-nearby-events");
  if (!listEl) return;

  listEl.innerHTML =
    '<li><span style="opacity:.7;">Konum alınıyor...</span></li>';

  if (!navigator.geolocation) {
    listEl.innerHTML =
      '<li><span style="opacity:.7;">Tarayıcı konum bilgisini desteklemiyor.</span></li>';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      listEl.innerHTML =
        '<li><span style="opacity:.7;">Etkinlikler yükleniyor...</span></li>';

      const evRef = collection(db, "events");
      const q = query(evRef, orderBy("startDate", "asc"));
      const snap = await getDocs(q);

      const eventsAll = [];
      snap.forEach((doc) => eventsAll.push({ id: doc.id, ...doc.data() }));

      const visible = eventsAll.filter(isRecordVisible);

      // Bugünden sonrası
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = visible.filter((ev) => {
        if (!ev.startDate) return false;
        const d = ev.startDate.toDate
          ? ev.startDate.toDate()
          : new Date(ev.startDate);
        if (Number.isNaN(d.getTime())) return false;
        d.setHours(0, 0, 0, 0);
        return d >= today;
      });

      function distanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const toRad = (deg) => (deg * Math.PI) / 180;

        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);

        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }

      const withDistance = upcoming
        .filter(
          (ev) =>
            typeof ev.lat === "number" &&
            !Number.isNaN(ev.lat) &&
            typeof ev.lng === "number" &&
            !Number.isNaN(ev.lng)
        )
        .map((ev) => ({
          ev,
          dist: distanceKm(userLat, userLng, ev.lat, ev.lng),
        }));

      const MAX_DISTANCE_KM = 50; // yakını = 50 km

      const nearby = withDistance
        .filter((item) => item.dist <= MAX_DISTANCE_KM)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);

      if (!nearby.length) {
        listEl.innerHTML =
          '<li><span style="opacity:.7;">Yakınınızda etkinlik bulunamadı.</span></li>';
        return;
      }

      // id → event map (kolay erişim için)
      const eventMap = new Map();
      nearby.forEach(({ ev }) => eventMap.set(ev.id, ev));

      listEl.innerHTML = nearby
        .map(({ ev, dist }) => {
          const d = ev.startDate
            ? ev.startDate.toDate
              ? ev.startDate.toDate()
              : new Date(ev.startDate)
            : null;

          let dateHtml = "";
          if (d && !Number.isNaN(d.getTime())) {
            const gun = d.toLocaleDateString("tr-TR", { day: "numeric" });
            const ay = d.toLocaleDateString("tr-TR", { month: "short" });
            const time = ev.startTime || "";
            dateHtml = time ? `${gun} ${ay}<br>${time}` : `${gun} ${ay}`;
          }

          const title = ev.title || "Etkinlik";
          const loc = ev.locationName || ev.city || "";
          const kmText = `${Math.round(dist)} km`;

          return `
            <li data-event-id="${ev.id}">
              <div class="event-date">${kmText}</div>
              <button type="button" class="nearby-event-btn">
                <div class="event-info">
                  <strong>${title}</strong>
                  <span>
                    ${loc ? `${loc} · ` : ""}${dateHtml}
                  </span>
                </div>
              </button>
            </li>
          `;
        })
        .join("");

      // 🔗 Butonlara modal açma davranışı ekle
      listEl
        .querySelectorAll("li[data-event-id] .nearby-event-btn")
        .forEach((btn) => {
          const li = btn.closest("li[data-event-id]");
          if (!li) return;
          const id = li.getAttribute("data-event-id");
          const ev = eventMap.get(id);
          if (!ev) return;

          btn.addEventListener("click", (e) => {
            e.preventDefault();
            openEventModal(ev);
          });
        });
    },
    () => {
      listEl.innerHTML =
        '<li><span style="opacity:.7;">Konum izni verilmediği için yakınınızdaki etkinlikler gösterilemiyor.</span></li>';
    },
    {
      enableHighAccuracy: true,
      timeout: 7000,
    }
  );
}

/* ---------------------------------------------------
   5) ANA SAYFA BAŞLAT
--------------------------------------------------- */
async function initHome() {
  await loadNews();
  await loadUpcomingEvents();
  await loadNearbyEvents();
  setupEventModal();
}

document.addEventListener("DOMContentLoaded", initHome);
