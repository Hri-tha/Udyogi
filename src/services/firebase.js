// src/services/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth'; // ✅ NOT 'firebase/auth/react-native'
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBk9r57zRZuCgZag7lGNsIJW6_7IT6FkTg",
  authDomain: "udyogi-1ed9c.firebaseapp.com",
  projectId: "udyogi-1ed9c",
  storageBucket: "udyogi-1ed9c.appspot.com",
  messagingSenderId: "960400461165",
  appId: "1:960400461165:android:e1d09e625a3df8196ede64",
};

// Guard against hot-reload double-init
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Lazy singleton — called inside useEffect in AuthContext, never at module load time
let _auth = null;

export function getFirebaseAuth() {
  if (_auth) return _auth;
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    if (e.code === 'auth/already-initialized') {
      // Fast Refresh called initializeAuth twice — grab the existing instance
      _auth = getAuth(app);
    } else {
      console.error('Firebase Auth init error:', e.message);
      return null;
    }
  }
  return _auth;
}

export const db = getFirestore(app);