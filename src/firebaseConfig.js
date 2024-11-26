// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { GoogleAuthProvider } from "firebase/auth";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBv6HD1av1ZRjpXgVIS0yf0GED3QR9ef2E",
  authDomain: "chat-room-app-b7417.firebaseapp.com",
  projectId: "chat-room-app-b7417",
  storageBucket: "chat-room-app-b7417.appspot.com",
  messagingSenderId: "966194592004",
  appId: "1:966194592004:web:625e71bfa93ebfa106b851"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app)
