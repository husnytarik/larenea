// assets/js/event-detail.js
import { db } from "../firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");
const el = document.getElementById("event-detail");

if (!id) {
  el.innerHTML = "<p>Etkinlik bulunamadı.</p>";
} else {
  loadEvent(id);
}

async function loadEvent(id) {
  try {
    const ref = doc(db, "events", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      el.innerHTML = "<p>Etkinlik kaydı bulunamadı.</p>";
      return;
    }

    const ev = snap.data();
    render(ev);
  } catch (err) {
    el.innerHTML = `<p>Yükleme hatası: ${err.message}</p>`;
  }
}

function render(ev) {
  el.innerHTML = `
    <h1>${ev.title}</h1>
    <p>${ev.description || ""}</p>
    <p><strong>Mekan:</strong> ${ev.locationName || ""}</p>
    <p><strong>Tarih:</strong> ${
      ev.startDate?.toDate ? ev.startDate.toDate().toLocaleString("tr-TR") : ""
    }</p>
  `;

  if (ev.lat && ev.lng && L) {
    const map = L.map("map").setView([ev.lat, ev.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);
    L.marker([ev.lat, ev.lng]).addTo(map).bindPopup(ev.title).openPopup();
  }
}
