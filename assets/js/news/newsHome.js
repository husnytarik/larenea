// assets/js/news/newsHome.js
//
// Ana sayfa: haber listesi + manşet kartı + basit ticker

import { db } from "../firebase.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { renderFeaturedCard, renderSmallNews } from "./newsCards.js";
import { setupEventModal } from "../eventModal.js";
import { isRecordVisible } from "../helpers.js";

function setupTicker(newsList) {
  const tickerEl = document.getElementById("ticker-items");
  if (!tickerEl) return;

  tickerEl.innerHTML = "";

  // En fazla 10–12 haber gösterelim
  newsList.slice(0, 12).forEach((news) => {
    const link = document.createElement("a");
    link.className = "ticker-item";
    link.textContent = news.title || "";
    link.href = `haber.html?id=${encodeURIComponent(news.id)}`;
    link.title = news.title || "";
    tickerEl.appendChild(link);
  });
}

async function loadNews() {
  const newsRef = collection(db, "news");
  const q = query(newsRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const allNews = [];
  snap.forEach((docSnap) => {
    allNews.push({ id: docSnap.id, ...docSnap.data() });
  });

  const visibleNews = allNews.filter(isRecordVisible);
  if (!visibleNews.length) {
    console.warn("Gösterilecek haber bulunamadı.");
    return;
  }

  const featured = visibleNews.find((n) => n.isFeatured) || visibleNews[0];

  const others = visibleNews.filter((n) => n.id !== featured.id).slice(0, 6);

  renderFeaturedCard(featured);
  renderSmallNews(others);
  setupTicker(visibleNews);
}

async function initHome() {
  await loadNews();
  setupEventModal(); // Ana sayfada etkinlik listesi varsa modal butonlarını aktif eder
}

document.addEventListener("DOMContentLoaded", () => {
  initHome().catch((err) => console.error("Ana sayfa yüklenirken hata:", err));
});
