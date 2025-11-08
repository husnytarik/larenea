import { db } from "./firebase.js";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

const nearbyContainer = document.getElementById("nearby-events-list");

// Basit haversine fonksiyonu – km cinsinden mesafe
function distanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function loadUpcomingEvents() {
  const today = new Date();
  // Firestore için Timestamp → sadece tarih karşılaştırması
  // startDate >= bugün olanları çekelim
  const eventsRef = collection(db, "events");
  const q = query(eventsRef, orderBy("startDate", "asc"));
  const snap = await getDocs(q);

  const events = [];
  snap.forEach((doc) => {
    const data = doc.data();
    events.push({ id: doc.id, ...data });
  });

  return events;
}

async function showNearbyEvents() {
  // 1) Konumu al
  if (!navigator.geolocation) {
    nearbyContainer.textContent =
      "Tarayıcınız konum servisini desteklemiyor. Etkinlikleri 'Tümünü Gör' sayfasından inceleyebilirsiniz.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      // 2) Etkinlikleri çek
      const allEvents = await loadUpcomingEvents();

      // 3) Mesafe hesapla ve yakın olanları filtrele (ör: 100 km)
      const MAX_DISTANCE_KM = 100;

      const withDistance = allEvents
        .map((ev) => {
          if (typeof ev.lat !== "number" || typeof ev.lng !== "number") {
            return null;
          }
          const d = distanceInKm(userLat, userLng, ev.lat, ev.lng);
          return { ...ev, distanceKm: d };
        })
        .filter((ev) => ev && ev.distanceKm <= MAX_DISTANCE_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 5); // En yakın 5 tanesini göster

      if (withDistance.length === 0) {
        nearbyContainer.textContent =
          "Yakınınızda etkinlik bulunamadı. Tüm etkinlikler için liste sayfasına göz atabilirsiniz.";
        return;
      }

      // 4) HTML’e yaz
      nearbyContainer.innerHTML = "";
      withDistance.forEach((ev) => {
        const item = document.createElement("article");
        item.className = "event-card";
        item.innerHTML = `
          <h3>${ev.title}</h3>
          <p><strong>Tarih:</strong> ${
            ev.startDate?.toDate
              ? ev.startDate.toDate().toLocaleDateString("tr-TR")
              : ""
          }</p>
          <p><strong>Yer:</strong> ${ev.locationName || ""}</p>
          <p><strong>Mesafe:</strong> ${ev.distanceKm.toFixed(1)} km</p>
          <a href="event.html?id=${ev.id}">Detayları gör</a>
        `;
        nearbyContainer.appendChild(item);
      });
    },
    (err) => {
      console.error(err);
      nearbyContainer.textContent =
        "Konum izni verilmedi. Yakındaki etkinlikler gösterilemiyor.";
    }
  );
}

showNearbyEvents();
