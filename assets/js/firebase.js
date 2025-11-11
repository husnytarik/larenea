// assets/js/firebase.js
import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPSZrqXCIJsTUd4JS6mSPJ9_1ijZ33VIs",
  authDomain: "lareneamedia.firebaseapp.com",
  projectId: "lareneamedia",
  storageBucket: "lareneamedia.firebasestorage.app",
  messagingSenderId: "131757263715",
  appId: "1:131757263715:web:dbb86a73bc9da1a4b4e156",
};

// Aynı sayfada birden fazla kez import edilse bile tek app kullanalım
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export { app };
