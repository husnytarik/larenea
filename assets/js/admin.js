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

const newNewsForm = document.getElementById("new-news-form");
const newsTitleInput = document.getElementById("news-title");
const newsCategoryInput = document.getElementById("news-category");
const newsFeaturedInput = document.getElementById("news-featured");
const newsSummaryInput = document.getElementById("news-summary");
const newsContentInput = document.getElementById("news-content");
const newsImagesUrlsInput = document.getElementById("news-images-urls");
const newsImagesUploadInput = document.getElementById("news-images-upload");
const newsImagesUploadBtn = document.getElementById("news-images-upload-btn");
const newsImagesUploadStatus = document.getElementById(
  "news-images-upload-status"
);
const newsImagesPreview = document.getElementById("news-images-preview");
const newsSaveStatus = document.getElementById("news-save-status");

const newsListEl = document.getElementById("news-list");
const newsDetailEl = document.getElementById("news-detail");

// Haberleri cache’te tutalım
let newsCache = [];

// Yeni haber için yüklenecek görsel URL’leri
let newNewsUploadedUrls = [];

// --- Auth state dinleme ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Giriş yapılmış
    loginView.style.display = "none";
    adminView.style.display = "block";
    adminUserEmail.textContent = user.email || "";
    loadNewsList();
  } else {
    // Çıkış / henüz giriş yok
    adminView.style.display = "none";
    loginView.style.display = "flex";
    loginError.textContent = "";
    loginForm.reset();
  }
});

// --- Giriş formu ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

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
    loginError.textContent = msg;
  }
});

// --- Çıkış ---
logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await signOut(auth);
});

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

function parseImageUrls(text) {
  if (!text) return [];
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => !!s);
}
/* ---------- YENİ HABER KAYDET ---------- */

newNewsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  newsSaveStatus.textContent = "Kaydediliyor...";

  const title = newsTitleInput.value.trim();
  const category = newsCategoryInput.value.trim();
  const summary = newsSummaryInput.value.trim();
  const content = newsContentInput.value.trim();
  const isFeatured = newsFeaturedInput.value === "true";
  const manualUrls = parseImageUrls(newsImagesUrlsInput.value);
  const images = [...manualUrls, ...newNewsUploadedUrls];

  if (!title) {
    newsSaveStatus.textContent = "Başlık zorunludur.";
    return;
  }

  try {
    await addDoc(collection(db, "news"), {
      title,
      category: category || null,
      summary: summary || null,
      content: content || null,
      isFeatured,
      images: images.length ? images : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    newsSaveStatus.textContent = "✔ Haber kaydedildi.";
    newNewsForm.reset();
    newsFeaturedInput.value = "false";
    newNewsUploadedUrls = [];
    newsImagesPreview.innerHTML = "";
    newsImagesUploadStatus.textContent = "";
    loadNewsList();
  } catch (err) {
    console.error("News save error:", err);
    newsSaveStatus.textContent = "❌ Kaydedilemedi: " + err.message;
  }
});

/* ---------- HABER LİSTESİ YÜKLE ---------- */

async function loadNewsList() {
  newsListEl.innerHTML = `<li style="opacity:.7;">Haberler yükleniyor...</li>`;
  newsDetailEl.innerHTML =
    '<p style="opacity:.7;">Bir habere tıkladığında detayları burada düzenleyebileceksin.</p>';

  const refNews = collection(db, "news");
  const qNews = query(refNews, orderBy("createdAt", "desc"));
  const snap = await getDocs(qNews);

  newsCache = [];
  snap.forEach((docSnap) => {
    newsCache.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (!newsCache.length) {
    newsListEl.innerHTML = '<li style="opacity:.7;">Henüz hiç haber yok.</li>';
    return;
  }

  renderNewsList();
}

function renderNewsList() {
  newsListEl.innerHTML = "";

  newsCache.forEach((item, index) => {
    const li = document.createElement("li");
    li.style.padding = "6px 0";
    li.style.borderBottom = "1px solid rgba(255,255,255,0.06)";
    li.style.cursor = "pointer";

    li.innerHTML = `
      <div style="font-weight:600;">
        ${item.title || "(Başlıksız haber)"}
      </div>
      <div style="font-size:12px; opacity:.7;">
        ${formatDate(item.createdAt)} ${
      item.category ? " • " + item.category : ""
    } ${item.isFeatured ? " • ⭐ Öne çıkan" : ""}
      </div>
    `;

    li.addEventListener("click", () => showNewsDetail(index));
    newsListEl.appendChild(li);
  });
}

/* ---------- HABER DÜZENLEME FORMU ---------- */

function showNewsDetail(index) {
  const item = newsCache[index];
  if (!item) return;

  // yerel upload URL’leri (sadece bu haber için)
  let editUploadedUrls = [];

  const images = Array.isArray(item.images) ? item.images : [];

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

      <label class="form-label">
        Yeni Görsel Yükle
        <input type="file" id="edit-news-images-upload" class="form-input" accept="image/*" multiple />
      </label>

      <div>
        <button type="button" id="edit-news-images-upload-btn" class="btn-primary">
          Seçilen Görselleri Yükle
        </button>
        <span id="edit-news-images-upload-status" style="font-size:12px;margin-left:8px;opacity:.8;"></span>
        <div id="edit-news-images-preview" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;font-size:11px;opacity:.85;"></div>
      </div>

      <div style="margin-top:10px;">
        <button type="button" id="edit-news-save-btn" class="btn-primary">
          Değişiklikleri Kaydet
        </button>
        <span id="edit-news-save-status" style="font-size:12px;margin-left:8px;opacity:.8;"></span>
      </div>
    </form>
  `;

  const editTitleInput = document.getElementById("edit-news-title");
  const editCategoryInput = document.getElementById("edit-news-category");
  const editFeaturedInput = document.getElementById("edit-news-featured");
  const editSummaryInput = document.getElementById("edit-news-summary");
  const editContentInput = document.getElementById("edit-news-content");
  const editImagesUrlsInput = document.getElementById("edit-news-images-urls");
  const editImagesUploadInput = document.getElementById(
    "edit-news-images-upload"
  );
  const editImagesUploadBtn = document.getElementById(
    "edit-news-images-upload-btn"
  );
  const editImagesUploadStatus = document.getElementById(
    "edit-news-images-upload-status"
  );
  const editImagesPreview = document.getElementById("edit-news-images-preview");
  const editSaveBtn = document.getElementById("edit-news-save-btn");
  const editSaveStatus = document.getElementById("edit-news-save-status");

  // mevcut + yeni görselleri göster
  function renderEditImagesPreview() {
    editImagesPreview.innerHTML = "";
    const manual = parseImageUrls(editImagesUrlsInput.value);
    const all = [...manual, ...editUploadedUrls];

    if (!all.length) {
      editImagesPreview.textContent = "Bu haber için kayıtlı görsel yok.";
      return;
    }

    all.forEach((url) => {
      const span = document.createElement("span");
      span.textContent = url;
      span.style.display = "inline-block";
      span.style.maxWidth = "220px";
      span.style.overflow = "hidden";
      span.style.textOverflow = "ellipsis";
      span.style.whiteSpace = "nowrap";
      editImagesPreview.appendChild(span);
    });
  }

  renderEditImagesPreview();

  // edit ekranında görsel yükleme
  editImagesUploadBtn.addEventListener("click", async () => {
    const files = editImagesUploadInput.files;
    if (!files || !files.length) {
      editImagesUploadStatus.textContent = "Önce dosya seçmelisin.";
      return;
    }

    editImagesUploadStatus.textContent = "Yükleniyor...";
    editImagesUploadBtn.disabled = true;

    try {
      for (const file of files) {
        const fileRef = ref(
          storage,
          `news/${Date.now()}_${Math.random().toString(16).slice(2)}_${
            file.name
          }`
        );
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        editUploadedUrls.push(url);
      }

      editImagesUploadStatus.textContent = "✔ Yükleme tamamlandı.";
      editImagesUploadInput.value = "";
      renderEditImagesPreview();
    } catch (err) {
      console.error("Edit upload error:", err);
      editImagesUploadStatus.textContent = "❌ Yükleme hatası: " + err.message;
    } finally {
      editImagesUploadBtn.disabled = false;
    }
  });

  // değişiklikleri kaydet
  editSaveBtn.addEventListener("click", async () => {
    editSaveStatus.textContent = "Kaydediliyor...";

    const title = editTitleInput.value.trim();
    const category = editCategoryInput.value.trim();
    const summary = editSummaryInput.value.trim();
    const content = editContentInput.value.trim();
    const isFeatured = editFeaturedInput.value === "true";
    const manualUrls = parseImageUrls(editImagesUrlsInput.value);
    const imagesFinal = [...manualUrls, ...editUploadedUrls];

    if (!title) {
      editSaveStatus.textContent = "Başlık boş olamaz.";
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
        images: imagesFinal.length ? imagesFinal : null,
        updatedAt: serverTimestamp(),
      });

      editSaveStatus.textContent = "✔ Değişiklikler kaydedildi.";
      // Listeyi yenileyelim ki güncel veriyi görelim
      await loadNewsList();
      // aynı haberi tekrar gösterelim
      const newIndex = newsCache.findIndex((n) => n.id === item.id);
      if (newIndex !== -1) showNewsDetail(newIndex);
    } catch (err) {
      console.error("Edit save error:", err);
      editSaveStatus.textContent = "❌ Kaydedilemedi: " + err.message;
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
