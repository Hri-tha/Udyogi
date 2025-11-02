// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.uid);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          setUserProfile(docSnap.exists() ? docSnap.data() : null);
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateUserProfile = async (profileData) => {
    if (!user) return { success: false, error: 'No user logged in' };
    try {
      const userData = {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        ...profileData,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
      setUserProfile(userData);
      return { success: true };
    } catch (error) {
      console.error("Error updating profile:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      updateUserProfile,
      logout,
      isWorker: userProfile?.userType === 'worker',
      isEmployer: userProfile?.userType === 'employer',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
