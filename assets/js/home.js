// assets/js/home.js

import { db } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { setupEventModal, openEventModal } from "./eventModal.js";

/* ---------- Yardımcılar ---------- */

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

/* ---------- SLIDER ORTAK FONKSİYONU ---------- */

function setupSlider(container) {
  if (!container) return;

  const slides = Array.from(container.querySelectorAll(".slides img"));
  const dots = Array.from(container.querySelectorAll(".slider-dots .dot"));
  const prev = container.querySelector(".slider-btn.prev");
  const next = container.querySelector(".slider-btn.next");

  const total = slides.length;
  if (total <= 1) return;

  let index = 0;

  function showSlide(i) {
    index = (i + total) % total;
    slides.forEach((img, n) => img.classList.toggle("active", n === index));
    dots.forEach((d, n) => d.classList.toggle("active", n === index));
  }

  if (prev) {
    prev.addEventListener("click", (e) => {
      e.stopPropagation();
      showSlide(index - 1);
    });
  }

  if (next) {
    next.addEventListener("click", (e) => {
      e.stopPropagation();
      showSlide(index + 1);
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = Number(dot.dataset.index) || 0;
      showSlide(i);
    });
  });

  container.addEventListener("click", (e) => {
    if (e.target.closest(".slider-btn") || e.target.closest(".dot")) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (x < rect.width / 2) {
      showSlide(index - 1);
    } else {
      showSlide(index + 1);
    }
  });

  showSlide(0);
}

/* ---------- HABERLER ---------- */

async function loadNews() {
  const newsRef = collection(db, "news");
  const q = query(newsRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const allNews = [];
  snap.forEach((doc) => allNews.push({ id: doc.id, ...doc.data() }));

  if (!allNews.length) return;

  const visibleNews = allNews.filter(isRecordVisible);
  if (!visibleNews.length) return;

  const featured = visibleNews.find((n) => n.isFeatured) || visibleNews[0];
  const others = visibleNews.filter((n) => n.id !== featured.id).slice(0, 6); // küçük kartlar

  renderFeaturedCard(featured);
  renderSmallNews(others);
  renderTicker(visibleNews);
}

// -------- Manşet kartı --------
function renderFeaturedCard(featured) {
  const featuredCard = document.querySelector(".card-featured");
  if (!featuredCard || !featured) return;

  const images = Array.isArray(featured.images) ? featured.images : [];

  if (images.length) {
    let media = featuredCard.querySelector(".card-media");
    if (!media) {
      media = document.createElement("div");
      media.className = "card-media slider";
      featuredCard.prepend(media);
    } else {
      media.classList.add("slider");
    }

    featuredCard.classList.add("has-media");

    media.innerHTML = `
      <div class="slides">
        ${images
          .map(
            (url, i) =>
              `<img src="${url}" class="${i === 0 ? "active" : ""}" alt="${
                featured.title || ""
              }">`
          )
          .join("")}
      </div>
      <button class="slider-btn prev" type="button">&#10094;</button>
      <button class="slider-btn next" type="button">&#10095;</button>
      <div class="slider-dots">
        ${images
          .map(
            (_, i) =>
              `<span class="dot ${
                i === 0 ? "active" : ""
              }" data-index="${i}"></span>`
          )
          .join("")}
      </div>
    `;

    setupSlider(media);
  }

  const tagEl = featuredCard.querySelector(".card-tag");
  const titleEl = featuredCard.querySelector(".card-title");
  const metaEl = featuredCard.querySelector(".card-meta");
  const textEl = featuredCard.querySelector(".card-text");
  const linkEl = featuredCard.querySelector(".card-link");

  if (tagEl) tagEl.textContent = featured.category || "Haber";
  if (titleEl) titleEl.textContent = featured.title || "";
  if (metaEl) metaEl.textContent = formatDate(featured.createdAt);
  if (textEl) textEl.textContent = featured.summary || "";
  if (linkEl) {
    linkEl.href = "haber.html?id=" + featured.id;
    linkEl.textContent = "Haberi oku";
  }
}

// -------- Küçük haber kartları --------
function renderSmallNews(others) {
  const grid = document.querySelector(".news-grid-small");
  if (!grid) return;

  grid.innerHTML = "";
  others.forEach((n, index) => {
    const el = document.createElement("article");
    el.className = "card card-small";

    // 6 farklı kart tipi: wide, tall, highlight, compact, horizontal, overlay
    const mod = index % 6;

    if (mod === 0) {
      el.classList.add("card-small--wide");
    } else if (mod === 1) {
      el.classList.add("card-small--tall");
    } else if (mod === 2) {
      el.classList.add("card-small--highlight");
    } else if (mod === 3) {
      el.classList.add("card-small--compact");
    } else if (mod === 4) {
      el.classList.add("card-small--horizontal");
    } else if (mod === 5) {
      el.classList.add("card-small--overlay");
    }

    const images = Array.isArray(n.images) ? n.images : [];

    if (images.length > 0) {
      el.classList.add("has-media");
    }

    let mediaHtml = "";
    if (images.length > 1) {
      mediaHtml = `
        <div class="card-media slider">
          <div class="slides">
            ${images
              .map(
                (url, i) =>
                  `<img src="${url}" class="${i === 0 ? "active" : ""}" alt="${
                    n.title || ""
                  }" loading="lazy">`
              )
              .join("")}
          </div>
          <button class="slider-btn prev" type="button">&#10094;</button>
          <button class="slider-btn next" type="button">&#10095;</button>
          <div class="slider-dots">
            ${images
              .map(
                (_, i) =>
                  `<span class="dot ${
                    i === 0 ? "active" : ""
                  }" data-index="${i}"></span>`
              )
              .join("")}
          </div>
        </div>
      `;
    } else if (images.length === 1) {
      mediaHtml = `
        <div class="card-media">
          <img src="${images[0]}" alt="${n.title || ""}" loading="lazy">
        </div>
      `;
    }

    el.innerHTML = `
      ${mediaHtml}
      <div class="card-tag">${n.category || "Haber"}</div>
      <h4 class="card-title">${n.title}</h4>
      <p class="card-meta">${formatDate(n.createdAt)}</p>
      <p class="card-text">${n.summary || ""}</p>
      <a href="haber.html?id=${n.id}" class="card-link">Oku</a>
    `;

    grid.appendChild(el);

    if (images.length > 1) {
      const sliderEl = el.querySelector(".card-media.slider");
      setupSlider(sliderEl);
    }
  });
}

// -------- Kayan yazı --------
function renderTicker(news) {
  const ticker = document.getElementById("ticker-items");
  if (!ticker) return;

  const visibles = news.filter(isRecordVisible);

  ticker.innerHTML = visibles
    .slice(0, 8)
    .map((n) => `<a href="haber.html?id=${n.id}">${n.title || "Haber"}</a>`)
    .join("");
}

/* ---------- ETKİNLİKLER ---------- */

async function loadEvents() {
  const evRef = collection(db, "events");
  const q = query(evRef, orderBy("startDate", "asc"), limit(50));
  const snap = await getDocs(q);

  const eventsAll = [];
  snap.forEach((doc) => eventsAll.push({ id: doc.id, ...doc.data() }));

  // --- BUGÜNDEN ÖNCEKİ ETKİNLİKLERİ ELE ---
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcomingAll = eventsAll.filter((ev) => {
    if (!ev.startDate) return false;

    const d = ev.startDate?.toDate
      ? ev.startDate.toDate()
      : new Date(ev.startDate);

    if (isNaN(d.getTime())) return false;

    // Sadece bugünden sonraki (veya bugünkü) etkinlikler
    return d >= today;
  });

  // isVisible filtresi
  const events = upcomingAll.filter(isRecordVisible);

  // Etkinlik listesi
  const list = document.querySelector(".event-list");
  if (list) {
    list.innerHTML = "";
    if (!events.length) {
      const li = document.createElement("li");
      li.textContent = "Yaklaşan etkinlik bulunmuyor.";
      list.appendChild(li);
    } else {
      events.forEach((ev) => {
        const d = ev.startDate?.toDate
          ? ev.startDate.toDate()
          : new Date(ev.startDate);
        const dateStr = d.toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "short",
        });

        const timeStr = ev.startTime ? `, ${ev.startTime}` : ""; // varsa saat ekle
        const li = document.createElement("li");
        li.innerHTML = `
          <span class="event-date">${dateStr}${timeStr}</span>
          <div class="event-info">
            <strong>${ev.title}</strong>
            <span>${ev.locationName || ""}</span>
          </div>
        `;

        // Liste satırına tıklayınca modal aç
        li.addEventListener("click", () => openEventModal(ev));

        list.appendChild(li);
      });
    }
  }

  // Yakındaki etkinlikler
  const nearbyBox = document.getElementById("nearby-events-list");
  if (!nearbyBox) return;

  if (!events.length) {
    nearbyBox.textContent = "Yaklaşan ve yakın etkinlik bulunmuyor.";
    return;
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => showNearby(events, pos.coords.latitude, pos.coords.longitude),
      () => (nearbyBox.innerText = "Konum alınamadı.")
    );
  } else {
    nearbyBox.innerText = "Tarayıcınız konum desteği sağlamıyor.";
  }
}

function showNearby(events, lat, lng) {
  const nearDiv = document.getElementById("nearby-events-list");
  if (!nearDiv) return;

  const nearby = events
    .filter((ev) => typeof ev.lat === "number" && typeof ev.lng === "number")
    .map((ev) => ({
      ...ev,
      distance: haversine(lat, lng, ev.lat, ev.lng),
    }))
    .filter((ev) => ev.distance <= 200)
    .sort((a, b) => a.distance - b.distance);

  if (!nearby.length) {
    nearDiv.textContent = "Yakın etkinlik bulunamadı.";
    return;
  }

  nearDiv.innerHTML = nearby
    .map(
      (ev) =>
        `<button type="button" class="nearby-event-btn">
          <strong>${ev.title}</strong> (${ev.distance.toFixed(1)} km) – ${
          ev.locationName
        }
        </button>`
    )
    .join("");

  // Yakın etkinlik butonlarına modal bağla
  const buttons = nearDiv.querySelectorAll(".nearby-event-btn");
  buttons.forEach((btn, i) => {
    const ev = nearby[i];
    btn.addEventListener("click", () => openEventModal(ev));
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/* ---------- Başlat ---------- */

(async function init() {
  try {
    // Ortak modal davranışları
    setupEventModal();

    await loadNews();
    await loadEvents();
  } catch (err) {
    console.error("Ana sayfa yükleme hatası:", err);
  }
})();
