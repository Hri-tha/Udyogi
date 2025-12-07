// src/components/RazorpayWebView.js
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  Text,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { generateRazorpayHTML } from '../services/WebRazorpay';

const RazorpayWebView = ({ 
  visible, 
  onClose, 
  paymentData,
  onPaymentSuccess,
  onPaymentFailed 
}) => {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  // Generate HTML when paymentData is available
  useEffect(() => {
    if (visible && paymentData) {
      console.log('🌐 Generating HTML for Razorpay payment');
      const content = paymentData?.htmlContent || generateRazorpayHTML(paymentData);
      setHtmlContent(content);
      setLoading(true);
      setHasError(false);
    }
  }, [visible, paymentData]);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 WebView message received:', data.type);

      switch (data.type) {
        case 'payment_success':
          console.log('✅ Payment success data:', data.data);
          setLoading(false);
          setHasError(false);
          
          onPaymentSuccess({
            success: true,
            paymentId: data.data.razorpay_payment_id,
            orderId: data.data.razorpay_order_id,
            signature: data.data.razorpay_signature,
            amount: data.data.amount / 100,
            currency: data.data.currency,
            description: data.data.description,
            isTest: true,
            rawData: data.data
          });
          onClose();
          break;

        case 'payment_failed':
          console.log('❌ Payment failed:', data.data);
          setLoading(false);
          setHasError(true);
          
          onPaymentFailed({
            success: false,
            error: data.data.error || 'Payment failed',
            code: data.data.code,
            metadata: data.data.metadata
          });
          onClose();
          break;

        case 'payment_cancelled':
          console.log('⏹️ Payment cancelled:', data.data);
          setLoading(false);
          setHasError(false);
          
          onPaymentFailed({
            success: false,
            error: 'Payment cancelled by user',
            code: 'cancelled',
            reason: data.data.reason
          });
          onClose();
          break;

        case 'page_error':
          console.error('🌐 Page error:', data.data);
          setHasError(true);
          break;

        default:
          console.log('📨 Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('❌ Error parsing WebView message:', error);
      setHasError(true);
    }
  };

  const handleClose = () => {
    console.log('🔄 Closing WebView');
    setHasError(false);
    setHtmlContent('');
    onClose();
  };

  const retryPayment = () => {
    console.log('🔄 Retrying payment...');
    setHasError(false);
    setLoading(true);
    // Regenerate HTML content
    if (paymentData) {
      const content = paymentData?.htmlContent || generateRazorpayHTML(paymentData);
      setHtmlContent(content);
    }
  };

  // Don't render WebView if no HTML content
  if (!htmlContent) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment Gateway</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Preparing payment gateway...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleClose} 
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure Payment Gateway</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Error State */}
        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Payment Error</Text>
            <Text style={styles.errorText}>
              There was an issue with the payment gateway
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={retryPayment}
            >
              <Text style={styles.retryButtonText}>Retry Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading Overlay */}
        {loading && !hasError && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading payment gateway...</Text>
            <Text style={styles.loadingSubtext}>
              Please wait while we connect securely
            </Text>
          </View>
        )}

        {/* WebView - Only render when we have content */}
        {!hasError && (
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            onLoadStart={() => {
              console.log('🌐 WebView loading started');
              setLoading(true);
              setHasError(false);
            }}
            onLoadEnd={() => {
              console.log('🌐 WebView loading ended');
              setLoading(false);
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ WebView error:', nativeEvent);
              setHasError(true);
              setLoading(false);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('🌐 WebView HTTP error:', nativeEvent);
              setHasError(true);
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            scalesPageToFit={true}
            scrollEnabled={false}
            injectedJavaScript={`
              // Inject some debugging info
              console.log('🌐 WebView injected JavaScript loaded');
              window.isReactNativeWebView = true;
              
              // Handle back button
              document.addEventListener('backbutton', function(e) {
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({
                    type: 'payment_cancelled',
                    data: { reason: 'back_button' }
                  })
                );
              }, false);
              
              true;
            `}
          />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.securityInfo}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>100% Secure Payment</Text>
          </View>
          <View style={styles.platformInfo}>
            <Text style={styles.platformText}>
              Powered by Razorpay • Test Mode
            </Text>
          </View>
        </View>

        {/* Close button for error state */}
        {hasError && (
          <TouchableOpacity 
            style={styles.bottomCloseButton}
            onPress={handleClose}
          >
            <Text style={styles.bottomCloseButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: Platform.OS === 'ios' ? 50 : 16
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef'
  },
  closeButtonText: {
    fontSize: 18,
    color: '#667eea',
    fontWeight: 'bold',
    width: 20,
    height: 20,
    textAlign: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  headerSpacer: {
    width: 40
  },
  webview: {
    flex: 1,
    opacity: 1
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600'
  },
  loadingSubtext: {
    marginTop: 8,
    color: '#666',
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  bottomCloseButton: {
    backgroundColor: '#e9ecef',
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6'
  },
  bottomCloseButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  footer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  securityIcon: {
    fontSize: 12,
    marginRight: 4
  },
  securityText: {
    fontSize: 12,
    color: '#666'
  },
  platformInfo: {
    alignItems: 'center'
  },
  platformText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center'
  }
});

export default RazorpayWebView;