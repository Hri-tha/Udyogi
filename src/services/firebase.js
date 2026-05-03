// src/services/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey:            "AIzaSyBk9r57zRZuCgZag7lGNsIJW6_7IT6FkTg",
  authDomain:        "udyogi-1ed9c.firebaseapp.com",
  projectId:         "udyogi-1ed9c",
  storageBucket:     "udyogi-1ed9c.appspot.com",
  messagingSenderId: "960400461165",
  appId:             "1:960400461165:android:e1d09e625a3df8196ede64",
};

// ── App ───────────────────────────────────────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Cached singletons ─────────────────────────────────────────────────────────
let _auth      = null;
let _db        = null;
let _functions = null;

// ── AsyncStorage session (fallback when Auth SDK unavailable) ─────────────────
// We store the uid here so any code that reads auth.currentUser?.uid gets a
// non-null value even in AsyncStorage-only mode.
let _asyncStorageUid = null;

export function setAsyncStorageUid(uid) {
  _asyncStorageUid = uid;
}

export function getAsyncStorageUid() {
  return _asyncStorageUid;
}

// ── Firestore ─────────────────────────────────────────────────────────────────
export function getFirebaseDb() {
  if (_db) return _db;
  try {
    _db = getFirestore(app);
    console.log('✅ Firestore ready');
    return _db;
  } catch (e) {
    console.error('Firestore init error:', e.message);
    return null;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export function getFirebaseAuth() {
  if (_auth) return _auth;
  try {
    const { initializeAuth, getAuth, getReactNativePersistence } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    try {
      _auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
      console.log('✅ Firebase Auth initialised with AsyncStorage persistence');
    } catch (initErr) {
      if (
        initErr.code === 'auth/already-initialized' ||
        (initErr.message && initErr.message.toLowerCase().includes('already'))
      ) {
        _auth = getAuth(app);
        console.log('✅ Firebase Auth retrieved (already initialised)');
      } else {
        throw initErr;
      }
    }
    return _auth;
  } catch (e) {
    console.error('Firebase Auth init error:', e.message);
    return null;
  }
}

export async function initFirebaseAuth() {
  return getFirebaseAuth();
}

// ── Functions ─────────────────────────────────────────────────────────────────
export function getFirebaseFunctions() {
  if (_functions) return _functions;
  try {
    _functions = getFunctions(app, 'asia-south1');
    console.log('✅ Firebase Functions ready');
    return _functions;
  } catch (e) {
    console.error('Firebase Functions init error:', e.message);
    return null;
  }
}

// ── Named exports ─────────────────────────────────────────────────────────────

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getFirebaseDb();
      if (!instance) {
        console.warn(`[firebase.js] Firestore not ready — accessed property: ${String(prop)}`);
        return undefined;
      }
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
    getPrototypeOf() {
      const instance = getFirebaseDb();
      return instance ? Object.getPrototypeOf(instance) : Object.prototype;
    },
  }
);

// auth proxy: when Firebase Auth SDK is unavailable, currentUser is synthesised
// from the AsyncStorage uid so downstream code never gets a null uid crash.
export const auth = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getFirebaseAuth();

      // Special case: synthesise currentUser when Auth SDK unavailable
      if (prop === 'currentUser') {
        if (instance && instance.currentUser) {
          return instance.currentUser;
        }
        // Fallback: return a minimal user-like object from AsyncStorage uid
        if (_asyncStorageUid) {
          return { uid: _asyncStorageUid };
        }
        return null;
      }

      if (!instance) return undefined;
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
    getPrototypeOf() {
      const instance = getFirebaseAuth();
      return instance ? Object.getPrototypeOf(instance) : Object.prototype;
    },
  }
);

export const functions = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getFirebaseFunctions();
      if (!instance) return undefined;
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
    getPrototypeOf() {
      const instance = getFirebaseFunctions();
      return instance ? Object.getPrototypeOf(instance) : Object.prototype;
    },
  }
);