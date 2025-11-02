// src/services/firebase.js

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBk9r57zRZuCgZag7lGNsIJW6_7IT6FkTg",
  authDomain: "udyogi-1ed9c.firebaseapp.com",
  projectId: "udyogi-1ed9c",
  storageBucket: "udyogi-1ed9c.appspot.com",
  messagingSenderId: "960400461165",
  appId: "1:960400461165:android:e1d09e625a3df8196ede64",
};

// ✅ Initialize Firebase App (avoid re-initialization)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Initialize Auth (handles hot reload in React Native)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app); // Fallback if already initialized
}

// ✅ Initialize Firestore
const db = getFirestore(app);

// ✅ Initialize Cloud Functions
const functions = getFunctions(app);

// 🔧 OPTIONAL: Connect to Functions Emulator for local testing
// Uncomment the line below if testing locally with Firebase Emulator
// connectFunctionsEmulator(functions, 'localhost', 5001);

// ✅ Export instances
export { app, auth, db, functions };
export default app;