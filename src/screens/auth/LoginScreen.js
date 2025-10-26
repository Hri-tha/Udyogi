// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { auth, db, functions } from '../../services/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export default function LoginScreen({ navigation, route }) {
  const { userType } = route.params;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      console.log('🔥 Attempting to send OTP to:', '+91' + phoneNumber);
      console.log('🔥 Functions object:', functions);
      
      const sendOTP = httpsCallable(functions, 'sendOTP');
      console.log('🔥 sendOTP callable created');
      
      const result = await sendOTP({ 
        phoneNumber: '+91' + phoneNumber 
      });
      
      console.log('🔥 sendOTP result:', result);

      if (result.data.success) {
        setOtpSent(true);
        
        // In development, show OTP in alert
        if (result.data.devOTP) {
          Alert.alert(
            '✅ OTP Sent', 
            `OTP: ${result.data.devOTP}\n\n(Dev mode - OTP shown for testing)`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', `OTP sent successfully to +91${phoneNumber}`);
        }
      } else {
        throw new Error(result.data.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Send OTP Error:', err);
      
      let errorMessage = 'Failed to send OTP';
      if (err.code === 'functions/invalid-argument') {
        errorMessage = 'Invalid phone number format';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const verifyOTP = httpsCallable(functions, 'verifyOTP');
      const result = await verifyOTP({
        phoneNumber: '+91' + phoneNumber,
        otp: otp
      });

      if (result.data.success && result.data.customToken) {
        // Sign in with custom token
        const userCredential = await signInWithCustomToken(auth, result.data.customToken);
        const userId = userCredential.user.uid;
        
        console.log('User signed in:', userId);
        
        // Check if user profile exists
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Existing user:', userData);
          
          // Check if user type matches
          if (userData.userType && userData.userType !== userType) {
            await auth.signOut();
            Alert.alert(
              'Wrong Login Type',
              `This number is registered as ${userData.userType}. Please use the correct login option.`
            );
            return;
          }
          
          // Navigate to main app
          navigation.replace('MainApp');
        } else {
          // New user - create initial profile
          console.log('New user - creating profile');
          await setDoc(userDocRef, {
            uid: userId,
            phoneNumber: '+91' + phoneNumber,
            userType: userType,
            createdAt: new Date().toISOString()
          });
          
          // Navigate to profile setup
          navigation.replace('ProfileSetup', { userType });
        }
      } else {
        throw new Error(result.data.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Verify OTP Error:', err);
      
      let errorMessage = 'Invalid OTP. Please try again.';
      
      if (err.code === 'functions/not-found') {
        errorMessage = 'OTP not found. Please request a new OTP.';
      } else if (err.code === 'functions/deadline-exceeded') {
        errorMessage = 'OTP has expired. Please request a new OTP.';
      } else if (err.code === 'functions/resource-exhausted') {
        errorMessage = 'Too many incorrect attempts. Please request a new OTP.';
      } else if (err.code === 'functions/invalid-argument') {
        errorMessage = err.message || 'Invalid OTP.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    setOtpSent(false);
    setOtp('');
    // Auto-trigger send OTP after a brief delay
    setTimeout(() => {
      handleSendOTP();
    }, 300);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.logo}>📱</Text>
        <Text style={styles.title}>Login with Mobile</Text>
        <Text style={styles.subtitle}>
          {userType === 'worker' ? 'Worker Login' : 'Employer Login'}
        </Text>
      </View>

      <View style={styles.content}>
        {!otpSent ? (
          <>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter 10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP</Text>
            <Text style={styles.sublabel}>OTP sent to +91 {phoneNumber}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              autoFocus
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={loading}
              style={styles.resendButton}
            >
              <Text style={[styles.linkText, loading && styles.disabledText]}>
                Resend OTP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setOtpSent(false);
                setOtp('');
              }}
              disabled={loading}
              style={styles.changeNumberButton}
            >
              <Text style={[styles.secondaryLinkText, loading && styles.disabledText]}>
                Change Number
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    alignItems: 'center', 
    paddingTop: 60, 
    paddingBottom: 30, 
    backgroundColor: '#fff' 
  },
  logo: { 
    fontSize: 60, 
    marginBottom: 10 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#666' 
  },
  content: { 
    padding: 20 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 8, 
    marginTop: 10 
  },
  sublabel: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 15 
  },
  phoneInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    marginBottom: 15 
  },
  countryCode: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333', 
    paddingLeft: 15, 
    paddingRight: 10 
  },
  phoneInput: { 
    flex: 1, 
    padding: 15, 
    fontSize: 16 
  },
  input: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 10, 
    fontSize: 18, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    marginBottom: 15, 
    textAlign: 'center', 
    letterSpacing: 5 
  },
  primaryButton: { 
    backgroundColor: '#007AFF', 
    padding: 16, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginTop: 10 
  },
  disabledButton: { 
    opacity: 0.6 
  },
  primaryButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '600' 
  },
  backButton: { 
    padding: 15 
  },
  backButtonText: { 
    color: '#007AFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  resendButton: {
    marginTop: 15,
    alignItems: 'center'
  },
  linkText: { 
    color: '#007AFF', 
    fontSize: 16, 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  changeNumberButton: {
    marginTop: 10,
    alignItems: 'center'
  },
  secondaryLinkText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center'
  },
  disabledText: {
    opacity: 0.5
  }
});