import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBk9r57zRZuCgZag7lGNsIJW6_7IT6FkTg",
  authDomain: "udyogi-1ed9c.firebaseapp.com",
  projectId: "udyogi-1ed9c",
  storageBucket: "udyogi-1ed9c.appspot.com",
  messagingSenderId: "960400461165",
  appId: "1:960400461165:android:e1d09e625a3df8196ede64"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
export default app;