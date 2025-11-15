// assets/js/news/newsCards.js
import { formatDate, escapeHtml } from "../helpers.js";

/**
 * Firestore'dan gelen görsel stringini çözer.
 * Format:
 *   "url"
 *   "url||caption"
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
 * Ortak slider davranışı
 * container: .slider
 * captionBox: slider içindeki açıklama kutusu
 *  - Burada sadece GÖRSEL altyazısı (caption) gösteriyoruz.
 *  - Haber kaynağı (sourceUrl/sourceLabel) artık burada YOK.
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
    if (!current) {
      captionBox.innerHTML = "";
      return;
    }

    const caption = current.dataset.caption || "";
    const url = current.dataset.url || "";

    if (!caption) {
      captionBox.innerHTML = "";
      return;
    }

    // URL varsa caption'ı link yap, yoksa düz yazı
    if (url) {
      captionBox.innerHTML = `
        <a href="${url}"
           class="footer-link"
           target="_blank"
           rel="noopener noreferrer">
          ${caption}
        </a>
      `;
    } else {
      captionBox.textContent = caption;
    }
  }

  function showSlide(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((img, n) => img.classList.toggle("active", n === index));
    dots.forEach((d, n) => d.classList.toggle("active", n === index));
    updateCaption();
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

  dots.forEach((dot, iDot) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      showSlide(iDot);
    });
  });

  // Resme tıklayınca sağ/sol alanına göre slide değişsin
  container.addEventListener("click", (e) => {
    if (e.target.closest(".slider-btn") || e.target.closest(".dot")) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    showSlide(x < rect.width / 2 ? index - 1 : index + 1);
  });

  showSlide(0);
}

/**
 * Admin panelde seçilen cardType değerini CSS class'a çevirir.
 * cardType yoksa, eski davranış (index'e göre wide / tall) korunur.
 */
function getCardTypeClass(news, index) {
  const raw = (news.cardType || "").toString().trim().toLowerCase();

  switch (raw) {
    case "vertical":
      return "card-small--vertical"; // dikey büyük kart
    case "split":
      return "card-small--split"; // solda görsel, sağda metin
    case "mini":
      return "card-small--mini"; // küçük etkinlik tipi kart
    case "banner":
      return "card-small--banner"; // yatay geniş kart
    default: {
      // Eski davranışı koru: cardType yoksa index'e göre wide/tall
      const mod = index % 3;
      if (mod === 1) return "card-small--wide";
      if (mod === 2) return "card-small--tall";
      return "";
    }
  }
}

/**
 * Manşet haberi karta basar.
 * .card-featured içinde:
 * - .card-tag
 * - .card-title
 * - .card-meta
 * - .card-text
 * - .card-link
 * dolduruluyor.
 * NOT: Artık burada haber KAYNAĞI gösterilmiyor.
 */
export function renderFeaturedCard(news) {
  const card = document.querySelector(".card-featured");
  if (!card || !news) return;

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
                data-url="${escapeHtml(img.url)}"
                data-caption="${escapeHtml(img.caption)}"
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

    card.prepend(media);

    const captionBox = document.createElement("div");
    captionBox.className = "slider-caption";
    media.appendChild(captionBox);

    setupSlider(media, captionBox);
    card.classList.add("has-media");
  }

  const tagEl = card.querySelector(".card-tag");
  const titleEl = card.querySelector(".card-title");
  const metaEl = card.querySelector(".card-meta");
  const textEl = card.querySelector(".card-text");
  const linkEl = card.querySelector(".card-link");

  if (tagEl) tagEl.textContent = news.category || "Haber";
  if (titleEl) titleEl.textContent = news.title || "";
  if (metaEl) metaEl.textContent = formatDate(news.createdAt);
  if (textEl) textEl.textContent = news.summary || "";

  if (linkEl) {
    linkEl.href = `haber.html?id=${news.id}`;
    linkEl.textContent = "Haberi Oku";
  }
}

/**
 * Küçük haber kartlarını grid içerisine basar.
 * Kart tipleri:
 *  - default (wide/tall index'e göre)
 *  - vertical / split / mini / banner  (admin cardType ile)
 * NOT: Burada da haber kaynağı artık gösterilmiyor.
 */
export function renderSmallNews(items) {
  const grid = document.querySelector(".news-grid-small");
  if (!grid) return;

  grid.innerHTML = "";

  items.forEach((news, index) => {
    const card = document.createElement("article");
    card.className = "card card-small";

    const typeClass = getCardTypeClass(news, index);
    if (typeClass) {
      card.classList.add(typeClass);
    }

    const images = (Array.isArray(news.images) ? news.images : [])
      .map(decodeImageEntry)
      .filter(Boolean);

    const detailUrl = `haber.html?id=${news.id}`;

    let mediaHtml = "";
    if (images.length > 0) {
      card.classList.add("has-media");
      mediaHtml = `
        <div class="card-media slider">
          <div class="slides">
            ${images
              .map(
                (img, i) => `
                  <img
                    src="${escapeHtml(img.url)}"
                    data-url="${escapeHtml(img.url)}"
                    data-caption="${escapeHtml(img.caption)}"
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
    }

    const isSplit = card.classList.contains("card-small--split");

    // SPLIT kart: solda görsel, sağda tek bir .card-content içinde
    if (isSplit) {
      card.innerHTML = `
        ${mediaHtml}
        <div class="card-content">
          <div class="card-tag">${escapeHtml(news.category || "Haber")}</div>
          <h4 class="card-title">${escapeHtml(news.title || "")}</h4>
          <p class="card-meta">${formatDate(news.createdAt)}</p>
        </div>
      `;
    } else {
      // Diğer kart tipleri eski davranış (Haberi Oku vs)
      card.innerHTML = `
        ${mediaHtml}
        <div class="card-tag">${escapeHtml(news.category || "Haber")}</div>
        <h4 class="card-title">${escapeHtml(news.title || "")}</h4>
        <p class="card-meta">${formatDate(news.createdAt)}</p>
        <p class="card-text">${escapeHtml(news.summary || "")}</p>
        <a href="${detailUrl}" class="card-link">Haberi Oku</a>
      `;
    }

    grid.appendChild(card);

    // Kartı tıklanabilir yap: WIDE + SPLIT tipleri
    if (
      card.classList.contains("card-small--wide") ||
      card.classList.contains("card-small--split")
    ) {
      card.style.cursor = "pointer";
      card.addEventListener("click", (evt) => {
        const isSliderControl = evt.target.closest(".slider-btn, .slider-dots");
        if (isSliderControl) return;
        window.location.href = detailUrl;
      });
    }

    // Slider varsa küçük kartta da caption’ı kur
    if (images.length > 0) {
      const sliderEl = card.querySelector(".card-media.slider");
      if (sliderEl) {
        const captionBox = document.createElement("div");
        captionBox.className = "slider-caption";
        sliderEl.appendChild(captionBox);
        setupSlider(sliderEl, captionBox);
      }
    }
  });
}
