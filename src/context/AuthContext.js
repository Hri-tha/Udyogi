// src/context/AuthContext.js - Update your existing file
import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add this function to refresh user profile
  const refreshUserProfile = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        console.log('User profile refreshed:', userDoc.data());
        setUserProfile(userDoc.data());
      } else {
        console.log('No user profile found');
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            console.log('User profile found:', userDoc.data());
            setUserProfile(userDoc.data());
          } else {
            console.log('No user profile found');
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const updateUserProfile = async (profileData) => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      const userData = {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        ...profileData,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
      
      // Update local state
      setUserProfile(userData);
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    updateUserProfile,
    logout,
    refreshUserProfile, // Add this line
    isWorker: userProfile?.userType === 'worker',
    isEmployer: userProfile?.userType === 'employer',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};