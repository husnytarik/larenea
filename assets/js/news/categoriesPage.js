// assets/js/news/categoriesPage.js

import { db } from "../firebase.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { renderSmallNews } from "./newsCards.js";
import { isRecordVisible, escapeHtml } from "../helpers.js";

let ALL_NEWS = [];
let ALL_CATEGORIES = [];

/* URL'den kategori parametresini al: ?category=Makale */
function getActiveCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const cat =
    params.get("category") || params.get("kategori") || params.get("cat");
  return cat ? cat.trim() : null;
}

/* Firestore'dan haberleri çek, görünür olanları al, kategorileri çıkar */
async function loadNewsForCategories() {
  const ref = collection(db, "news");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  ALL_NEWS = [];
  snap.forEach((docSnap) => {
    ALL_NEWS.push({ id: docSnap.id, ...docSnap.data() });
  });

  // sadece yayında olanlar
  ALL_NEWS = ALL_NEWS.filter(isRecordVisible);

  // kategori listesi (news.category alanından)
  const set = new Set();
  ALL_NEWS.forEach((n) => {
    if (!n.category) return;
    const raw = String(n.category).trim();
    if (!raw) return;
    set.add(raw);
  });

  ALL_CATEGORIES = Array.from(set).sort((a, b) =>
    a.localeCompare(b, "tr", { sensitivity: "base" })
  );
}

/* Sağdaki kategori butonlarını bas */
function renderCategoryPills(activeCategory) {
  const container = document.getElementById("category-list");
  if (!container) return;

  if (!ALL_CATEGORIES.length) {
    container.innerHTML =
      "<p style='font-size:12px;opacity:.7;'>Henüz kategori bulunamadı.</p>";
    return;
  }

  container.innerHTML = ALL_CATEGORIES.map((cat) => {
    const isActive =
      activeCategory && cat.toLowerCase() === activeCategory.toLowerCase();
    const safeLabel = escapeHtml(cat);
    const dataValue = escapeHtml(cat);

    return `
      <button
        class="category-pill ${isActive ? "is-active" : ""}"
        data-category="${dataValue}"
        type="button"
      >
        ${safeLabel}
      </button>
    `;
  }).join("");

  // tıklanınca URL'i güncelle + filtreyi uygula
  Array.from(container.querySelectorAll(".category-pill")).forEach((btn) => {
    btn.addEventListener("click", () => {
      const selected = btn.getAttribute("data-category") || "";
      const params = new URLSearchParams(window.location.search);

      if (selected) {
        params.set("category", selected);
      } else {
        params.delete("category");
      }

      const newUrl =
        "categories.html" + (params.toString() ? `?${params.toString()}` : "");
      window.history.pushState({}, "", newUrl);

      applyCategoryFilter(selected);
    });
  });
}

/* Seçilen kategoriye göre haberleri filtrele ve ekrana bas */
function applyCategoryFilter(category) {
  const titleEl = document.getElementById("category-page-title");
  const subtitleEl = document.getElementById("category-page-subtitle");

  if (category) {
    if (titleEl) titleEl.textContent = category;
    if (subtitleEl)
      subtitleEl.textContent = "Bu kategoriye ait haberler listeleniyor.";
  } else {
    if (titleEl) titleEl.textContent = "Kategoriler";
    if (subtitleEl)
      subtitleEl.textContent =
        "Bir kategori seçerek bu kategoriye ait haberleri görebilirsiniz.";
  }

  let list = ALL_NEWS;
  if (category) {
    const lower = category.toLowerCase();
    list = ALL_NEWS.filter((n) => {
      if (!n.category) return false;
      return String(n.category).toLowerCase() === lower;
    });
  }

  if (!list.length) {
    const grid = document.querySelector(".news-grid-small");
    if (grid) {
      grid.innerHTML =
        "<p style='padding:12px;opacity:.7;'>Bu kategoriye ait haber bulunamadı.</p>";
    }
  } else {
    // Haber kartlarını mevcut sistemle bas
    renderSmallNews(list);
  }

  // sağdaki pill aktiflikleri güncelle
  const pills = document.querySelectorAll(".category-pill");
  pills.forEach((pill) => {
    const value = (pill.getAttribute("data-category") || "").toLowerCase();
    if (category && value === category.toLowerCase()) {
      pill.classList.add("is-active");
    } else {
      pill.classList.remove("is-active");
    }
  });
}

/* Sayfa başlangıcı */
async function initCategoryPage() {
  const initialCategory = getActiveCategoryFromUrl();
  await loadNewsForCategories();
  renderCategoryPills(initialCategory);
  applyCategoryFilter(initialCategory);
}

document.addEventListener("DOMContentLoaded", initCategoryPage);
