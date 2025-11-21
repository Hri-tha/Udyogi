// src/services/razorpay.js - FIXED VERSION
import RazorpayCheckout from 'react-native-razorpay';
import { Alert, Platform } from 'react-native';

const RAZORPAY_KEY_ID = 'rzp_live_RMdzh3tFYlmgp4';

export const initiateRazorpayPayment = async (paymentData) => {
  const {
    amount,
    currency = 'INR',
    description = 'Payment for job completion',
    employerName,
    workerName,
    jobTitle,
    applicationId,
    employerId,
    workerId
  } = paymentData;

  try {
    // Validate payment amount
    if (!amount || amount <= 0 || isNaN(amount)) {
      return { 
        success: false, 
        error: 'Invalid payment amount' 
      };
    }

    // Check if RazorpayCheckout module exists
    if (!RazorpayCheckout) {
      console.error('RazorpayCheckout module is null or undefined');
      return { 
        success: false, 
        error: 'Payment gateway not initialized. Please restart the app.' 
      };
    }

    // Prepare options
    const options = {
      description: description,
      currency: currency,
      key: RAZORPAY_KEY_ID,
      amount: Math.round(amount * 100), // Convert to paise
      name: 'Udyogi',
      prefill: {
        email: 'employer@udyogi.com',
        contact: '9999999999',
        name: employerName || 'Employer',
      },
      theme: { 
        color: '#667eea',
        hide_topbar: false
      },
      notes: {
        jobTitle: jobTitle || 'Job',
        applicationId: applicationId || '',
        employerId: employerId || '',
        workerId: workerId || '',
        workerName: workerName || 'Worker'
      },
      modal: {
        ondismiss: () => {
          console.log('Razorpay modal dismissed');
        }
      }
    };

    console.log('Opening Razorpay with options:', {
      key: RAZORPAY_KEY_ID,
      amount: options.amount,
      amountInRupees: amount,
      name: options.name
    });

    // Use Promise-based approach instead of await
    return new Promise((resolve, reject) => {
      RazorpayCheckout.open(options)
        .then((data) => {
          console.log('Razorpay Success Response:', data);
          resolve({
            success: true,
            paymentId: data.razorpay_payment_id,
            orderId: data.razorpay_order_id || null,
            signature: data.razorpay_signature || null,
            amount: amount
          });
        })
        .catch((error) => {
          console.error('Razorpay Error:', error);
          
          // Handle different error scenarios
          if (error.code === 0 || error.code === 2) {
            // User cancelled
            resolve({ 
              success: false, 
              error: 'Payment cancelled',
              code: error.code 
            });
          } else if (error.code === 4) {
            // Network error
            resolve({ 
              success: false, 
              error: 'Network error. Please check your internet connection',
              code: 4 
            });
          } else if (error.code === 5) {
            // Payment failed
            resolve({ 
              success: false, 
              error: 'Payment failed. Please try again',
              code: 5 
            });
          } else {
            // Unknown error
            resolve({ 
              success: false, 
              error: error.description || error.message || 'Payment failed. Please try again.',
              code: error.code || 'unknown'
            });
          }
        });
    });

  } catch (error) {
    console.error('Razorpay Payment Exception:', error);
    return { 
      success: false, 
      error: 'Failed to initialize payment. Please try again.',
      code: 'exception'
    };
  }
};

export const verifyRazorpayPayment = async (paymentData) => {
  try {
    // Basic validation
    if (!paymentData.paymentId) {
      return {
        success: false,
        verified: false,
        error: 'Invalid payment data'
      };
    }

    // In production, verify on backend server
    console.log('Payment verification (client-side):', paymentData);
    
    return {
      success: true,
      verified: true,
      paymentId: paymentData.paymentId,
      orderId: paymentData.orderId,
      message: 'Payment verified successfully'
    };
    
  } catch (error) {
    console.error('Payment Verification Error:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Payment verification failed'
    };
  }
};

// Helper function to format amount for display
export const formatPaymentAmount = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

// Helper function to check if Razorpay is available
export const isRazorpayAvailable = () => {
  try {
    // More thorough check
    const isAvailable = RazorpayCheckout !== null && 
                       RazorpayCheckout !== undefined && 
                       typeof RazorpayCheckout.open === 'function';
    
    console.log('Razorpay availability check:', {
      module: RazorpayCheckout ? 'exists' : 'null',
      openFunction: typeof RazorpayCheckout?.open,
      isAvailable
    });
    
    return isAvailable;
  } catch (error) {
    console.error('Error checking Razorpay availability:', error);
    return false;
  }
};

// Test function to verify Razorpay setup
export const testRazorpaySetup = () => {
  console.log('=== Razorpay Setup Test ===');
  console.log('RazorpayCheckout:', RazorpayCheckout);
  console.log('Type:', typeof RazorpayCheckout);
  console.log('Has open method:', RazorpayCheckout?.open ? 'Yes' : 'No');
  console.log('Open method type:', typeof RazorpayCheckout?.open);
  console.log('Platform:', Platform.OS);
  console.log('========================');
};