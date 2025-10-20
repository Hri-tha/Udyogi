// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBk9r57zRZuCgZag7lGNsIJW6_7IT6FkTg",
  authDomain: "udyogi-1ed9c.firebaseapp.com",
  projectId: "udyogi-1ed9c",
  storageBucket: "udyogi-1ed9c.appspot.com",
  messagingSenderId: "960400461165",
  appId: "1:960400461165:android:e1d09e625a3df8196ede64"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;