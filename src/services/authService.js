// src/services/authService.js
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from './firebase';

// ─── Helper: safely call a Cloud Function ─────────────────────────────────────
const safeCall = async (fnName, data) => {
  const fns = getFirebaseFunctions();
  if (!fns) {
    return { success: false, error: 'Firebase Functions not available' };
  }
  try {
    const callable = httpsCallable(fns, fnName);
    const result   = await callable(data);
    return { success: true, ...(result.data || {}) };
  } catch (error) {
    // Firebase HttpsError has error.message and error.code
    console.error(`❌ [authService] ${fnName} error:`, error.message);
    return { success: false, error: error.message || `${fnName} failed` };
  }
};

const sendOTP = async (email) => {
  console.log('📧 Sending OTP to:', email);
  return safeCall('sendEmailOTP', { email });
};

const verifyOTP = async (email, otp, userType = 'worker') => {
  console.log('🔐 Verifying OTP for:', email);
  return safeCall('verifyEmailOTP', { email, otp, userType });
};

const resendOTP = async (email) => {
  console.log('🔄 Resending OTP to:', email);
  return safeCall('resendEmailOTP', { email });
};

const checkEmailStatus = async (email) => {
  return safeCall('checkEmailStatus', { email });
};

const signInWithGoogle = async (idToken, userType = 'worker') => {
  console.log('🔑 Google sign-in for userType:', userType);
  return safeCall('googleSignIn', { idToken, userType });
};

const authService = {
  sendOTP,
  verifyOTP,
  resendOTP,
  checkEmailStatus,
  signInWithGoogle,
};

export default authService;