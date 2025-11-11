// assets/js/helpers.js

// Firestore Timestamp veya Date → "12 Oca 2025"
export function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Date/Timestamp → <input type="date"> için "YYYY-MM-DD"
export function formatDateInputValue(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "14:30:00" → "14:30"
export function formatTimeInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// isVisible alanı: false / "false" ise gizli kabul et
export function isRecordVisible(item) {
  if (!item || typeof item !== "object") return true;
  const v = item.isVisible;
  if (v === false || v === "false") return false;
  return true;
}

// "url1, url2" veya satır satır url listesi string → array
export function parseImageUrls(text) {
  if (!text) return [];
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => !!s);
}
