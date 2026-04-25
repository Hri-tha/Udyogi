// src/services/authService.js - UPDATED
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

class AuthService {
  constructor() {
    console.log('🔥 [AuthService] Initializing...');
    
    // Cloud Functions
    this.sendOTPFunction = httpsCallable(functions, 'sendEmailOTP');
    this.verifyOTPFunction = httpsCallable(functions, 'verifyEmailOTP');
    this.googleSignInFunction = httpsCallable(functions, 'handleGoogleSignIn');
  }

  // Send OTP via Email
  async sendOTP(email) {
    try {
      console.log('📧 Sending OTP to:', email);
      
      const result = await this.sendOTPFunction({ email });
      
      console.log('✅ Send OTP result:', result.data);
      return {
        success: true,
        ...result.data
      };
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP'
      };
    }
  }

  // Verify OTP
  async verifyOTP(email, otp, userType = 'worker') {
    try {
      console.log('🔐 Verifying OTP:', { email, userType });
      
      const result = await this.verifyOTPFunction({
        email: email,
        otp: otp,
        userType: userType
      });
      
      console.log('✅ Verify OTP result:', result.data);
      return {
        success: true,
        ...result.data
      };
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify OTP'
      };
    }
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;