// src/services/razorpay.js
import { generateRazorpayHTML } from './WebRazorpay';

const RAZORPAY_KEY_ID = 'rzp_test_RoZeBxu75pF1SX';

export const initiateRazorpayPayment = async (paymentData) => {
  const {
    amount,
    currency = 'INR',
    description = 'Platform Fee Payment',
    employerName,
    employerId,
    feeIds = []
  } = paymentData;

  try {
    console.log('🚀 Starting Razorpay payment (WebView) for platform fee...');
    console.log('💰 Amount:', amount, 'paise (₹', amount / 100, ')');
    console.log('📝 Description:', description);
    console.log('👤 Employer:', employerName, employerId);
    console.log('📋 Fee IDs:', feeIds);
    
    // Validate payment amount
    if (!amount || amount <= 0 || isNaN(amount)) {
      console.error('❌ Invalid amount:', amount);
      return { 
        success: false, 
        error: 'Invalid payment amount' 
      };
    }

    if (amount < 100) {
      console.error('❌ Amount too small:', amount);
      return { 
        success: false, 
        error: 'Minimum amount is ₹1 (100 paise)' 
      };
    }

    // Create webViewConfig with all required fields
    const webViewConfig = {
      amount: amount, // Already in paise
      currency: currency,
      description: description,
      key: RAZORPAY_KEY_ID,
      name: 'Udyogi Platform Fee',
      prefill: {
        email: employerName ? `${employerName.toLowerCase().replace(/\s+/g, '')}@udyogi.com` : 'employer@udyogi.com',
        contact: '9999999999',
        name: employerName || 'Employer',
      },
      notes: {
        type: 'platform_fee',
        employerId: employerId || '',
        feeIds: JSON.stringify(feeIds),
        paymentFor: 'platform_fee',
        environment: 'test',
        timestamp: new Date().toISOString()
      },
      theme: {
        color: '#667eea'
      }
    };

    console.log('🔧 WebView config created:', webViewConfig);

    // Generate HTML for WebView
    const htmlContent = generateRazorpayHTML(webViewConfig);

    return {
      success: true,
      useWebView: true,
      webViewConfig: webViewConfig,
      htmlContent: htmlContent
    };

  } catch (error) {
    console.error('💥 Razorpay Payment Exception:', error);
    return { 
      success: false, 
      error: 'Failed to initialize payment. Please try again.',
      code: 'exception',
      details: error.message
    };
  }
};

export const verifyRazorpayPayment = async (paymentData) => {
  try {
    console.log('🔍 Starting payment verification:', paymentData);
    
    if (!paymentData.paymentId) {
      console.error('❌ Missing paymentId in verification');
      return {
        success: false,
        verified: false,
        error: 'Invalid payment data: Missing payment ID'
      };
    }

    if (!paymentData.orderId) {
      console.warn('⚠️ Missing orderId in verification');
    }

    if (!paymentData.signature) {
      console.warn('⚠️ Missing signature in verification');
    }

    // Log payment details for debugging
    console.log('🔍 Payment verification details:', {
      paymentId: paymentData.paymentId,
      orderId: paymentData.orderId || 'N/A',
      signaturePresent: !!paymentData.signature,
      amount: paymentData.amount || 'N/A',
      isTest: true
    });
    
    // For testing, always verify successfully
    // In production, you would make an API call to your backend
    // to verify the payment signature
    
    const verificationResult = {
      success: true,
      verified: true,
      paymentId: paymentData.paymentId,
      orderId: paymentData.orderId,
      signature: paymentData.signature,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      message: 'Payment verified successfully (TEST MODE)',
      isTest: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Verification result:', verificationResult);
    
    return verificationResult;
    
  } catch (error) {
    console.error('❌ Payment Verification Error:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Payment verification failed',
      details: error.stack
    };
  }
};

export const isRazorpayAvailable = () => {
  const isAvailable = true; // WebView is always available
  console.log('🔧 Razorpay available:', isAvailable);
  return isAvailable;
};

export const testRazorpaySetup = () => {
  console.log('🧪 === Razorpay Setup Test ===');
  console.log('🧪 MODE: TEST');
  console.log('🧪 Key ID (partial):', RAZORPAY_KEY_ID.substring(0, 15) + '...');
  console.log('🧪 Key valid length:', RAZORPAY_KEY_ID.length === 29 ? 'Yes' : 'No');
  console.log('🧪 =========================');
};

export const getTestCards = () => {
  return {
    success: [
      {
        name: 'Success Card (Visa)',
        number: '4111 1111 1111 1111',
        cvv: '123',
        expiry: 'Any future date',
        description: 'Payment will succeed'
      },
      {
        name: 'Success Card (MasterCard)',
        number: '5104 0600 0000 0008',
        cvv: '123',
        expiry: 'Any future date',
        description: 'Payment will succeed'
      }
    ],
    failure: [
      {
        name: 'Failure Card',
        number: '4111 1111 1111 1234',
        cvv: '123',
        expiry: 'Any future date',
        description: 'Payment will fail'
      }
    ],
    upi: [
      {
        name: 'Success UPI',
        id: 'success@razorpay',
        description: 'UPI payment will succeed'
      },
      {
        name: 'Failure UPI',
        id: 'failure@razorpay',
        description: 'UPI payment will fail'
      }
    ]
  };
};

export const showTestPaymentInstructions = () => {
  const testCards = getTestCards();
  
  return {
    successCard: testCards.success[0],
    failureCard: testCards.failure[0],
    successUpi: testCards.upi[0]
  };
};