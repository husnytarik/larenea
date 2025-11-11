// assets/js/home.js
//
// Ana sayfa: haberler + slider mantığı
// - Firestore'dan "news" koleksiyonunu çeker
// - Öne çıkan (featured) haberi büyük kartta gösterir
// - Diğer birkaç haberi küçük kartlarda listeler
// - Çok görselli haberlerde slider + her görsel için caption/link gösterir

import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { setupEventModal } from "./eventModal.js";

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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Firestore'dan gelen görsel stringini çözer.
 * Desteklenen formatlar:
 *   - "https://...jpg"
 *   - "https://...jpg||John Doe / Unsplash (Lisans bilgisi)"
 */
function decodeImageEntry(entry) {
  if (!entry) return null;
  const str = String(entry);
  const [urlPart, captionPart] = str.split("||");
  const url = (urlPart || "").trim();
  if (!url) return null;
  const caption = (captionPart || "").trim();
  return { url, caption };
}

/**
 * Tek bir haber için "Kaynak" HTML'i üretir.
 * - Hem URL hem label varsa → label metni tıklanabilir link olur.
 * - Sadece URL varsa → URL metin olarak gösterilir.
 */
function buildSourceHtml(news) {
  const url = (news.sourceUrl || "").trim();
  const rawLabel = (news.sourceLabel || "").trim();

  if (!url && !rawLabel) return "";

  const label = rawLabel || url;
  const safeUrl = escapeHtml(url || "#");
  const safeLabel = escapeHtml(label);

  return `
    <div class="footer-bottom">
      <a href="${safeUrl}"
         target="_blank"
         rel="noopener noreferrer"
         class="footer-link">
        ${safeLabel}
      </a>
    </div>
  `;
}

/* ---------- Slider ---------- */

/**
 * Her slider için ortak davranış.
 * - container: .slider div'i (içinde .slides img, .slider-dots, butonlar var)
 * - captionBox: Görsel açıklamasının yazılacağı element (slider'ın DIŞINDA)
 */
function setupSlider(container, captionBox) {
  if (!container) return;

  const slides = Array.from(container.querySelectorAll(".slides img"));
  const dots = Array.from(container.querySelectorAll(".slider-dots .dot"));
  const prev = container.querySelector(".slider-btn.prev");
  const next = container.querySelector(".slider-btn.next");

  if (!slides.length) return;

  let index = 0;

  function updateCaption() {
    if (!captionBox) return;
    const current = slides[index];
    const caption = current.dataset.caption || "";
    const link = current.dataset.link || current.src || "";

    if (!caption && !link) {
      captionBox.innerHTML = "";
      return;
    }

    const safeLink = escapeHtml(link);
    const safeCaption = escapeHtml(caption || link);

    captionBox.innerHTML = `
      <div class="footer-bottom">
        <a href="${safeLink}"
           target="_blank"
           rel="noopener noreferrer"
           class="footer-link">
          ${safeCaption}
        </a>
      </div>
    `;
  }

  function showSlide(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((img, n) => img.classList.toggle("active", n === index));
    dots.forEach((d, n) => d.classList.toggle("active", n === index));
    updateCaption();
  }

  // Butonlar
  if (prev)
    prev.addEventListener("click", (e) => {
      e.stopPropagation();
      showSlide(index - 1);
    });

  if (next)
    next.addEventListener("click", (e) => {
      e.stopPropagation();
      showSlide(index + 1);
    });

  // Dots
  dots.forEach((dot, iDot) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      showSlide(iDot);
    });
  });

  // Slide alanına tıklanarak sağ/sol gezinme
  container.addEventListener("click", (e) => {
    if (e.target.closest(".slider-btn") || e.target.closest(".dot")) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    showSlide(x < rect.width / 2 ? index - 1 : index + 1);
  });

  // Başlangıç
  showSlide(0);
}

/* ---------- Haberler ---------- */

async function loadNews() {
  const newsRef = collection(db, "news");
  const q = query(newsRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const allNews = [];
  snap.forEach((docSnap) => {
    allNews.push({ id: docSnap.id, ...docSnap.data() });
  });

  // isVisible === false ise gösterme
  const visibleNews = allNews.filter((n) => n.isVisible !== false);
  if (!visibleNews.length) return;

  const featured = visibleNews.find((n) => n.isFeatured) || visibleNews[0];
  const others = visibleNews.filter((n) => n.id !== featured.id).slice(0, 6);

  renderFeaturedCard(featured);
  renderSmallNews(others);
}

/**
 * Manşet haberi kartını doldurur.
 */
function renderFeaturedCard(news) {
  const card = document.querySelector(".card-featured");
  if (!card || !news) return;

  // Görseller
  const images = (Array.isArray(news.images) ? news.images : [])
    .map(decodeImageEntry)
    .filter(Boolean);

  if (images.length) {
    const media = document.createElement("div");
    media.className = "card-media slider";

    media.innerHTML = `
      <div class="slides">
        ${images
          .map(
            (img, i) => `
              <img
                src="${escapeHtml(img.url)}"
                data-caption="${escapeHtml(img.caption)}"
                data-link="${escapeHtml(img.url)}"
                class="${i === 0 ? "active" : ""}"
                alt="${escapeHtml(news.title || "")}"
              />
            `
          )
          .join("")}
      </div>
      <button class="slider-btn prev" type="button">&#10094;</button>
      <button class="slider-btn next" type="button">&#10095;</button>
      <div class="slider-dots">
        ${images
          .map(
            (_, i) => `
              <span class="dot ${
                i === 0 ? "active" : ""
              }" data-index="${i}"></span>
            `
          )
          .join("")}
      </div>
    `;

    // Manşet kartın en başına görsel slider'ı ekle
    card.prepend(media);

    // Caption için slider'ın DIŞINA kutu koy (dots ile çakışmasın)
    const captionBox = document.createElement("div");
    captionBox.className = "slider-caption";
    // card-media'dan hemen sonra yerleştir
    card.insertBefore(captionBox, media.nextSibling);

    setupSlider(media, captionBox);
    card.classList.add("has-media");
  }

  // Metinler
  const tagEl = card.querySelector(".card-tag");
  const titleEl = card.querySelector(".card-title");
  const metaEl = card.querySelector(".card-meta");
  const textEl = card.querySelector(".card-text");
  const linkEl = card.querySelector(".card-link");
  const sourceEl = card.querySelector(".card-meta-source");

  if (tagEl) tagEl.textContent = news.category || "Haber";
  if (titleEl) titleEl.textContent = news.title || "";
  if (metaEl) metaEl.textContent = formatDate(news.createdAt);
  if (textEl) textEl.textContent = news.summary || "";
  if (linkEl) {
    linkEl.href = "haber.html?id=" + news.id;
    linkEl.textContent = "Haberi Oku";
  }

  if (sourceEl) {
    const html = buildSourceHtml(news);
    if (html) {
      sourceEl.style.display = "";
      sourceEl.innerHTML = html;
    } else {
      sourceEl.style.display = "none";
      sourceEl.textContent = "";
    }
  }
}

/**
 * Küçük haber kartlarını grid içerisine basar.
 */
function renderSmallNews(newsList) {
  const grid = document.querySelector(".news-grid-small");
  if (!grid) return;

  grid.innerHTML = "";

  newsList.forEach((news, index) => {
    const card = document.createElement("article");
    card.className = "card card-small";

    // Basit layout çeşitliliği için sınıf ekleyebilirsin (opsiyonel)
    const mod = index % 3;
    if (mod === 1) card.classList.add("card-small--wide");
    if (mod === 2) card.classList.add("card-small--tall");

    // Görseller
    const images = (Array.isArray(news.images) ? news.images : [])
      .map(decodeImageEntry)
      .filter(Boolean);

    let mediaHtml = "";
    let captionAfterSlider = null;

    if (images.length > 1) {
      // Çok görselli kart → slider
      mediaHtml = `
        <div class="card-media slider">
          <div class="slides">
            ${images
              .map(
                (img, i) => `
                  <img
                    src="${escapeHtml(img.url)}"
                    data-caption="${escapeHtml(img.caption)}"
                    data-link="${escapeHtml(img.url)}"
                    class="${i === 0 ? "active" : ""}"
                    alt="${escapeHtml(news.title || "")}"
                  />
                `
              )
              .join("")}
          </div>
          <button class="slider-btn prev" type="button">&#10094;</button>
          <button class="slider-btn next" type="button">&#10095;</button>
          <div class="slider-dots">
            ${images
              .map(
                (_, i) => `
                  <span class="dot ${
                    i === 0 ? "active" : ""
                  }" data-index="${i}"></span>
                `
              )
              .join("")}
          </div>
        </div>
      `;
    } else if (images.length === 1) {
      // Tek görsel → direkt img + caption link
      const img = images[0];
      mediaHtml = `
        <div class="card-media">
          <img
            src="${escapeHtml(img.url)}"
            alt="${escapeHtml(news.title || "")}"
          />
        </div>
      `;

      // Slider yokken de altta küçük caption linki göster
      captionAfterSlider = `
        <div class="slider-caption">
          <div class="footer-bottom">
            <a href="${escapeHtml(img.url)}"
               target="_blank"
               rel="noopener noreferrer"
               class="footer-link">
              ${escapeHtml(img.caption || img.url)}
            </a>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      ${mediaHtml}
      ${captionAfterSlider || ""}
      <div class="card-tag">${escapeHtml(news.category || "Haber")}</div>
      <h4 class="card-title">${escapeHtml(news.title || "")}</h4>
      <p class="card-meta">${formatDate(news.createdAt)}</p>
      <p class="card-text">${escapeHtml(news.summary || "")}</p>
      ${buildSourceHtml(news)}
      <a href="haber.html?id=${news.id}" class="card-link">Oku</a>
    `;

    grid.appendChild(card);

    // Eğer slider varsa, ilgili captionBox'ı slider'ın DIŞINA bulup bağla
    if (images.length > 1) {
      const sliderEl = card.querySelector(".card-media.slider");
      const captionBox = document.createElement("div");
      captionBox.className = "slider-caption";

      // slider'dan hemen sonra yerleştir
      card.insertBefore(captionBox, sliderEl.nextSibling);
      setupSlider(sliderEl, captionBox);
    }
  });
}

/* ---------- Başlat ---------- */

(async function init() {
  try {
    setupEventModal(); // Ortak modal davranışları (etkinlikler vs. için)
    await loadNews();
  } catch (err) {
    console.error("Ana sayfa yüklenirken hata:", err);
  }
})();
