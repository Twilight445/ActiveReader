// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const FALLBACK_KEY = "AIzaSyBYLe-DjRl3SWMOCuV66pZ5AVkgz8by2sA";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FALLBACK_KEY,
  authDomain: "linguaroll.firebaseapp.com",
  projectId: "linguaroll",
  storageBucket: "linguaroll.firebasestorage.app",
  messagingSenderId: "97605242246",
  appId: "1:97605242246:web:d26bd15980dc7f33f67007"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);