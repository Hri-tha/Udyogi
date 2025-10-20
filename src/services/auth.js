// src/services/auth.js
import { 
  PhoneAuthProvider, 
  signInWithCredential,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from './firebase';

export const sendOTP = async (phoneNumber, recaptchaVerifier) => {
  try {
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;

    const phoneProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneProvider.verifyPhoneNumber(
      formattedPhone,
      recaptchaVerifier
    );

    return { success: true, verificationId };
  } catch (error) {
    console.error('Send OTP Error:', error);
    return { success: false, error: error.message };
  }
};

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

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign Out Error:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};