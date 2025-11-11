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
 * Haber için kaynak linki HTML'i
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

/**
 * Ortak slider davranışı
 * container: .slider
 * captionBox: slider dışındaki açıklama kutusu
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

  container.addEventListener("click", (e) => {
    if (e.target.closest(".slider-btn") || e.target.closest(".dot")) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    showSlide(x < rect.width / 2 ? index - 1 : index + 1);
  });

  showSlide(0);
}

/**
 * Manşet haberi karta basar.
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
  const sourceMetaEl = card.querySelector(".card-meta-source");

  if (tagEl) tagEl.textContent = news.category || "Haber";
  if (titleEl) titleEl.textContent = news.title || "";
  if (metaEl) metaEl.textContent = formatDate(news.createdAt);
  if (textEl) textEl.textContent = news.summary || "";
  if (linkEl) linkEl.href = `haber.html?id=${news.id}`;
  if (sourceMetaEl) sourceMetaEl.innerHTML = buildSourceHtml(news);
}

/**
 * Küçük haber kartlarını grid içerisine basar.
 */
export function renderSmallNews(items) {
  // ÖNEMLİ: HTML'deki container .news-grid-small
  const grid = document.querySelector(".news-grid-small");
  if (!grid) return;

  grid.innerHTML = "";

  items.forEach((news, index) => {
    const card = document.createElement("article");
    card.className = "card card-small";

    // İstersen ufak layout çeşitliliği:
    const mod = index % 3;
    if (mod === 1) card.classList.add("card-small--wide");
    if (mod === 2) card.classList.add("card-small--tall");

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
      // Tek görsel
      const img = images[0];
      mediaHtml = `
        <div class="card-media">
          <img
            src="${escapeHtml(img.url)}"
            alt="${escapeHtml(news.title || "")}"
          />
        </div>
      `;

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

    if (images.length > 1) {
      const sliderEl = card.querySelector(".card-media.slider");
      const captionBox = document.createElement("div");
      captionBox.className = "slider-caption";
      sliderEl.appendChild(captionBox);

      setupSlider(sliderEl, captionBox);
    }
  });
}
