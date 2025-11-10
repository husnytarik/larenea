// assets/js/admin.js

// Firebase SDK modülleri
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- Firebase config (senin projen) ---
const firebaseConfig = {
  apiKey: "AIzaSyAPSZrqXCIJsTUd4JS6mSPJ9_1ijZ33VIs",
  authDomain: "lareneamedia.firebaseapp.com",
  projectId: "lareneamedia",
  messagingSenderId: "131757263715",
  appId: "1:131757263715:web:dbb86a73bc9da1a4b4e156",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM referansları ---
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const logoutLink = document.getElementById("logout-link");
const adminUserEmail = document.getElementById("admin-user-email");

// Haber formu
const newNewsForm = document.getElementById("new-news-form");
const newsTitleInput = document.getElementById("news-title");
const newsCategoryInput = document.getElementById("news-category");
const newsFeaturedInput = document.getElementById("news-featured");
const newsSummaryInput = document.getElementById("news-summary");
const newsContentInput = document.getElementById("news-content");
const newsImagesUrlsInput = document.getElementById("news-images-urls");
const newsSaveStatus = document.getElementById("news-save-status");

// Etkinlik formu
const newEventForm = document.getElementById("new-event-form");
const eventTitleInput = document.getElementById("event-title");
const eventDateInput = document.getElementById("event-date");
const eventEndDateInput = document.getElementById("event-end-date");
const eventOwnerInput = document.getElementById("event-owner");
const eventLocationInput = document.getElementById("event-location");
const eventAddressInput = document.getElementById("event-address");
const eventLatInput = document.getElementById("event-lat");
const eventLngInput = document.getElementById("event-lng");
const eventImagesUrlsInput = document.getElementById("event-images-urls");
const eventDescriptionInput = document.getElementById("event-description");
const eventSaveStatus = document.getElementById("event-save-status");
const eventPriceTypeSelect = document.getElementById("event-price-type");
// saat inputları (HTML'de eklemeyi unutma)
const eventStartTimeInput = document.getElementById("event-start-time");
const eventEndTimeInput = document.getElementById("event-end-time");

// Haber listesi / detay
const newsListEl = document.getElementById("news-list");
const newsDetailEl = document.getElementById("news-detail");

// Etkinlik listesi / detay
const eventsListEl = document.getElementById("events-list");
const eventDetailEl = document.getElementById("event-detail");

// Cache
let newsCache = [];
let eventsCache = [];

// --- Admin içi harita (yeni etkinlik formu) ---
let eventMap = null;
let eventMarker = null;

function initEventMap() {
  const mapContainer = document.getElementById("event-map");
  if (!mapContainer) return;
  if (typeof L === "undefined") {
    console.warn("Leaflet yüklü değil, admin haritası açılamadı.");
    return;
  }
  if (eventMap) return; // bir kere kur

  eventMap = L.map("event-map", {
    scrollWheelZoom: true,
  }).setView([39.0, 35.0], 6); // Türkiye ortası civarı

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(eventMap);

  function updateInputs(lat, lng) {
    if (eventLatInput) eventLatInput.value = lat.toFixed(6);
    if (eventLngInput) eventLngInput.value = lng.toFixed(6);
  }

  function setMarker(lat, lng) {
    if (!eventMap) return;
    if (!eventMarker) {
      eventMarker = L.marker([lat, lng], { draggable: true }).addTo(eventMap);
      eventMarker.on("dragend", () => {
        const pos = eventMarker.getLatLng();
        updateInputs(pos.lat, pos.lng);
      });
    } else {
      eventMarker.setLatLng([lat, lng]);
    }
    updateInputs(lat, lng);
  }

  // Eğer input’larda önceden değer varsa
  const latStr = eventLatInput?.value?.trim();
  const lngStr = eventLngInput?.value?.trim();
  const latNum = latStr ? Number(latStr.replace(",", ".")) : null;
  const lngNum = lngStr ? Number(lngStr.replace(",", ".")) : null;

  if (
    latNum !== null &&
    lngNum !== null &&
    !Number.isNaN(latNum) &&
    !Number.isNaN(lngNum)
  ) {
    eventMap.setView([latNum, lngNum], 13);
    setMarker(latNum, lngNum);
  }

  // Haritaya tıklayınca marker + input güncelle
  eventMap.on("click", (e) => {
    setMarker(e.latlng.lat, e.latlng.lng);
  });

  setTimeout(() => {
    eventMap.invalidateSize();
  }, 200);
}

/* ---------- Auth state ---------- */

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (loginView) loginView.style.display = "none";
    if (adminView) adminView.style.display = "block";
    if (adminUserEmail) adminUserEmail.textContent = user.email || "";

    loadNewsList().catch((err) =>
      console.error("Haber listesi yüklenirken hata:", err)
    );
    loadEventsList().catch((err) =>
      console.error("Etkinlik listesi yüklenirken hata:", err)
    );

    initEventMap();
  } else {
    if (adminView) adminView.style.display = "none";
    if (loginView) loginView.style.display = "flex";
    if (loginError) loginError.textContent = "";
    if (loginForm) loginForm.reset();
  }
});

/* ---------- Giriş / Çıkış ---------- */

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginError) loginError.textContent = "";

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login error:", err);
      let msg = "Giriş yapılamadı.";
      if (err.code === "auth/invalid-credential") {
        msg = "E-posta veya şifre hatalı.";
      } else if (err.code === "auth/user-disabled") {
        msg = "Bu kullanıcı devre dışı.";
      }
      if (loginError) loginError.textContent = msg;
    }
  });
}

if (logoutLink) {
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
  });
}

/* ---------- Yardımcılar ---------- */

function formatDate(ts) {
  try {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatDateInputValue(ts) {
  try {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

// "14:30" / "14:30:00" → "14:30"
function formatTimeInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function parseImageUrls(text) {
  if (!text) return [];
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => !!s);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- YENİ HABER KAYDET ---------- */

if (newNewsForm) {
  newNewsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (newsSaveStatus) newsSaveStatus.textContent = "Kaydediliyor...";

    const title = newsTitleInput.value.trim();
    const category = newsCategoryInput.value.trim();
    const summary = newsSummaryInput.value.trim();
    const content = newsContentInput.value.trim();
    const isFeatured = newsFeaturedInput.value === "true";
    const manualUrls = parseImageUrls(newsImagesUrlsInput.value);
    const images = manualUrls;

    if (!title) {
      if (newsSaveStatus) newsSaveStatus.textContent = "Başlık zorunludur.";
      return;
    }

    try {
      await addDoc(collection(db, "news"), {
        title,
        category: category || null,
        summary: summary || null,
        content: content || null,
        isFeatured,
        isVisible: true,
        images: images.length ? images : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (newsSaveStatus) newsSaveStatus.textContent = "✔ Haber kaydedildi.";
      newNewsForm.reset();
      newsFeaturedInput.value = "false";
      setTimeout(() => {
        if (newsSaveStatus) newsSaveStatus.textContent = "";
      }, 2000);
      await loadNewsList();
    } catch (err) {
      console.error("News save error:", err);
      if (newsSaveStatus)
        newsSaveStatus.textContent = "❌ Kaydedilemedi: " + err.message;
    }
  });
}

/* ---------- YENİ ETKİNLİK KAYDET ---------- */

if (newEventForm) {
  newEventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (eventSaveStatus) eventSaveStatus.textContent = "Kaydediliyor...";

    const title = eventTitleInput.value.trim();
    const dateStr = eventDateInput.value;
    const endDateStr = eventEndDateInput.value;
    const owner = eventOwnerInput.value.trim();
    const locationName = eventLocationInput.value.trim();
    const address = eventAddressInput.value.trim();
    const manualUrls = parseImageUrls(eventImagesUrlsInput.value);
    const description = eventDescriptionInput.value.trim();
    const priceType = eventPriceTypeSelect?.value || "free";

    const startTime = eventStartTimeInput?.value.trim() || "";
    const endTime = eventEndTimeInput?.value.trim() || "";

    if (!title) {
      if (eventSaveStatus)
        eventSaveStatus.textContent = "Etkinlik adı zorunludur.";
      return;
    }

    if (!dateStr) {
      if (eventSaveStatus)
        eventSaveStatus.textContent = "Başlangıç tarihi zorunludur.";
      return;
    }

    let startDate;
    try {
      startDate = new Date(dateStr);
      if (isNaN(startDate.getTime())) throw new Error("Geçersiz tarih");
    } catch {
      if (eventSaveStatus)
        eventSaveStatus.textContent = "Başlangıç tarihi formatı geçersiz.";
      return;
    }

    let endDate = null;
    if (endDateStr) {
      try {
        const d = new Date(endDateStr);
        if (!isNaN(d.getTime())) endDate = d;
      } catch {
        // yok say
      }
    }

    // Manuel / haritadan alınan lat-lng
    const latStr = eventLatInput?.value.trim() || "";
    const lngStr = eventLngInput?.value.trim() || "";
    let lat = null;
    let lng = null;

    if (latStr && lngStr) {
      const latNum = Number(latStr.replace(",", "."));
      const lngNum = Number(lngStr.replace(",", "."));
      if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
        if (eventSaveStatus)
          eventSaveStatus.textContent =
            "Lat/Lng sayı olmalı. Örn: 36.86123 ve 30.63987";
        return;
      }
      lat = latNum;
      lng = lngNum;
    }

    try {
      await addDoc(collection(db, "events"), {
        title,
        description: description || null,
        ownerName: owner || null,
        locationName: locationName || null,
        address: address || null,
        images: manualUrls.length ? manualUrls : null,
        startDate,
        endDate: endDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        priceType,
        lat,
        lng,
        isVisible: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (eventSaveStatus)
        eventSaveStatus.textContent = "✔ Etkinlik kaydedildi.";
      newEventForm.reset();
      if (eventPriceTypeSelect) eventPriceTypeSelect.value = "free";
      setTimeout(() => {
        if (eventSaveStatus) eventSaveStatus.textContent = "";
      }, 2000);
      await loadEventsList();
    } catch (err) {
      console.error("Event save error:", err);
      if (eventSaveStatus)
        eventSaveStatus.textContent = "❌ Kaydedilemedi: " + err.message;
    }
  });
}

/* ---------- HABER LİSTESİ ---------- */

async function loadNewsList() {
  if (newsListEl) {
    newsListEl.innerHTML =
      '<li style="opacity:.7;">Haberler yükleniyor...</li>';
  }
  if (newsDetailEl) {
    newsDetailEl.innerHTML =
      '<p style="opacity:.7;">Bir habere tıkladığında detayları burada düzenleyebileceksin.</p>';
  }

  const refNews = collection(db, "news");
  const qNews = query(refNews, orderBy("createdAt", "desc"));
  const snap = await getDocs(qNews);

  newsCache = [];
  snap.forEach((docSnap) => {
    newsCache.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (!newsCache.length) {
    if (newsListEl) {
      newsListEl.innerHTML =
        '<li style="opacity:.7;">Henüz hiç haber yok.</li>';
    }
    return;
  }

  renderNewsList();
}

function renderNewsList() {
  if (!newsListEl) return;
  newsListEl.innerHTML = "";

  newsCache.forEach((item, index) => {
    const li = document.createElement("li");
    li.style.padding = "6px 0";
    li.style.borderBottom = "1px solid rgba(255,255,255,0.06)";
    li.style.cursor = "pointer";

    const visibleLabel =
      item.isVisible === false || item.isVisible === "false" ? " • Gizli" : "";

    li.innerHTML = `
      <div style="font-weight:600;">
        ${item.title || "(Başlıksız haber)"}
      </div>
      <div style="font-size:12px; opacity:.7;">
        ${formatDate(item.createdAt)}${
      item.category ? " • " + item.category : ""
    }${item.isFeatured ? " • ⭐ Öne çıkan" : ""}${visibleLabel}
      </div>
    `;

    li.addEventListener("click", () => showNewsDetail(index));
    newsListEl.appendChild(li);
  });
}

/* ---------- HABER DÜZENLE ---------- */

function showNewsDetail(index) {
  const item = newsCache[index];
  if (!item || !newsDetailEl) return;

  const images = Array.isArray(item.images) ? item.images : [];
  const isVisible = !(item.isVisible === false || item.isVisible === "false");

  newsDetailEl.innerHTML = `
    <h3 style="margin-top:0;">Haberi Düzenle</h3>
    <form id="edit-news-form" class="admin-form">
      <label class="form-label">
        Başlık
        <input type="text" id="edit-news-title" class="form-input" value="${escapeHtml(
          item.title || ""
        )}" />
      </label>

      <label class="form-label">
        Kategori
        <input type="text" id="edit-news-category" class="form-input" value="${escapeHtml(
          item.category || ""
        )}" />
      </label>

      <label class="form-label">
        Öne Çıkan mı?
        <select id="edit-news-featured" class="form-input">
          <option value="false" ${
            item.isFeatured ? "" : "selected"
          }>Hayır</option>
          <option value="true" ${
            item.isFeatured ? "selected" : ""
          }>Evet</option>
        </select>
      </label>

      <label class="form-label">
        Yayın Durumu
        <select id="edit-news-visible" class="form-input">
          <option value="true" ${isVisible ? "selected" : ""}>Yayında</option>
          <option value="false" ${!isVisible ? "selected" : ""}>Gizli</option>
        </select>
      </label>

      <label class="form-label">
        Kısa Özet
        <textarea id="edit-news-summary" class="form-input" rows="2">${escapeHtml(
          item.summary || ""
        )}</textarea>
      </label>

      <label class="form-label">
        İçerik
        <textarea id="edit-news-content" class="form-input" rows="6">${escapeHtml(
          item.content || ""
        )}</textarea>
      </label>

      <label class="form-label">
        Görsel Linkleri
        <textarea id="edit-news-images-urls" class="form-input" rows="3" placeholder="Her satıra bir URL yaz">${escapeHtml(
          images.join("\n")
        )}</textarea>
      </label>

      <div style="font-size:12px;margin-top:6px;opacity:.85;">
        <div><strong>Görseller:</strong></div>
        <div id="edit-news-images-preview" style="display:flex;flex-direction:column;gap:4px;margin-top:4px;"></div>
      </div>

      <div style="margin-top:10px;">
        <button type="button" id="edit-news-save-btn" class="btn-primary">
          Değişiklikleri Kaydet
        </button>
        <button type="button" id="edit-news-delete-btn" class="btn-primary" style="margin-left:8px;background:#7c2525;">
          Haberi Sil
        </button>
        <span id="edit-news-save-status" style="font-size:12px;margin-left:8px;opacity:.8;"></span>
      </div>
    </form>
  `;

  const editTitleInput = document.getElementById("edit-news-title");
  const editCategoryInput = document.getElementById("edit-news-category");
  const editFeaturedInput = document.getElementById("edit-news-featured");
  const editVisibleInput = document.getElementById("edit-news-visible");
  const editSummaryInput = document.getElementById("edit-news-summary");
  const editContentInput = document.getElementById("edit-news-content");
  const editImagesUrlsInput = document.getElementById("edit-news-images-urls");
  const editImagesPreview = document.getElementById("edit-news-images-preview");
  const editSaveBtn = document.getElementById("edit-news-save-btn");
  const editDeleteBtn = document.getElementById("edit-news-delete-btn");
  const editSaveStatus = document.getElementById("edit-news-save-status");

  function renderEditImagesPreview() {
    if (!editImagesPreview) return;
    editImagesPreview.innerHTML = "";

    const urls = parseImageUrls(editImagesUrlsInput.value);
    if (!urls.length) {
      editImagesPreview.textContent = "Bu haber için kayıtlı görsel yok.";
      return;
    }

    urls.forEach((url) => {
      const span = document.createElement("span");
      span.textContent = url;
      span.style.display = "inline-block";
      span.style.maxWidth = "280px";
      span.style.overflow = "hidden";
      span.style.textOverflow = "ellipsis";
      span.style.whiteSpace = "nowrap";
      editImagesPreview.appendChild(span);
    });
  }

  renderEditImagesPreview();
  editImagesUrlsInput.addEventListener("input", renderEditImagesPreview);

  editSaveBtn.addEventListener("click", async () => {
    if (editSaveStatus) editSaveStatus.textContent = "Kaydediliyor...";

    const title = editTitleInput.value.trim();
    const category = editCategoryInput.value.trim();
    const summary = editSummaryInput.value.trim();
    const content = editContentInput.value.trim();
    const isFeatured = editFeaturedInput.value === "true";
    const isVisibleNew = editVisibleInput.value === "true";
    const manualUrls = parseImageUrls(editImagesUrlsInput.value);
    const imagesFinal = manualUrls;

    if (!title) {
      if (editSaveStatus) editSaveStatus.textContent = "Başlık boş olamaz.";
      return;
    }

    try {
      const refDoc = doc(db, "news", item.id);
      await updateDoc(refDoc, {
        title,
        category: category || null,
        summary: summary || null,
        content: content || null,
        isFeatured,
        isVisible: isVisibleNew,
        images: imagesFinal.length ? imagesFinal : null,
        updatedAt: serverTimestamp(),
      });

      if (editSaveStatus)
        editSaveStatus.textContent = "✔ Değişiklikler kaydedildi.";
      await loadNewsList();
      const newIndex = newsCache.findIndex((n) => n.id === item.id);
      if (newIndex !== -1) showNewsDetail(newIndex);
    } catch (err) {
      console.error("Edit save error:", err);
      if (editSaveStatus)
        editSaveStatus.textContent = "❌ Kaydedilemedi: " + err.message;
    }
  });

  editDeleteBtn.addEventListener("click", async () => {
    const sure = confirm(
      `"${item.title || "Bu haber"}" kaydını silmek istediğine emin misin?`
    );
    if (!sure) return;

    try {
      await deleteDoc(doc(db, "news", item.id));
      newsDetailEl.innerHTML = '<p style="opacity:.7;">Haber silindi.</p>';
      await loadNewsList();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Haber silinirken bir hata oluştu: " + err.message);
    }
  });
}

/* ---------- ETKİNLİK LİSTESİ ---------- */

async function loadEventsList() {
  if (eventsListEl) {
    eventsListEl.innerHTML =
      '<li style="opacity:.7;">Etkinlikler yükleniyor...</li>';
  }
  if (eventDetailEl) {
    eventDetailEl.innerHTML =
      '<p style="opacity:.7;">Bir etkinliğe tıkladığında detayları burada düzenleyebileceksin.</p>';
  }

  const refEvents = collection(db, "events");
  const qEv = query(refEvents, orderBy("startDate", "asc"));
  const snap = await getDocs(qEv);

  eventsCache = [];
  snap.forEach((docSnap) => {
    eventsCache.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (!eventsCache.length) {
    if (eventsListEl) {
      eventsListEl.innerHTML =
        '<li style="opacity:.7;">Henüz hiç etkinlik yok.</li>';
    }
    return;
  }

  renderEventsList();
}

function renderEventsList() {
  if (!eventsListEl) return;
  eventsListEl.innerHTML = "";

  eventsCache.forEach((item, index) => {
    const li = document.createElement("li");
    li.style.padding = "6px 0";
    li.style.borderBottom = "1px solid rgba(255,255,255,0.06)";
    li.style.cursor = "pointer";

    const visibleLabel =
      item.isVisible === false || item.isVisible === "false" ? " • Gizli" : "";

    const timePart = item.startTime ? " " + item.startTime : "";

    li.innerHTML = `
      <div style="font-weight:600;">
        ${item.title || "(Başlıksız etkinlik)"}
      </div>
      <div style="font-size:12px; opacity:.7;">
        ${formatDate(item.startDate)}${timePart}${
      item.locationName ? " • " + item.locationName : ""
    }${visibleLabel}
      </div>
    `;

    li.addEventListener("click", () => showEventDetail(index));
    eventsListEl.appendChild(li);
  });
}

/* ---------- ETKİNLİK DÜZENLE ---------- */

function showEventDetail(index) {
  const item = eventsCache[index];
  if (!item || !eventDetailEl) return;

  const images = Array.isArray(item.images) ? item.images : [];
  const isVisible = !(item.isVisible === false || item.isVisible === "false");
  const address = item.address || "";
  const priceType = item.priceType || "free";

  const startTimeVal = formatTimeInputValue(item.startTime);
  const endTimeVal = formatTimeInputValue(item.endTime);

  eventDetailEl.innerHTML = `
    <h3 style="margin-top:0;">Etkinliği Düzenle</h3>
    <form id="edit-event-form" class="admin-form">
      <label class="form-label">
        Etkinlik Adı
        <input type="text" id="edit-event-title" class="form-input" value="${escapeHtml(
          item.title || ""
        )}" />
      </label>

      <label class="form-label">
        Başlangıç Tarihi
        <input type="date" id="edit-event-date" class="form-input" value="${formatDateInputValue(
          item.startDate
        )}" />
      </label>

      <label class="form-label">
        Bitiş Tarihi (opsiyonel)
        <input type="date" id="edit-event-end-date" class="form-input" value="${formatDateInputValue(
          item.endDate
        )}" />
      </label>

      <label class="form-label">
        Başlangıç Saati
        <input type="time" id="edit-event-start-time" class="form-input" value="${startTimeVal}" />
      </label>

      <label class="form-label">
        Bitiş Saati (opsiyonel)
        <input type="time" id="edit-event-end-time" class="form-input" value="${endTimeVal}" />
      </label>

      <label class="form-label">
        Yayın Durumu
        <select id="edit-event-visible" class="form-input">
          <option value="true" ${isVisible ? "selected" : ""}>Yayında</option>
          <option value="false" ${!isVisible ? "selected" : ""}>Gizli</option>
        </select>
      </label>

      <label class="form-label">
        Etkinlik Sahibi
        <input type="text" id="edit-event-owner" class="form-input" value="${escapeHtml(
          item.ownerName || ""
        )}" />
      </label>

      <label class="form-label">
        Konum (Şehir / Mekan)
        <input type="text" id="edit-event-location" class="form-input" value="${escapeHtml(
          item.locationName || ""
        )}" />
      </label>

      <label class="form-label">
        Ücret
        <select id="edit-event-price-type" class="form-input">
          <option value="free" ${
            priceType === "paid" ? "" : "selected"
          }>Ücretsiz</option>
          <option value="paid" ${
            priceType === "paid" ? "selected" : ""
          }>Ücretli</option>
        </select>
      </label>

      <label class="form-label form-label-full">
        Yazılı Adres
        <textarea id="edit-event-address" class="form-input" rows="2">${escapeHtml(
          address
        )}</textarea>
      </label>

      <label class="form-label">
        Enlem (lat)
        <input type="text" id="edit-event-lat" class="form-input" value="${
          item.lat ?? ""
        }" />
      </label>

      <label class="form-label">
        Boylam (lng)
        <input type="text" id="edit-event-lng" class="form-input" value="${
          item.lng ?? ""
        }" />
      </label>

      <label class="form-label form-label-full">
        Açıklama
        <textarea id="edit-event-description" class="form-input" rows="3">${escapeHtml(
          item.description || ""
        )}</textarea>
      </label>

      <label class="form-label form-label-full">
        Görsel Linkleri
        <textarea id="edit-event-images-urls" class="form-input" rows="3" placeholder="Her satıra bir URL yaz">${escapeHtml(
          images.join("\n")
        )}</textarea>
      </label>

      <div style="font-size:12px;margin-top:6px;opacity:.85;">
        <div><strong>Görseller:</strong></div>
        <div id="edit-event-images-preview" style="display:flex;flex-direction:column;gap:4px;margin-top:4px;"></div>
      </div>

      <div style="margin-top:10px;">
        <button type="button" id="edit-event-save-btn" class="btn-primary">
          Değişiklikleri Kaydet
        </button>
        <button type="button" id="edit-event-delete-btn" class="btn-primary" style="margin-left:8px;background:#7c2525;">
          Etkinliği Sil
        </button>
        <span id="edit-event-save-status" style="font-size:12px;margin-left:8px;opacity:.8;"></span>
      </div>
    </form>
  `;

  const editTitleInput = document.getElementById("edit-event-title");
  const editDateInput = document.getElementById("edit-event-date");
  const editEndDateInput = document.getElementById("edit-event-end-date");
  const editStartTimeInput = document.getElementById("edit-event-start-time");
  const editEndTimeInput = document.getElementById("edit-event-end-time");
  const editVisibleInput = document.getElementById("edit-event-visible");
  const editOwnerInput = document.getElementById("edit-event-owner");
  const editLocationInput = document.getElementById("edit-event-location");
  const editPriceTypeInput = document.getElementById("edit-event-price-type");
  const editAddressInput = document.getElementById("edit-event-address");
  const editLatInput = document.getElementById("edit-event-lat");
  const editLngInput = document.getElementById("edit-event-lng");
  const editDescriptionInput = document.getElementById(
    "edit-event-description"
  );
  const editImagesUrlsInput = document.getElementById("edit-event-images-urls");
  const editImagesPreview = document.getElementById(
    "edit-event-images-preview"
  );
  const editSaveBtn = document.getElementById("edit-event-save-btn");
  const editDeleteBtn = document.getElementById("edit-event-delete-btn");
  const editSaveStatus = document.getElementById("edit-event-save-status");

  function renderEditImagesPreview() {
    if (!editImagesPreview) return;
    editImagesPreview.innerHTML = "";

    const urls = parseImageUrls(editImagesUrlsInput.value);
    if (!urls.length) {
      editImagesPreview.textContent = "Bu etkinlik için kayıtlı görsel yok.";
      return;
    }

    urls.forEach((url) => {
      const span = document.createElement("span");
      span.textContent = url;
      span.style.display = "inline-block";
      span.style.maxWidth = "280px";
      span.style.overflow = "hidden";
      span.style.textOverflow = "ellipsis";
      span.style.whiteSpace = "nowrap";
      editImagesPreview.appendChild(span);
    });
  }

  renderEditImagesPreview();
  editImagesUrlsInput.addEventListener("input", renderEditImagesPreview);

  editSaveBtn.addEventListener("click", async () => {
    if (editSaveStatus) editSaveStatus.textContent = "Kaydediliyor...";

    const title = editTitleInput.value.trim();
    const dateStr = editDateInput.value;
    const endDateStr = editEndDateInput.value;
    const startTimeStr = editStartTimeInput.value.trim();
    const endTimeStr = editEndTimeInput.value.trim();
    const ownerName = editOwnerInput.value.trim();
    const locationName = editLocationInput.value.trim();
    const newPriceType = editPriceTypeInput.value || "free";
    const newAddress = editAddressInput.value.trim();
    const description = editDescriptionInput.value.trim();
    const isVisibleNew = editVisibleInput.value === "true";
    const manualUrls = parseImageUrls(editImagesUrlsInput.value);
    const imagesFinal = manualUrls;

    if (!title) {
      if (editSaveStatus) editSaveStatus.textContent = "Başlık boş olamaz.";
      return;
    }

    let startDate = item.startDate || null;
    if (dateStr) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) startDate = d;
      } catch {
        // eskiyi bırak
      }
    }

    let endDate = item.endDate || null;
    if (endDateStr) {
      try {
        const d = new Date(endDateStr);
        if (!isNaN(d.getTime())) endDate = d;
      } catch {
        // bırak
      }
    } else {
      endDate = null;
    }

    const latStr = editLatInput.value.trim();
    const lngStr = editLngInput.value.trim();
    let lat = null;
    let lng = null;

    if (latStr && lngStr) {
      const latNum = Number(latStr.replace(",", "."));
      const lngNum = Number(lngStr.replace(",", "."));
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        lat = latNum;
        lng = lngNum;
      } else {
        if (editSaveStatus)
          editSaveStatus.textContent =
            "Lat/Lng sayı olmalı. Örn: 36.86123 ve 30.63987";
        return;
      }
    }

    try {
      const refDoc = doc(db, "events", item.id);
      await updateDoc(refDoc, {
        title,
        startDate: startDate || null,
        endDate: endDate || null,
        startTime: startTimeStr || null,
        endTime: endTimeStr || null,
        ownerName: ownerName || null,
        locationName: locationName || null,
        address: newAddress || null,
        description: description || null,
        images: imagesFinal.length ? imagesFinal : null,
        priceType: newPriceType,
        isVisible: isVisibleNew,
        lat,
        lng,
        updatedAt: serverTimestamp(),
      });

      if (editSaveStatus)
        editSaveStatus.textContent = "✔ Değişiklikler kaydedildi.";
      await loadEventsList();
      const newIndex = eventsCache.findIndex((e) => e.id === item.id);
      if (newIndex !== -1) showEventDetail(newIndex);
    } catch (err) {
      console.error("Event edit error:", err);
      if (editSaveStatus)
        editSaveStatus.textContent = "❌ Kaydedilemedi: " + err.message;
    }
  });

  editDeleteBtn.addEventListener("click", async () => {
    const sure = confirm(
      `"${item.title || "Bu etkinlik"}" kaydını silmek istediğine emin misin?`
    );
    if (!sure) return;

    try {
      await deleteDoc(doc(db, "events", item.id));
      eventDetailEl.innerHTML = '<p style="opacity:.7;">Etkinlik silindi.</p>';
      await loadEventsList();
    } catch (err) {
      console.error("Event delete error:", err);
      alert("Etkinlik silinirken bir hata oluştu: " + err.message);
    }
  });
}

/* ---------- Başlat ---------- */

(function initAdmin() {
  // asıl işleri onAuthStateChanged yapıyor
})();
