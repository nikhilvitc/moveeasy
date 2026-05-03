import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000:web:000",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XXXXXXX",
};

export const isFirebaseConfigured =
  firebaseConfig.apiKey !== "demo-key" &&
  firebaseConfig.authDomain !== "demo.firebaseapp.com" &&
  firebaseConfig.projectId !== "demo-project";

const app = initializeApp(firebaseConfig);

if (typeof window !== "undefined" && isFirebaseConfigured) {
  const siteKey = import.meta.env.VITE_APPCHECK_RECAPTCHA_SITE_KEY?.trim();
  const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN?.trim();
  if (import.meta.env.DEV && debugToken) {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
  }
  if (siteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.warn("App Check init failed:", e?.message || e);
    }
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
