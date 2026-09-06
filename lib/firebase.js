import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAJfyTOkyS79rFo0avcwMJkcUb-bf8LuSM",
  authDomain: "sus-penders.firebaseapp.com",
  projectId: "sus-penders",
  storageBucket: "sus-penders.firebasestorage.app",
  messagingSenderId: "506270127838",
  appId: "1:506270127838:web:f385304cd62d01c8b7944f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
