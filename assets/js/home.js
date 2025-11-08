// assets/js/home.js

import { db } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// Firestore'daki images[] alanından ilk görseli al (fallback olarak dursun)
function getFirstImage(item) {
  if (!item) return null;
  if (Array.isArray(item.images) && item.images.length > 0) {
    return item.images[0];
  }
  return null;
}

/* ---------- SLIDER ORTAK FONKSİYONU ---------- */

function setupSlider(container) {
  if (!container) return;

  const slides = Array.from(container.querySelectorAll(".slides img"));
  const dots = Array.from(container.querySelectorAll(".slider-dots .dot"));
  const prev = container.querySelector(".slider-btn.prev");
  const next = container.querySelector(".slider-btn.next");

  const total = slides.length;
  if (total <= 1) return; // tek görselde slider kurmaya gerek yok

  let index = 0;

  function showSlide(i) {
    index = (i + total) % total;
    slides.forEach((img, n) => img.classList.toggle("active", n === index));
    dots.forEach((d, n) => d.classList.toggle("active", n === index));
  }

  // Ok butonları
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

  // Dot'lar
  dots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = Number(dot.dataset.index) || 0;
      showSlide(i);
    });
  });

  // Görselin sağına-soluna tıklayınca kaydır
  container.addEventListener("click", (e) => {
    // Dot veya ok'a tıklandıysa burası çalışmasın
    if (e.target.closest(".slider-btn") || e.target.closest(".dot")) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (x < rect.width / 2) {
      showSlide(index - 1);
    } else {
      showSlide(index + 1);
    }
  });

  // İlk slide'ı garanti et
  showSlide(0);
}

/* ---------- HABERLER ---------- */

async function loadNews() {
  const newsRef = collection(db, "news");
  const q = query(newsRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const news = [];
  snap.forEach((doc) => news.push({ id: doc.id, ...doc.data() }));

  if (!news.length) return;

  const featured = news.find((n) => n.isFeatured) || news[0];
  const others = news.filter((n) => n.id !== featured.id).slice(0, 6);

  renderFeaturedCard(featured);
  renderSmallNews(others);
  renderTicker(news);
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

    // ----- Kart varyantını index’e göre belirle -----
    const mod = index % 6; // 0..5 arasında döner

    if (mod === 0) {
      // İlk, 7., 13. kart vs → geniş kart
      el.classList.add("card-small--wide");
    } else if (mod === 1) {
      // 2., 8., 14. kart → uzun kart
      el.classList.add("card-small--tall");
    } else if (mod === 2) {
      // 3., 9., 15. kart → vurgulu kart
      el.classList.add("card-small--highlight");
    } else if (mod === 3) {
      // 4., 10., 16. kart → kompakt kart
      el.classList.add("card-small--compact");
    }
    // mod 4 ve 5 → standart kart kalır

    // -------- Görsel kısmı aynı kalsın --------
    const images = Array.isArray(n.images) ? n.images : [];
    const hasImage = images.length > 0;

    if (hasImage) {
      el.classList.add("has-media");
    }

    let mediaHtml = "";
    if (images.length > 1) {
      // Çoklu görsel: küçük kartta slider
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
      // Tek görsel: normal img
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

    // Eğer küçük kartta çoklu görsel varsa slider'ı aktif et
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

  ticker.innerHTML = news
    .slice(0, 8)
    .map((n) => `<a href="haber.html?id=${n.id}">${n.title || "Haber"}</a>`)
    .join("");
}

/* ---------- ETKİNLİKLER ---------- */

async function loadEvents() {
  const evRef = collection(db, "events");
  const q = query(evRef, orderBy("startDate", "asc"), limit(5));
  const snap = await getDocs(q);

  const events = [];
  snap.forEach((doc) => events.push({ id: doc.id, ...doc.data() }));

  const list = document.querySelector(".event-list");
  if (!list) return;

  list.innerHTML = "";
  events.forEach((ev) => {
    const d = ev.startDate?.toDate
      ? ev.startDate.toDate()
      : new Date(ev.startDate);
    const dateStr = d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
    });
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="event-date">${dateStr}</span>
      <div class="event-info">
        <strong>${ev.title}</strong>
        <span>${ev.locationName || ""}</span>
      </div>
    `;
    list.appendChild(li);
  });

  const nearbyBox = document.getElementById("nearby-events-list");
  if (!nearbyBox) return;

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
        `<p><strong>${ev.title}</strong> (${ev.distance.toFixed(1)} km) – ${
          ev.locationName
        }</p>`
    )
    .join("");
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
    await loadNews();
    await loadEvents();
  } catch (err) {
    console.error("Ana sayfa yükleme hatası:", err);
  }
})();
