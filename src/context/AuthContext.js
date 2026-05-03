// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithCustomToken,
} from 'firebase/auth';
import { initFirebaseAuth, getFirebaseAuth, getFirebaseDb } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

const SESSION_KEYS = ['current_user', 'last_used_email', 'user_type', 'session_token'];

const DEV_PROFILE_BASE = {
  uid: 'dev-user-001',
  email: 'dev@udyogi.com',
  name: 'Harsh Kumar',
  phoneNumber: '9999999999',
  profileComplete: true,
  emailVerified: true,
  googleSignIn: false,
  rating: 4.5,
  totalRatings: 10,
  completedJobs: 5,
  totalEarnings: 5000,
  location: 'Mumbai',
  skills: ['Plumbing', 'Electrical'],
  freePostsUsed: 0,
  freePostsAvailable: 3,
  totalJobsPosted: 0,
  totalHires: 0,
  totalPayments: 0,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [loggedOut, setLoggedOut]     = useState(false);
  const mountedRef = useRef(true);

  // ─── Firestore helpers ──────────────────────────────────────────────────────
  const safeFirestore = async (fn) => {
    const db = getFirebaseDb();
    if (!db) { console.warn('Firestore not available'); return null; }
    try { return await fn(db); } catch (e) {
      console.error('Firestore error:', e.message);
      return null;
    }
  };

  /**
   * Fetch the Firestore profile for a given UID.
   * Creates a minimal profile document if none exists yet.
   */
  const fetchOrCreateUserProfile = async (uid, fallbackData = {}) => {
    return await safeFirestore(async (db) => {
      const ref  = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        console.log('📄 Fetched Firestore profile for', uid, '— profileComplete:', data.profileComplete);
        return data;
      }
      // Profile doesn't exist yet — create a minimal one
      const newProfile = {
        uid,
        email: fallbackData.email || '',
        phoneNumber: fallbackData.phoneNumber || '',
        userType: fallbackData.userType || 'worker',
        profileComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerified: true,
        rating: 0, totalRatings: 0, completedJobs: 0, totalEarnings: 0,
        location: '', skills: [],
        freePostsUsed: 0, freePostsAvailable: 3, totalJobsPosted: 0,
        totalHires: 0, totalPayments: 0,
      };
      await setDoc(ref, newProfile);
      console.log('📄 Created new Firestore profile for', uid);
      return newProfile;
    });
  };

  // ─── Persist profile to AsyncStorage ───────────────────────────────────────
  const persistProfile = async (profile) => {
    try { await AsyncStorage.setItem('current_user', JSON.stringify(profile)); } catch (_) {}
  };

  // ─── Clear all session data ─────────────────────────────────────────────────
  const clearSession = async () => {
    try {
      await AsyncStorage.multiRemove(SESSION_KEYS);
      const allKeys = await AsyncStorage.getAllKeys();
      const firebaseKeys = allKeys.filter(k =>
        k.includes('firebase') ||
        k.includes('firebaseLocalStorage') ||
        k.startsWith('@firebase')
      );
      if (firebaseKeys.length > 0) {
        await AsyncStorage.multiRemove(firebaseKeys);
      }
    } catch (e) {
      console.warn('clearSession error (non-fatal):', e.message);
    }
  };

  // ─── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let unsubscribeAuth = null;
    let timeoutId       = null;

    const finishInit = (profile) => {
      if (!mountedRef.current) return;
      if (profile) setUserProfile(profile);
      setLoading(false);
      setInitialized(true);
      console.log('✅ AuthContext ready, uid:', profile?.uid || 'none');
    };

    const bootstrap = async () => {
      const authInstance = await initFirebaseAuth();

      if (!mountedRef.current) return;

      if (!authInstance) {
        console.warn('Firebase Auth unavailable — AsyncStorage-only mode');
        try {
          const stored = await AsyncStorage.getItem('current_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.uid) {
              // Even in auth-unavailable mode, try to get the latest Firestore profile
              const freshProfile = await fetchOrCreateUserProfile(parsed.uid, parsed);
              if (freshProfile) {
                const merged = { ...parsed, ...freshProfile };
                await persistProfile(merged);
                finishInit(merged);
                return;
              }
              finishInit(parsed);
              return;
            }
          }
        } catch (_) {}
        finishInit(null);
        return;
      }

      // Pre-populate from AsyncStorage to avoid flash of logged-out state
      try {
        const stored = await AsyncStorage.getItem('current_user');
        if (stored && mountedRef.current) {
          const parsed = JSON.parse(stored);
          if (parsed?.uid && !parsed.uid.startsWith('dev-')) {
            setUserProfile(parsed);
          }
        }
      } catch (_) {}

      unsubscribeAuth = onAuthStateChanged(authInstance, async (firebaseUser) => {
        if (!mountedRef.current) return;
        clearTimeout(timeoutId);

        if (firebaseUser) {
          setUser(firebaseUser);
          setLoggedOut(false);
          // Always fetch latest profile from Firestore on auth state change
          const profile = await fetchOrCreateUserProfile(firebaseUser.uid, {
            email: firebaseUser.email,
            phoneNumber: firebaseUser.phoneNumber,
          });
          if (profile) await persistProfile(profile);
          finishInit(profile);
        } else {
          try {
            const stored = await AsyncStorage.getItem('current_user');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.uid?.startsWith('dev-')) {
                finishInit({ ...parsed, profileComplete: true });
                return;
              }
              if (parsed?.uid && !loggedOut) {
                // Attempt to refresh from Firestore even without a Firebase session
                const freshProfile = await fetchOrCreateUserProfile(parsed.uid, parsed);
                const merged = freshProfile ? { ...parsed, ...freshProfile } : parsed;
                await persistProfile(merged);
                setUser(null);
                finishInit(merged);
                return;
              }
            }
          } catch (_) {}
          setUser(null);
          finishInit(null);
        }
      });

      timeoutId = setTimeout(() => {
        if (!mountedRef.current) return;
        console.warn('Auth listener timeout — assuming signed out');
        finishInit(null);
      }, 8000);
    };

    bootstrap();

    return () => {
      mountedRef.current = false;
      unsubscribeAuth?.();
      clearTimeout(timeoutId);
    };
  }, []);

  // ─── signInWithCustomToken ──────────────────────────────────────────────────
  const signInWithCustomTokenHandler = async (customToken) => {
    const authInstance = getFirebaseAuth();

    if (authInstance) {
      try {
        const cred = await signInWithCustomToken(authInstance, customToken);
        console.log('✅ signInWithCustomToken success:', cred.user.uid);
        setLoggedOut(false);

        // Immediately fetch the latest Firestore profile so UI has fresh data
        const profile = await fetchOrCreateUserProfile(cred.user.uid, {
          email: cred.user.email,
        });
        if (profile) {
          setUserProfile(profile);
          await persistProfile(profile);
        }

        return { success: true, user: cred.user };
      } catch (e) {
        console.error('❌ signInWithCustomToken error:', e.message);
        // Fall through to AsyncStorage-only mode
      }
    }

    console.warn('signInWithCustomToken fallback: Auth unavailable, using AsyncStorage session');
    setLoggedOut(false);
    return { success: true, user: null };
  };

  // ─── updateUserProfile ──────────────────────────────────────────────────────
  const updateUserProfile = async (profileData) => {
    if (userProfile?.uid?.startsWith('dev-')) {
      const updated = { ...userProfile, ...profileData, profileComplete: true };
      setUserProfile(updated);
      await persistProfile(updated);
      return { success: true, profile: updated };
    }

    const uid = user?.uid || userProfile?.uid;
    if (!uid) return { success: false, error: 'No user logged in' };

    const result = await safeFirestore(async (db) => {
      const ref  = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      const data = { ...profileData, updatedAt: serverTimestamp(), profileComplete: true };
      if (snap.exists()) { await updateDoc(ref, data); }
      else {
        await setDoc(
          ref,
          { uid, email: user?.email || userProfile?.email || '', createdAt: serverTimestamp(), ...data },
          { merge: true }
        );
      }
      const updated = { ...userProfile, ...data };
      setUserProfile(updated);
      await persistProfile(updated);
      return { success: true, profile: updated };
    });
    return result || { success: false, error: 'Firestore not available' };
  };

  // ─── bypassLogin ───────────────────────────────────────────────────────────
  const bypassLogin = async (type = 'worker') => {
    console.log('DEV BYPASS for', type);
    const profile = { ...DEV_PROFILE_BASE, userType: type };
    await persistProfile(profile);
    if (mountedRef.current) {
      setLoggedOut(false);
      setUserProfile(profile);
      setUser(null);
      setLoading(false);
      setInitialized(true);
    }
    return { success: true, profile };
  };

  // ─── logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      console.log('🔓 Logging out...');

      await clearSession();

      const authInstance = getFirebaseAuth();
      if (authInstance) {
        try {
          await firebaseSignOut(authInstance);
          console.log('✅ Firebase sign-out successful');
        } catch (firebaseError) {
          console.warn('Firebase signOut error (non-fatal):', firebaseError.message);
        }
      }

      if (mountedRef.current) {
        setUser(null);
        setUserProfile(null);
        setLoggedOut(true);
      }

      console.log('✅ Logout complete');
      return { success: true };
    } catch (e) {
      console.error('❌ Logout error:', e);
      if (mountedRef.current) {
        setUser(null);
        setUserProfile(null);
        setLoggedOut(true);
      }
      return { success: false, error: e.message };
    }
  };

  // ─── refreshUserProfile ────────────────────────────────────────────────────
  const refreshUserProfile = async () => {
    const uid = user?.uid || userProfile?.uid;
    if (!uid) return { success: false, error: 'No user' };
    return await safeFirestore(async (db) => {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserProfile(d);
        await persistProfile(d);
        return { success: true, profile: d };
      }
      return { success: false, error: 'Profile not found' };
    });
  };

  // ─── createNewUserProfile ──────────────────────────────────────────────────
  const createNewUserProfile = async (userData) => {
    if (userData.uid?.startsWith('dev-')) {
      const profile = { ...DEV_PROFILE_BASE, ...userData };
      setUserProfile(profile);
      return { success: true, profile };
    }
    return await safeFirestore(async (db) => {
      const ref     = doc(db, 'users', userData.uid);
      const snap    = await getDoc(ref);
      const profile = {
        uid: userData.uid,
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
        name: userData.name || '',
        userType: userData.userType || 'worker',
        profileComplete: userData.profileComplete || false,
        emailVerified: true,
        googleSignIn: userData.googleSignIn || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rating: 0, totalRatings: 0, completedJobs: 0, totalEarnings: 0,
        location: '', skills: [],
        freePostsUsed: 0, freePostsAvailable: 3, totalJobsPosted: 0,
        totalHires: 0, totalPayments: 0,
      };
      if (snap.exists()) { await updateDoc(ref, profile); }
      else               { await setDoc(ref, profile); }
      setUserProfile(profile);
      return { success: true, profile };
    });
  };

  const isProfileComplete = () => userProfile?.profileComplete || false;
  const getUserType       = () => userProfile?.userType || 'worker';

  if (!initialized) return null;

  const value = {
    user,
    userProfile,
    setUserProfile,
    loading,
    initialized,
    loggedOut,
    updateUserProfile,
    signInWithCustomToken: signInWithCustomTokenHandler,
    bypassLogin,
    logout,
    refreshUserProfile,
    isProfileComplete,
    getUserType,
    createNewUserProfile,
    isWorker:   userProfile?.userType === 'worker',
    isEmployer: userProfile?.userType === 'employer',
    // Convenience: always-resolved UID (works in both Firebase and AsyncStorage mode)
    resolvedUid: user?.uid || userProfile?.uid || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};