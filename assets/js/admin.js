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
const eventOwnerInput = document.getElementById("event-owner");
const eventLocationInput = document.getElementById("event-location");
const eventImagesUrlsInput = document.getElementById("event-images-urls");
const eventDescriptionInput = document.getElementById("event-description");
const eventSaveStatus = document.getElementById("event-save-status");

// Haber listesi ve detay alanı
const newsListEl = document.getElementById("news-list");
const newsDetailEl = document.getElementById("news-detail");

// Etkinlik listesi ve detay alanı (admin HTML’inde bunları eklemiş olman lazım)
const eventsListEl = document.getElementById("events-list");
const eventDetailEl = document.getElementById("event-detail");

// Haberleri cache’te tutalım
let newsCache = [];

// Etkinlikleri cache’te tutalım
let eventsCache = [];

// --- Auth state dinleme ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Giriş yapılmış
    if (loginView) loginView.style.display = "none";
    if (adminView) adminView.style.display = "block";
    if (adminUserEmail) adminUserEmail.textContent = user.email || "";

    // Haber ve etkinlik listelerini yükle
    loadNewsList();
    loadEventsList();
  } else {
    // Çıkış / henüz giriş yok
    if (adminView) adminView.style.display = "none";
    if (loginView) loginView.style.display = "flex";
    if (loginError) loginError.textContent = "";
    if (loginForm) loginForm.reset();
  }
});

// --- Giriş formu ---
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginError) loginError.textContent = "";

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged paneli gösterecek
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

// --- Çıkış ---
if (logoutLink) {
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
  });
}

// --- Yardımcı: tarih formatı ---
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
  // input[type="date"] için YYYY-MM-DD formatı
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

function parseImageUrls(text) {
  if (!text) return [];
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => !!s);
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
        isVisible: true, // varsayılan: yayında
        images: images.length ? images : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (newsSaveStatus) newsSaveStatus.textContent = "✔ Haber kaydedildi.";
      newNewsForm.reset();
      newsFeaturedInput.value = "false";
      loadNewsList();
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
    const owner = eventOwnerInput.value.trim();
    const locationName = eventLocationInput.value.trim();
    const manualUrls = parseImageUrls(eventImagesUrlsInput.value);
    const description = eventDescriptionInput.value.trim();
    const eventPriceTypeInput = document.getElementById("event-price-type");

    if (!title) {
      if (eventSaveStatus)
        eventSaveStatus.textContent = "Etkinlik adı zorunludur.";
      return;
    }

    if (!dateStr) {
      if (eventSaveStatus) eventSaveStatus.textContent = "Tarih zorunludur.";
      return;
    }

    let startDate;
    try {
      startDate = new Date(dateStr);
      if (isNaN(startDate.getTime())) {
        throw new Error("Geçersiz tarih");
      }
    } catch {
      if (eventSaveStatus)
        eventSaveStatus.textContent = "Tarih formatı geçersiz.";
      return;
    }

    try {
      await addDoc(collection(db, "events"), {
        title,
        description: description || null,
        ownerName: owner || null,
        locationName: locationName || null,
        images: manualUrls.length ? manualUrls : null,
        startDate,
        priceType: eventPriceTypeInput?.value || "free",
        isVisible: true, // varsayılan: yayında
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (eventSaveStatus)
        eventSaveStatus.textContent = "✔ Etkinlik kaydedildi.";

      newEventForm.reset();
      // Yeni eklenen etkinlik listede de görülsün
      loadEventsList();
    } catch (err) {
      console.error("Event save error:", err);
      if (eventSaveStatus)
        eventSaveStatus.textContent = "❌ Kaydedilemedi: " + err.message;
    }
  });
}

/* ---------- HABER LİSTESİ YÜKLE ---------- */

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

    const visibleLabel = item.isVisible === false ? " • Gizli" : "";

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

/* ---------- HABER DÜZENLEME FORMU ---------- */

function showNewsDetail(index) {
  const item = newsCache[index];
  if (!item || !newsDetailEl) return;

  const images = Array.isArray(item.images) ? item.images : [];
  const isVisible = item.isVisible !== false; // alan yoksa varsayılan: true

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

  // Görsel önizleme (URL listesi)
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

  // Değişiklikleri kaydet
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

  // Haberi sil
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

/* ---------- ETKİNLİK LİSTESİ YÜKLE ---------- */

async function loadEventsList() {
  if (!eventsListEl) return; // admin HTML'de events-list yoksa sessizce geç

  eventsListEl.innerHTML =
    '<li style="opacity:.7;">Etkinlikler yükleniyor...</li>';

  if (eventDetailEl) {
    eventDetailEl.innerHTML =
      '<p style="opacity:.7;">Bir etkinliğe tıkladığında detayları burada düzenleyebileceksin.</p>';
  }

  const refEvents = collection(db, "events");
  const qEvents = query(refEvents, orderBy("startDate", "desc"));
  const snap = await getDocs(qEvents);

  eventsCache = [];
  snap.forEach((docSnap) => {
    eventsCache.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (!eventsCache.length) {
    eventsListEl.innerHTML =
      '<li style="opacity:.7;">Henüz hiç etkinlik yok.</li>';
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

    const visibleLabel = item.isVisible === false ? " • Gizli" : "";

    li.innerHTML = `
      <div style="font-weight:600;">
        ${item.title || "(Başlıksız etkinlik)"}
      </div>
      <div style="font-size:12px; opacity:.7;">
        ${formatDate(item.startDate)}${
      item.locationName ? " • " + item.locationName : ""
    }${visibleLabel}
      </div>
    `;

    li.addEventListener("click", () => showEventDetail(index));
    eventsListEl.appendChild(li);
  });
}

/* ---------- ETKİNLİK DÜZENLEME FORMU ---------- */

function showEventDetail(index) {
  const item = eventsCache[index];
  if (!item || !eventDetailEl) return;

  const images = Array.isArray(item.images) ? item.images : [];
  const isVisible = item.isVisible !== false; // alan yoksa varsayılan true
  const dateValue = formatDateInputValue(item.startDate);

  eventDetailEl.innerHTML = `
    <h3 style="margin-top:0;">Etkinliği Düzenle</h3>
    <form id="edit-event-form" class="admin-form">
      <label class="form-label">
        Başlık
        <input type="text" id="edit-event-title" class="form-input" value="${escapeHtml(
          item.title || ""
        )}" />
      </label>

      <label class="form-label">
        Tarih
        <input type="date" id="edit-event-date" class="form-input" value="${dateValue}" />
      </label>

      <label class="form-label">
        Düzenleyen / Kurum
        <input type="text" id="edit-event-owner" class="form-input" value="${escapeHtml(
          item.ownerName || ""
        )}" />
      </label>

      <label class="form-label">
        Konum adı
        <input type="text" id="edit-event-location" class="form-input" value="${escapeHtml(
          item.locationName || ""
        )}" />
      </label>

      <label class="form-label">
        Yayın Durumu
        <select id="edit-event-visible" class="form-input">
          <option value="true" ${isVisible ? "selected" : ""}>Yayında</option>
          <option value="false" ${!isVisible ? "selected" : ""}>Gizli</option>
        </select>
      </label>

      <label class="form-label">
        Açıklama
        <textarea id="edit-event-description" class="form-input" rows="3">${escapeHtml(
          item.description || ""
        )}</textarea>
      </label>

      <label class="form-label">
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
  const editOwnerInput = document.getElementById("edit-event-owner");
  const editLocationInput = document.getElementById("edit-event-location");
  const editVisibleInput = document.getElementById("edit-event-visible");
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

  // Görsel önizleme
  function renderEditEventImagesPreview() {
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

  renderEditEventImagesPreview();
  editImagesUrlsInput.addEventListener("input", renderEditEventImagesPreview);

  // Değişiklikleri kaydet
  editSaveBtn.addEventListener("click", async () => {
    if (editSaveStatus) editSaveStatus.textContent = "Kaydediliyor...";

    const title = editTitleInput.value.trim();
    const dateStr = editDateInput.value;
    const ownerName = editOwnerInput.value.trim();
    const locationName = editLocationInput.value.trim();
    const isVisibleNew = editVisibleInput.value === "true";
    const description = editDescriptionInput.value.trim();
    const manualUrls = parseImageUrls(editImagesUrlsInput.value);
    const imagesFinal = manualUrls;

    if (!title) {
      if (editSaveStatus) editSaveStatus.textContent = "Başlık boş olamaz.";
      return;
    }

    if (!dateStr) {
      if (editSaveStatus) editSaveStatus.textContent = "Tarih zorunludur.";
      return;
    }

    let startDate;
    try {
      startDate = new Date(dateStr);
      if (isNaN(startDate.getTime())) throw new Error("Geçersiz tarih");
    } catch {
      if (editSaveStatus)
        editSaveStatus.textContent = "Tarih formatı geçersiz.";
      return;
    }

    try {
      const refDoc = doc(db, "events", item.id);
      await updateDoc(refDoc, {
        title,
        startDate,
        ownerName: ownerName || null,
        locationName: locationName || null,
        isVisible: isVisibleNew,
        description: description || null,
        images: imagesFinal.length ? imagesFinal : null,
        updatedAt: serverTimestamp(),
      });

      if (editSaveStatus)
        editSaveStatus.textContent = "✔ Değişiklikler kaydedildi.";
      await loadEventsList();

      const newIndex = eventsCache.findIndex((ev) => ev.id === item.id);
      if (newIndex !== -1) showEventDetail(newIndex);
    } catch (err) {
      console.error("Event edit error:", err);
      if (editSaveStatus)
        editSaveStatus.textContent = "❌ Kaydedilemedi: " + err.message;
    }
  });

  // Etkinliği sil
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

/* ---------- Yardımcı: HTML escape ---------- */

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
