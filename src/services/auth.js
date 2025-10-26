// src/services/auth.js
import { 
  PhoneAuthProvider, 
  signInWithCredential,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from './firebase';

// Send OTP (without recaptcha)
export const sendOTP = async (phoneNumber) => {
  try {
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;

    const phoneProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneProvider.verifyPhoneNumber(formattedPhone, null); // remove recaptcha

    return { success: true, verificationId };
  } catch (error) {
    console.error('Send OTP Error:', error);
    return { success: false, error: error.message };
  }
};

// Verify OTP
export const verifyOTP = async (verificationId, code) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await signInWithCredential(auth, credential);

    return { 
      success: true, 
      user: userCredential.user 
    };
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return { success: false, error: error.message };
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign Out Error:', error);
    return { success: false, error: error.message };
  }
};

// Get current logged-in user
export const getCurrentUser = () => {
  return auth.currentUser;
};
