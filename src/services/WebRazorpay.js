// src/services/WebRazorpay.js
import { Alert } from 'react-native';

const RAZORPAY_KEY_ID = 'rzp_test_RoZeBxu75pF1SX';

export const initiateRazorpayPayment = async (paymentData) => {
  const {
    amount,
    currency = 'INR',
    description = 'Payment for job completion',
    employerName,
    employerId,
    feeIds = []
  } = paymentData;

  try {
    console.log('🚀 Starting WebView Razorpay payment...');
    console.log('💰 Amount:', amount);
    console.log('📝 Description:', description);
    
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

    // Create webViewConfig
    const webViewConfig = {
      amount: amount,
      currency: currency,
      description: description,
      key: RAZORPAY_KEY_ID,
      name: 'Udyogi Platform Fee',
      prefill: {
        name: employerName || 'Employer',
        email: employerName ? `${employerName.toLowerCase().replace(/\s+/g, '')}@udyogi.com` : 'employer@udyogi.com',
        contact: '9999999999'
      },
      notes: {
        type: 'platform_fee',
        employerId: employerId || '',
        feeIds: JSON.stringify(feeIds),
        environment: 'test'
      }
    };

    // Generate HTML content
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
      code: 'exception'
    };
  }
};

export const verifyRazorpayPayment = async (paymentData) => {
  try {
    console.log('🔍 WebRazorpay verification:', paymentData);
    
    // Basic validation
    if (!paymentData.paymentId) {
      return {
        success: false,
        verified: false,
        error: 'Invalid payment data: Missing payment ID'
      };
    }

    console.log('🔍 Payment verification details:', {
      paymentId: paymentData.paymentId,
      orderId: paymentData.orderId,
      signature: paymentData.signature ? 'Present' : 'Missing',
      isTest: true
    });
    
    // For testing, always verify successfully
    return {
      success: true,
      verified: true,
      paymentId: paymentData.paymentId,
      orderId: paymentData.orderId,
      signature: paymentData.signature,
      message: 'Payment verified successfully (TEST MODE)',
      isTest: true
    };
    
  } catch (error) {
    console.error('❌ Payment Verification Error:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Payment verification failed'
    };
  }
};

// Helper function to check if Razorpay is available
export const isRazorpayAvailable = () => {
  console.log('🔧 WebRazorpay: Always available for WebView');
  return true;
};

// Generate HTML for Razorpay checkout
export const generateRazorpayHTML = (paymentData) => {
    
  const { amount, currency, description, key, name, prefill, notes } = paymentData;
  const amountInRupees = (amount / 100).toFixed(2);
  
  console.log('🌐 Generating HTML for Razorpay checkout');
  console.log('💰 Amount in rupees:', amountInRupees);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        
        .container {
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
          max-width: 400px;
          width: 100%;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .logo {
          font-size: 48px;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .title {
          font-size: 22px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
        }
        
        .platform {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        }
        
        .amount-container {
          background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
          padding: 20px;
          border-radius: 12px;
          margin: 20px 0;
        }
        
        .amount-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
        
        .amount {
          font-size: 40px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 4px;
        }
        
        .currency {
          font-size: 16px;
          color: #764ba2;
        }
        
        .description {
          color: #666;
          margin-bottom: 30px;
          line-height: 1.5;
          font-size: 15px;
        }
        
        .pay-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 18px 30px;
          font-size: 18px;
          border-radius: 12px;
          cursor: pointer;
          width: 100%;
          font-weight: bold;
          transition: all 0.3s;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .pay-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .pay-button:active {
          transform: translateY(0);
        }
        
        .test-mode {
          background: #fef3c7;
          color: #92400e;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .loading {
          display: none;
          color: #667eea;
          margin-top: 20px;
          font-size: 16px;
        }
        
        .security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
          font-size: 12px;
          color: #999;
        }
        
        .test-instructions {
          background: #f1f5f9;
          padding: 15px;
          border-radius: 10px;
          margin-top: 20px;
          text-align: left;
          font-size: 12px;
          color: #475569;
        }
        
        .test-instructions h4 {
          margin-bottom: 8px;
          color: #667eea;
        }
        
        .test-card {
          background: white;
          padding: 10px;
          border-radius: 8px;
          margin-top: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .error-message {
          display: none;
          background: #fee2e2;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin: 15px 0;
        }
        
        .razorpay-logo {
          margin-top: 20px;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">💰</div>
        <div class="title">Udyogi Payment</div>
        <div class="platform">Platform Fee Payment</div>
        
        <div class="amount-container">
          <div class="amount-label">Amount to Pay</div>
          <div class="amount">₹${amountInRupees}</div>
          <div class="currency">Indian Rupees</div>
        </div>
        
        <div class="description">${description}</div>
        
        <div class="test-mode">
          🧪 TEST MODE - No real money will be charged
        </div>
        
        <div id="error" class="error-message"></div>
        
        <button class="pay-button" onclick="payWithRazorpay()" id="payButton">
          <span>💳</span>
          <span>Pay Now</span>
        </button>
        
        <div class="loading" id="loading">
          <div>Processing your payment...</div>
          <div style="font-size: 12px; margin-top: 5px;">Please wait</div>
        </div>
        
        <div class="test-instructions">
          <h4>🧪 Test Instructions:</h4>
          <p>Use these test credentials:</p>
          <div class="test-card">
            <strong>✅ Success Card:</strong><br>
            Card: 4111 1111 1111 1111<br>
            CVV: 123<br>
            Expiry: Any future date
          </div>
          <div class="test-card">
            <strong>✅ Success UPI:</strong><br>
            UPI ID: success@razorpay
          </div>
        </div>
        
        <div class="security">
          <span>🔒</span>
          <span>100% Secure Payment</span>
        </div>
        
        <div class="razorpay-logo">
          <small>Powered by Razorpay</small>
        </div>
      </div>

      <script>
        const options = {
          key: "${key}",
          amount: ${amount},
          currency: "${currency}",
          name: "${name}",
          description: "${description}",
          handler: function(response) {
            console.log('Payment successful:', response);
            document.getElementById('payButton').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            
            // Send payment data back to React Native
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: 'payment_success',
                data: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: ${amount},
                  currency: "${currency}",
                  description: "${description}"
                }
              })
            );
          },
          prefill: ${JSON.stringify(prefill)},
          notes: ${JSON.stringify(notes)},
          theme: {
            color: "#667eea"
          },
          modal: {
            ondismiss: function() {
              console.log('Payment modal dismissed');
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: 'payment_cancelled',
                  data: { reason: 'User closed the modal' }
                })
              );
            }
          }
        };

        function payWithRazorpay() {
          try {
            console.log('Opening Razorpay...');
            document.getElementById('error').style.display = 'none';
            
            const rzp = new Razorpay(options);
            rzp.open();
            
            rzp.on('payment.failed', function(response) {
              console.log('Payment failed:', response);
              const errorMsg = response.error.description || 'Payment failed';
              
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: 'payment_failed',
                  data: {
                    error: errorMsg,
                    code: response.error.code,
                    metadata: response.error.metadata
                  }
                })
              );
            });
            
          } catch (error) {
            console.error('Error opening Razorpay:', error);
            document.getElementById('error').innerText = 'Error: ' + error.message;
            document.getElementById('error').style.display = 'block';
          }
        }
        
        // Auto-open payment modal on page load (with delay)
        console.log('Page loaded, auto-opening payment modal...');
        setTimeout(payWithRazorpay, 800);
        
        // Error handling for WebView communication
        window.addEventListener('message', function(event) {
          console.log('Message received:', event.data);
        });
        
        // Handle page errors
        window.onerror = function(message, source, lineno, colno, error) {
          console.error('Page error:', message, error);
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'page_error',
              data: { message: message, error: error?.toString() }
            })
          );
          return false;
        };
      </script>
    </body>
    </html>
  `;
};

export const getTestCards = () => {
  return {
    success: [
      {
        name: 'Success Card',
        number: '4111 1111 1111 1111',
        cvv: '123',
        expiry: 'Any future date',
        description: 'Payment will succeed'
      }
    ],
    upi: [
      {
        name: 'Success UPI',
        id: 'success@razorpay',
        description: 'UPI payment will succeed'
      }
    ]
  };
};

export const showTestPaymentInstructions = () => {
  Alert.alert(
    '🧪 Test Payment Instructions',
    `Use these test credentials:
    
✅ SUCCESS CARD:
Card: 4111 1111 1111 1111
CVV: 123
Expiry: Any future date

✅ SUCCESS UPI:
UPI ID: success@razorpay

Note: No real money will be charged in test mode.`,
    [{ text: 'Got it', style: 'default' }]
  );
};