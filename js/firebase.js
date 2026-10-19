// Firebase Web initialization.
// The Firebase Web config below is public by design. Access is protected by
// Firestore Security Rules and Firebase Authorized Domains, not by hiding this object.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getAnalytics,
  isSupported,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAMNdjwEj3WR1q7FuqeFhXNPwDByo40lpk",
  authDomain: "xen-temp-mail.firebaseapp.com",
  projectId: "xen-temp-mail",
  storageBucket: "xen-temp-mail.firebasestorage.app",
  messagingSenderId: "833675889958",
  appId: "1:833675889958:web:ddfb8a20b6cf52c8aa05e7",
  measurementId: "G-05KMD0V3ZY",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistent sign-in across refreshes and app restarts.
setPersistence(auth, browserLocalPersistence).catch((e) =>
  console.warn("Auth persistence could not be set:", e)
);

// Analytics is optional. Any failure here must never affect auth or mailboxes.
export let analytics = null;
(async () => {
  try {
    if (await isSupported()) analytics = getAnalytics(app);
  } catch (e) {
    console.info("Analytics unavailable (non-fatal):", e?.message || e);
  }
})();