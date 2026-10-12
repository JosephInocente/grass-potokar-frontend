// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; //  Agregamos las herramientas de Auth

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGWfwivumO8nvbpoOhxFK0zdiu55d-lEg",
  authDomain: "gestion-canchas-55ad8.firebaseapp.com",
  projectId: "gestion-canchas-55ad8",
  storageBucket: "gestion-canchas-55ad8.firebasestorage.app",
  messagingSenderId: "164556105925",
  appId: "1:164556105925:web:3011f800d43ea9449a68ac",
  measurementId: "G-X76VDHXXBR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// EXPORTAMOS LA MAGIA PARA QUE EL LOGIN LA USE
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();