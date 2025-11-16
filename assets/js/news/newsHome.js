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

function getActiveTagFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tag = params.get("tag");
  return tag ? tag.trim() : null;
}
/* ---------------------------------------------------
   0) HABER CACHE
--------------------------------------------------- */
let NEWS_CACHE = [];

/* ---------------------------------------------------
   1) HABERLERİ YÜKLE + ARAMA İÇİN CACHE
--------------------------------------------------- */
async function loadNews() {
  // 1) URL'den aktif etiketi al
  const activeTag = getActiveTagFromUrl();

  // 2) Firestore’dan haberleri çek
  const ref = collection(db, "news");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  NEWS_CACHE = [];
  snap.forEach((docSnap) =>
    NEWS_CACHE.push({ id: docSnap.id, ...docSnap.data() })
  );

  // 3) Yayında olan kayıtlar
  const visible = NEWS_CACHE.filter(isRecordVisible);

  // 4) Listeyi başta tüm görünür haberler olarak ayarla
  let list = visible;

  // 5) Eğer URL’de tag varsa, bu etikete göre filtrele
  if (activeTag) {
    const tagLower = activeTag.toLowerCase();

    list = visible.filter((n) => {
      if (!Array.isArray(n.tags)) return false;
      return n.tags.some((t) => String(t).toLowerCase() === tagLower);
    });
  }

  // 6) Hiç haber kalmadıysa mesaj göster
  if (!list.length) {
    const featuredContainer = document.querySelector(".card-featured");
    const smallGrid = document.querySelector(".news-grid-small");
    if (featuredContainer) {
      featuredContainer.innerHTML = activeTag
        ? "<p>Bu etikete ait haber bulunamadı.</p>"
        : "<p>Haber bulunamadı.</p>";
    }
    if (smallGrid) {
      smallGrid.innerHTML = "";
    }

    // Ticker yine de tüm görünür haberlerden dönsün
    loadNewsTicker(visible);
    setupNewsSearch();
    return;
  }

  // 7) Manşet kartını kullanma, tüm haberleri aynı grid'de göster
  const featuredCard = document.querySelector(".card-featured");
  if (featuredCard) {
    featuredCard.style.display = "none"; // manşet alanını gizle
  }

  // Kart tipi / format sistemi (vertical, split, mini, banner) aynen devam ediyor;
  // sadece ilk haber artık ayrı bir "manşet" görünümünde değil.
  renderSmallNews(list);

  // 8) Ticker tüm görünür haberlerden devam etsin
  loadNewsTicker(visible);

  // 9) Arama kutusunu hazırla
  setupNewsSearch();
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
   4) YAKININIZDAKİ ETKİNLİKLER
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

      const MAX_DISTANCE_KM = 50;

      const nearby = withDistance
        .filter((item) => item.dist <= MAX_DISTANCE_KM)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);

      if (!nearby.length) {
        listEl.innerHTML =
          '<li><span style="opacity:.7;">Yakınınızda etkinlik bulunamadı.</span></li>';
        return;
      }

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
   5) HABER ARAMA
--------------------------------------------------- */
function setupNewsSearch() {
  const input = document.getElementById("search-input");
  const grid = document.querySelector(".news-grid-small");
  const featuredCard = document.querySelector(".card-featured");
  if (!input || !grid || !featuredCard) return;

  input.addEventListener("input", () => {
    const text = input.value.trim().toLowerCase();
    const hasQuery = text.length > 0;

    // Sadece görünür kayıtlar üzerinden çalışalım
    const visibleAll = NEWS_CACHE.filter(isRecordVisible);

    // 🔹 Arama YOKSA → TÜM görünür haberleri tek grid'de göster
    if (!hasQuery) {
      if (!visibleAll.length) {
        grid.innerHTML =
          "<p style='padding:12px;opacity:.7;'>Haber bulunamadı.</p>";
        if (featuredCard) featuredCard.style.display = "none";
        return;
      }

      // Manşet alanını tamamen gizle
      if (featuredCard) {
        featuredCard.style.display = "none";
      }

      // Bütün görünür haberler, seçtiğin kart tipleriyle grid'de
      renderSmallNews(visibleAll);
      return;
    }

    // 🔹 Arama VARSA → manşeti gizle, sadece split sonuçları göster
    // 🔹 Arama VARSA → manşeti gizle, sadece split sonuçları göster
    const filtered = visibleAll.filter((n) => {
      const title = (n.title || "").toLowerCase();
      const summary = (n.summary || "").toLowerCase();
      const category = (n.category || "").toLowerCase();

      // tags alanını da stringe çevirip aramada kullan
      const tagsArray = Array.isArray(n.tags) ? n.tags : [];
      const tagsText = tagsArray.join(" ").toLowerCase();

      return (
        title.includes(text) ||
        summary.includes(text) ||
        category.includes(text) ||
        tagsText.includes(text) // 👈 ETİKETLER DE DAHİL
      );
    });

    // manşet alanını gizle
    featuredCard.style.display = "none";

    if (!filtered.length) {
      grid.innerHTML =
        "<p style='padding:12px;opacity:.7;'>Sonuç bulunamadı.</p>";
      return;
    }

    // ✅ Arama sonuçları: HEPSİ split tipinde, yanyana satırlar
    renderSmallNews(filtered, { forceType: "split" });
  });
}
function getSearchFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  return q ? q.trim() : "";
}

function applyInitialSearchFromUrl() {
  const initial = getSearchFromUrl();
  if (!initial) return;

  const input = document.getElementById("search-input");
  if (!input) return;

  // Arama kutusunu doldur
  input.value = initial;

  // Mevcut input event'ini tetikle → setupNewsSearch'teki filtre çalışsın
  const evt = new Event("input", { bubbles: true });
  input.dispatchEvent(evt);
}

/* ---------------------------------------------------
   6) ANA SAYFA BAŞLAT
--------------------------------------------------- */
async function initHome() {
  await loadNews(); // Haberleri ve arama sistemini kur
  await loadUpcomingEvents();
  await loadNearbyEvents();
  setupEventModal();

  // 👇 URL'de q varsa, sayfa açılır açılmaz aramayı çalıştır
  applyInitialSearchFromUrl();
}

document.addEventListener("DOMContentLoaded", initHome);
