// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithCustomToken } from 'firebase/auth';
import { getFirebaseAuth, db } from '../services/firebase'; // ✅ lazy getter, not direct auth export
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

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
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const mountedRef = useRef(true);

  const safeFirestore = async (fn) => {
    if (!db) { console.warn('Firestore not available'); return null; }
    try { return await fn(); } catch (e) { console.error('Firestore error:', e.message); return null; }
  };

  const fetchOrCreateUserProfile = async (firebaseUser) => {
    return await safeFirestore(async () => {
      const ref = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return snap.data();
      const newProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        phoneNumber: firebaseUser.phoneNumber || '',
        profileComplete: false,
        userType: 'worker',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerified: true,
        rating: 0, totalRatings: 0, completedJobs: 0, totalEarnings: 0,
        location: '', skills: [],
        freePostsUsed: 0, freePostsAvailable: 3, totalJobsPosted: 0,
        totalHires: 0, totalPayments: 0,
      };
      await setDoc(ref, newProfile);
      return newProfile;
    });
  };

  useEffect(() => {
    const finishInit = (profile) => {
      if (!mountedRef.current) return;
      if (profile) setUserProfile(profile);
      setLoading(false);
      setInitialized(true);
      console.log('AuthContext ready, profile:', profile?.uid || 'none');
    };

    // ✅ Lazy init — getFirebaseAuth() is called here inside the effect,
    //    NOT at module load time. This prevents the "Component auth has not
    //    been registered yet" crash on Android.
    const authInstance = getFirebaseAuth();

    if (!authInstance) {
      // Firebase failed to init — fall back to AsyncStorage/dev-bypass mode
      console.warn('Firebase Auth unavailable — running in AsyncStorage-only mode');
      AsyncStorage.getItem('current_user').then(stored => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.uid?.startsWith('dev-')) {
              finishInit({ ...parsed, profileComplete: true });
              return;
            }
          } catch (_) { /* ignore */ }
        }
        finishInit(null);
      }).catch(() => finishInit(null));
      return () => { mountedRef.current = false; };
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (!mountedRef.current) return;
      if (firebaseUser) {
        setUser(firebaseUser);
        const profile = await fetchOrCreateUserProfile(firebaseUser);
        finishInit(profile);
      } else {
        setUser(null);
        finishInit(null);
      }
    });

    const timeout = setTimeout(() => {
      if (!mountedRef.current) return;
      console.warn('Auth listener timeout');
      finishInit(null);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
      mountedRef.current = false;
    };
  }, []);

  const updateUserProfile = async (profileData) => {
    if (userProfile?.uid?.startsWith('dev-')) {
      const updated = { ...userProfile, ...profileData, profileComplete: true };
      setUserProfile(updated);
      await AsyncStorage.setItem('current_user', JSON.stringify(updated));
      return { success: true, profile: updated };
    }
    if (!user) return { success: false, error: 'No user logged in' };
    const result = await safeFirestore(async () => {
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      const data = { ...profileData, updatedAt: serverTimestamp(), profileComplete: true };
      if (snap.exists()) {
        await updateDoc(ref, data);
      } else {
        await setDoc(ref, { uid: user.uid, email: user.email || '', createdAt: serverTimestamp(), ...data }, { merge: true });
      }
      const updated = { ...userProfile, ...data };
      setUserProfile(updated);
      return { success: true, profile: updated };
    });
    return result || { success: false, error: 'Firestore not available' };
  };

  const signInWithCustomTokenHandler = async (customToken) => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) return { success: false, error: 'Firebase Auth not initialised' };
    try {
      const cred = await signInWithCustomToken(authInstance, customToken);
      return { success: true, user: cred.user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const bypassLogin = async (type = 'worker') => {
    console.log('DEV BYPASS for', type);
    const profile = { ...DEV_PROFILE_BASE, userType: type };
    await AsyncStorage.setItem('current_user', JSON.stringify(profile));
    if (mountedRef.current) {
      setUserProfile(profile);
      setUser(null);
      setLoading(false);
      setInitialized(true);
    }
    return { success: true, profile };
  };

  const logout = async () => {
    try {
      const authInstance = getFirebaseAuth();
      if (user && authInstance) await firebaseSignOut(authInstance);
      setUser(null);
      setUserProfile(null);
      await AsyncStorage.removeItem('current_user');
      await AsyncStorage.removeItem('last_used_email');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return { success: false, error: 'No user' };
    return await safeFirestore(async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserProfile(d);
        return { success: true, profile: d };
      }
      return { success: false, error: 'Profile not found' };
    });
  };

  const createNewUserProfile = async (userData) => {
    if (userData.uid?.startsWith('dev-')) {
      const profile = { ...DEV_PROFILE_BASE, ...userData };
      setUserProfile(profile);
      return { success: true, profile };
    }
    return await safeFirestore(async () => {
      const ref = doc(db, 'users', userData.uid);
      const snap = await getDoc(ref);
      const profile = {
        uid: userData.uid, email: userData.email || '', phoneNumber: userData.phoneNumber || '',
        name: userData.name || '', userType: userData.userType || 'worker',
        profileComplete: userData.profileComplete || false,
        emailVerified: true, googleSignIn: userData.googleSignIn || false,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        rating: 0, totalRatings: 0, completedJobs: 0, totalEarnings: 0,
        location: '', skills: [],
        freePostsUsed: 0, freePostsAvailable: 3, totalJobsPosted: 0,
        totalHires: 0, totalPayments: 0,
      };
      if (snap.exists()) { await updateDoc(ref, profile); }
      else               { await setDoc(ref, profile);    }
      setUserProfile(profile);
      return { success: true, profile };
    });
  };

  const isProfileComplete = () => userProfile?.profileComplete || false;
  const getUserType = () => userProfile?.userType || 'worker';

  if (!initialized) return null;

  const value = {
    user, userProfile, setUserProfile, loading, initialized,
    updateUserProfile,
    signInWithCustomToken: signInWithCustomTokenHandler,
    bypassLogin, logout, refreshUserProfile, isProfileComplete, getUserType,
    createNewUserProfile,
    isWorker: userProfile?.userType === 'worker',
    isEmployer: userProfile?.userType === 'employer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};