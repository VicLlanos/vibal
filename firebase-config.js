// firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBFSvprPNuygKHaFQkQsEbulQ2Q0lqS5C8",
  authDomain: "vibal-7dff3.firebaseapp.com",
  projectId: "vibal-7dff3",
  databaseURL: "https://vibal-7dff3-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "vibal-7dff3.firebasestorage.app",
  messagingSenderId: "535060859229",
  appId: "1:535060859229:web:06dcdf53e5ca85f67440b4",
  measurementId: "G-LMB3ZBF2ET"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
export let analytics = null;
try { analytics = getAnalytics(app); } catch (e) { /* analytics optional */ }
export default app;