// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// PASTE YOUR CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "socsci-flow.firebaseapp.com",
  projectId: "socsci-flow",
  storageBucket: "socsci-flow.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);