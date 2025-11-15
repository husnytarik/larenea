// assets/js/news/newsDetail.js

import { db } from "../firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { formatDate, escapeHtml } from "../helpers.js";

/* ---------- URL'den id parametresini al ---------- */
function getNewsIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/* ---------- Görsel stringini çöz (newsCards.js ile aynı mantık) ---------- */
function decodeImageEntry(entry) {
  if (!entry) return null;
  const str = String(entry);
  const [urlPart, captionPart] = str.split("||");
  const url = (urlPart || "").trim();
  if (!url) return null;
  const caption = (captionPart || "").trim();
  return { url, caption };
}

/* ---------- Kaynak linki HTML'i ---------- */
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

/* ---------- Ortak slider davranışı (newsCards.js'dekiyle aynı mantık) ---------- */
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

  // Kartın sağ / soluna tıklayınca da ilerlesin
  container.addEventListener("click", (e) => {
    if (e.target.closest(".slider-btn") || e.target.closest(".dot")) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    showSlide(x < rect.width / 2 ? index - 1 : index + 1);
  });

  showSlide(0);
}

/* ---------- Haberi Firestore'dan çekip sayfaya bas ---------- */
async function loadNewsDetail() {
  const id = getNewsIdFromUrl();

  const cardEl = document.getElementById("article-card");
  const mediaEl = document.getElementById("article-media");
  const tagEl = document.getElementById("article-tag");
  const titleEl = document.getElementById("article-title");
  const metaEl = document.getElementById("article-meta");
  const bodyEl = document.getElementById("article-body");
  const sourceEl = document.getElementById("article-source");
  const tagsInlineEl = document.getElementById("article-tags-inline");

  if (!id) {
    if (titleEl) titleEl.textContent = "Haber bulunamadı";
    if (bodyEl)
      bodyEl.textContent = "Geçersiz bağlantı. Lütfen anasayfaya geri dönün.";
    return;
  }

  try {
    const ref = doc(db, "news", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      if (titleEl) titleEl.textContent = "Haber bulunamadı";
      if (bodyEl)
        bodyEl.textContent =
          "Bu haber silinmiş veya yayından kaldırılmış olabilir.";
      return;
    }

    const news = snap.data();

    // 1) Medya / slider
    const rawImages = Array.isArray(news.images) ? news.images : [];
    const images = rawImages.map(decodeImageEntry).filter(Boolean);

    if (tagsInlineEl && Array.isArray(news.tags) && news.tags.length) {
      const html = news.tags
        .map((t, idx) => {
          const safe = escapeHtml(t);

          // 👇 Artık tag filtresi değil, arama parametresi:
          const url = `home.html?q=${encodeURIComponent(String(t))}`;

          // İlk etikette '|' yok, sonrakilerde var
          return idx === 0
            ? `<a href="${url}" class="tag-inline-link">${safe}</a>`
            : ` | <a href="${url}" class="tag-inline-link">${safe}</a>`;
        })
        .join("");

      tagsInlineEl.innerHTML = html;
    }

    if (images.length > 0 && mediaEl) {
      mediaEl.classList.add("slider");
      mediaEl.innerHTML = `
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

      const captionBox = document.createElement("div");
      captionBox.className = "slider-caption";
      mediaEl.appendChild(captionBox);

      setupSlider(mediaEl, captionBox);
    } else if (mediaEl) {
      mediaEl.remove(); // hiç görsel yoksa boş kutu kalmasın
    }

    // 2) Kategori, başlık, meta
    if (tagEl) tagEl.textContent = news.category || "Haber";
    if (titleEl) titleEl.textContent = news.title || "";
    if (metaEl) metaEl.textContent = formatDate(news.createdAt);

    // 3) Gövde (içerik)
    if (bodyEl) {
      if (news.contentHtml) {
        // Özellikle HTML kaydediyorsan, aynen bas
        bodyEl.innerHTML = news.contentHtml;
      } else if (news.content) {
        // Düz metni olduğu gibi göster (boşluklar + satır sonları korunacak)
        const text = String(news.content);
        bodyEl.textContent = text;
      } else if (news.summary) {
        bodyEl.textContent = String(news.summary);
      } else {
        bodyEl.textContent = "";
      }
    }

    // 4) Kaynak
    if (sourceEl) {
      const srcHtml = buildSourceHtml(news);
      if (srcHtml) {
        sourceEl.innerHTML = srcHtml;
        sourceEl.style.display = "";
      } else {
        sourceEl.innerHTML = "";
        sourceEl.style.display = "none";
      }
    }
  } catch (err) {
    console.error("Haber detay yüklenirken hata:", err);
    if (titleEl) titleEl.textContent = "Hata oluştu";
    if (bodyEl)
      bodyEl.textContent =
        "Haber yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadNewsDetail().catch((err) =>
    console.error("Detay sayfası init hatası:", err)
  );
});
