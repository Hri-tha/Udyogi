// src/screens/employer/SubscriptionScreen.js - NEW FILE
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../constants/colors';
import { 
  checkSubscriptionStatus, 
  activateMonthlySubscription 
} from '../../services/database';
import {
  initiateRazorpayPayment,
  verifyRazorpayPayment,
  isRazorpayAvailable
} from '../../services/razorpay';
import RazorpayWebView from '../../components/RazorpayWebView';
import { LinearGradient } from 'expo-linear-gradient';

export default function SubscriptionScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const { locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [showRazorpayWebView, setShowRazorpayWebView] = useState(false);
  const [webViewPaymentData, setWebViewPaymentData] = useState(null);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const result = await checkSubscriptionStatus(user.uid);
      if (result.success) {
        setSubscription(result.subscription);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setProcessing(true);
    
    try {
      const available = isRazorpayAvailable();
      if (!available) {
        Alert.alert(
          locale === 'hi' ? 'त्रुटि' : 'Error',
          locale === 'hi' ? 'ऑनलाइन भुगतान वर्तमान में अनुपलब्ध है' : 'Online payment is currently unavailable'
        );
        return;
      }
      
      const paymentData = {
        amount: 4900, // ₹49 in paise
        description: locale === 'hi' ? 'मासिक सदस्यता - असीमित नौकरी पोस्टिंग' : 'Monthly Subscription - Unlimited Job Posting',
        employerName: user.displayName || userProfile?.name || 'Employer',
        employerId: user.uid,
        subscription: true
      };
      
      const razorpayResult = await initiateRazorpayPayment(paymentData);
      
      if (razorpayResult.success && razorpayResult.useWebView) {
        const webViewData = {
          ...razorpayResult.webViewConfig,
          htmlContent: razorpayResult.htmlContent,
          onSuccess: async (paymentResult) => {
            try {
              const verificationResult = await verifyRazorpayPayment(paymentResult);
              
              if (verificationResult.success && verificationResult.verified) {
                await activateMonthlySubscription(user.uid, {
                  paymentId: paymentResult.paymentId,
                  transactionId: paymentResult.orderId
                });
                
                Alert.alert(
                  locale === 'hi' ? 'सफलता' : 'Success',
                  locale === 'hi' ? 
                    'मासिक सदस्यता सक्रिय हो गई है! अब आप असीमित नौकरियां पोस्ट कर सकते हैं।' :
                    'Monthly subscription activated! You can now post unlimited jobs.',
                  [{
                    text: 'OK',
                    onPress: () => {
                      navigation.goBack();
                    }
                  }]
                );
              }
            } catch (error) {
              console.error('Subscription activation error:', error);
            }
          },
          onError: (error) => {
            Alert.alert(
              locale === 'hi' ? 'भुगतान विफल' : 'Payment Failed',
              error.error || (locale === 'hi' ? 'सदस्यता सक्रिय करने में विफल' : 'Failed to activate subscription')
            );
          }
        };
        
        setWebViewPaymentData(webViewData);
        setShowRazorpayWebView(true);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'सदस्यता प्रोसेस करने में विफल' : 'Failed to process subscription'
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RazorpayWebView
        visible={showRazorpayWebView}
        onClose={() => setShowRazorpayWebView(false)}
        paymentData={webViewPaymentData}
        onPaymentSuccess={(result) => {
          setShowRazorpayWebView(false);
          webViewPaymentData?.onSuccess(result);
        }}
        onPaymentFailed={(error) => {
          setShowRazorpayWebView(false);
          webViewPaymentData?.onError(error);
        }}
      />
      
      <LinearGradient
        colors={[colors.primary, '#4A90E2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {locale === 'hi' ? 'सदस्यता योजना' : 'Subscription Plans'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Current Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            {locale === 'hi' ? 'वर्तमान स्थिति' : 'Current Status'}
          </Text>
          {subscription?.isActive ? (
            <View style={styles.activeStatus}>
              <Text style={styles.activeIcon}>👑</Text>
              <View style={styles.statusInfo}>
                <Text style={styles.activeText}>
                  {locale === 'hi' ? 'सक्रिय मासिक सदस्यता' : 'Active Monthly Subscription'}
                </Text>
                <Text style={styles.expiryText}>
                  {locale === 'hi' ? 
                    `समाप्ति: ${new Date(subscription.expiryDate).toLocaleDateString('hi-IN')} (${subscription.daysRemaining} दिन शेष)` :
                    `Expires: ${new Date(subscription.expiryDate).toLocaleDateString('en-IN')} (${subscription.daysRemaining} days remaining)`
                  }
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.inactiveStatus}>
              <Text style={styles.inactiveIcon}>💼</Text>
              <View style={styles.statusInfo}>
                <Text style={styles.inactiveText}>
                  {locale === 'hi' ? 'कोई सक्रिय सदस्यता नहीं' : 'No Active Subscription'}
                </Text>
                <Text style={styles.freePostsText}>
                  {locale === 'hi' ? 
                    `${userProfile?.freePostsUsed || 0} / 3 मुफ्त पोस्ट इस्तेमाल किए गए` :
                    `${userProfile?.freePostsUsed || 0} / 3 free posts used`
                  }
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Monthly Plan */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>
              {locale === 'hi' ? 'मासिक योजना' : 'Monthly Plan'}
            </Text>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>
                {locale === 'hi' ? 'लोकप्रिय' : 'Popular'}
              </Text>
            </View>
          </View>
          
          <View style={styles.priceSection}>
            <Text style={styles.price}>₹49</Text>
            <Text style={styles.priceDuration}>
              {locale === 'hi' ? 'प्रति माह' : 'per month'}
            </Text>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                {locale === 'hi' ? 'असीमित नौकरी पोस्टिंग' : 'Unlimited job posting'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                {locale === 'hi' ? 'कोई प्लेटफॉर्म शुल्क नहीं' : 'No platform fees'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                {locale === 'hi' ? 'प्राथमिकिक सपोर्ट' : 'Priority support'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                {locale === 'hi' ? 'उन्नत एनालिटिक्स' : 'Advanced analytics'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                {locale === 'hi' ? 'प्रीमियम बैज' : 'Premium badge'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.subscribeButton,
              subscription?.isActive && styles.disabledButton
            ]}
            onPress={handleSubscribe}
            disabled={subscription?.isActive || processing}
          >
            {processing ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {subscription?.isActive 
                  ? (locale === 'hi' ? 'सक्रिय सदस्यता' : 'Active Subscription')
                  : (locale === 'hi' ? 'अभी सब्सक्राइब करें' : 'Subscribe Now')
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Free Plan */}
        <View style={[styles.planCard, styles.freePlanCard]}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>
              {locale === 'hi' ? 'मुफ्त योजना' : 'Free Plan'}
            </Text>
          </View>
          
          <View style={styles.priceSection}>
            <Text style={[styles.price, styles.freePrice]}>₹0</Text>
            <Text style={styles.priceDuration}>
              {locale === 'hi' ? 'हमेशा के लिए मुफ्त' : 'Free Forever'}
            </Text>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                {locale === 'hi' ? '3 मुफ्त नौकरी पोस्ट प्रति माह' : '3 free job posts per month'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                {locale === 'hi' ? 'मूल सपोर्ट' : 'Basic support'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                {locale === 'hi' ? 'कार्यकर्ता पहुँच' : 'Worker access'}
              </Text>
            </View>
          </View>

          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>
              {locale === 'hi' ? 'वर्तमान योजना' : 'Current Plan'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  inactiveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '20',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  activeIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  inactiveIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  activeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 4,
  },
  inactiveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.info,
    marginBottom: 4,
  },
  expiryText: {
    fontSize: 14,
    color: colors.text,
  },
  freePostsText: {
    fontSize: 14,
    color: colors.text,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  freePlanCard: {
    borderColor: colors.border,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  popularBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  freePrice: {
    color: colors.textSecondary,
  },
  priceDuration: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    color: colors.success,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    width: 20,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: colors.success,
    opacity: 0.7,
  },
  subscribeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentPlanBadge: {
    backgroundColor: colors.info + '20',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.info,
  },
  currentPlanText: {
    color: colors.info,
    fontSize: 14,
    fontWeight: '600',
  },
});