// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "linguaroll.firebaseapp.com",
  projectId: "linguaroll",
  storageBucket: "linguaroll.firebasestorage.app",
  messagingSenderId: "97605242246",
  appId: "1:97605242246:web:d26bd15980dc7f33f67007"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
// export const storage = getStorage(app); // Disabled due to plan limits