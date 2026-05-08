// src/screens/employer/SubscriptionScreen.js
// FIXES:
//   1. user can be null (AsyncStorage-only mode) — use resolvedUid from userProfile
//   2. subscription.expiryDate may be a Firestore Timestamp — handle .toDate()
//   3. Subscribe Now button: replaced every user.uid / user.displayName / user.email
//      reference with safe resolvedUid / resolvedName / resolvedEmail

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  checkSubscriptionStatus,
  activateMonthlySubscription,
} from '../../services/database';
import {
  initiateRazorpayPayment,
  verifyRazorpayPayment,
  isRazorpayAvailable,
} from '../../services/razorpay';
import RazorpayWebView from '../../components/RazorpayWebView';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#0F0F13',
  surface:   '#1A1A22',
  surfaceL:  '#242430',
  border:    '#2A2A38',
  gold:      '#F59E0B',
  goldSoft:  '#FEF3C7',
  goldDeep:  '#D97706',
  purple:    '#7C3AED',
  purpleL:   '#A78BFA',
  purpleSoft:'#EDE9FE',
  emerald:   '#10B981',
  emeraldS:  '#D1FAE5',
  white:     '#FFFFFF',
  text:      '#F1F0F5',
  textM:     '#A09DB8',
  textL:     '#6B6880',
  saffron:   '#FF6B35',
  red:       '#EF4444',
};

// Safe date formatter — handles Firestore Timestamps, JS Dates, and strings
const formatExpiryDate = (expiryDate, locale) => {
  if (!expiryDate) return 'N/A';
  try {
    let date;
    if (expiryDate?.toDate) {
      date = expiryDate.toDate();
    } else if (expiryDate instanceof Date) {
      date = expiryDate;
    } else {
      date = new Date(expiryDate);
    }
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

export default function SubscriptionScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const { locale } = useLanguage();

  // FIX: resolve uid/name/email safely — user can be null
  const resolvedUid   = user?.uid   || userProfile?.uid   || null;
  const resolvedName  = user?.displayName || userProfile?.name  || userProfile?.companyName || 'Employer';
  const resolvedEmail = user?.email || userProfile?.email || 'employer@udyogi.com';

  const [loading, setLoading]                 = useState(true);
  const [processing, setProcessing]           = useState(false);
  const [subscription, setSubscription]       = useState(null);
  const [showRazorpayWebView, setShowRazorpayWebView] = useState(false);
  const [webViewPaymentData, setWebViewPaymentData]   = useState(null);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const tr = locale === 'hi' ? {
    title: 'सदस्यता योजना',
    currentStatus: 'वर्तमान स्थिति',
    activeSub: 'सक्रिय मासिक सदस्यता',
    expires: 'समाप्ति:',
    daysLeft: 'दिन शेष',
    noSub: 'कोई सक्रिय सदस्यता नहीं',
    freePostsUsed: 'मुफ्त पोस्ट इस्तेमाल',
    recommended: 'अनुशंसित',
    monthlyPlan: 'मासिक योजना',
    perMonth: 'प्रति माह',
    unlimited: 'असीमित नौकरी पोस्टिंग',
    noPlatformFees: 'कोई प्लेटफॉर्म शुल्क नहीं',
    prioritySupport: 'प्राथमिकिक सपोर्ट',
    advancedAnalytics: 'उन्नत एनालिटिक्स',
    premiumBadge: 'प्रीमियम बैज',
    subscribeNow: 'अभी सब्सक्राइब करें',
    alreadyActive: 'सक्रिय सदस्यता',
    freePlan: 'मुफ्त योजना',
    freeForever: 'हमेशा के लिए मुफ्त',
    freeFeature1: '3 मुफ्त नौकरी पोस्ट प्रति माह',
    freeFeature2: 'मूल सपोर्ट',
    freeFeature3: 'कर्मचारी पहुँच',
    currentPlan: 'वर्तमान योजना',
    back: '← वापस',
    success: 'सफलता',
    activated: 'मासिक सदस्यता सक्रिय हो गई है! अब आप असीमित नौकरियां पोस्ट कर सकते हैं।',
    error: 'त्रुटि',
    payFailed: 'सदस्यता सक्रिय करने में विफल',
    authError: 'कृपया पुनः लॉगिन करें',
    ok: 'ठीक है',
    loading: 'लोड हो रहा है...',
    paymentUnavailable: 'ऑनलाइन भुगतान अभी उपलब्ध नहीं है',
  } : {
    title: 'Subscription Plans',
    currentStatus: 'Current Status',
    activeSub: 'Active Monthly Subscription',
    expires: 'Expires:',
    daysLeft: 'days remaining',
    noSub: 'No Active Subscription',
    freePostsUsed: 'free posts used',
    recommended: 'Recommended',
    monthlyPlan: 'Monthly Plan',
    perMonth: 'per month',
    unlimited: 'Unlimited job posting',
    noPlatformFees: 'No platform fees',
    prioritySupport: 'Priority support',
    advancedAnalytics: 'Advanced analytics',
    premiumBadge: 'Premium badge',
    subscribeNow: 'Subscribe Now',
    alreadyActive: 'Active Subscription',
    freePlan: 'Free Plan',
    freeForever: 'Free Forever',
    freeFeature1: '3 free job posts per month',
    freeFeature2: 'Basic support',
    freeFeature3: 'Worker access',
    currentPlan: 'Current Plan',
    back: '← Back',
    success: 'Success!',
    activated: 'Monthly subscription activated! You can now post unlimited jobs.',
    error: 'Error',
    payFailed: 'Failed to activate subscription',
    authError: 'Please log in again.',
    ok: 'OK',
    loading: 'Loading...',
    paymentUnavailable: 'Online payment is currently unavailable',
  };

  useEffect(() => {
    loadSubscriptionStatus();
  }, [resolvedUid]);

  const loadSubscriptionStatus = async () => {
    if (!resolvedUid) {
      setLoading(false);
      return;
    }
    try {
      const result = await checkSubscriptionStatus(resolvedUid);
      if (result.success) setSubscription(result.subscription);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  };

  // FIX: use resolvedUid / resolvedName — never touch user.uid / user.displayName
  const handleSubscribe = async () => {
    if (!resolvedUid) {
      Alert.alert(tr.error, tr.authError);
      return;
    }

    if (!isRazorpayAvailable()) {
      Alert.alert(tr.error, tr.paymentUnavailable);
      return;
    }

    setProcessing(true);
    try {
      const paymentData = {
        amount: 4900, // paise
        description: 'Monthly Subscription - Unlimited Job Posting',
        employerName: resolvedName,
        employerId: resolvedUid,
        subscription: true,
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
                await activateMonthlySubscription(resolvedUid, {
                  paymentId: paymentResult.paymentId,
                  transactionId: paymentResult.orderId,
                });
                Alert.alert(
                  `✅ ${tr.success}`,
                  tr.activated,
                  [{
                    text: tr.ok,
                    onPress: () => {
                      loadSubscriptionStatus();
                      navigation.goBack();
                    },
                  }]
                );
              } else {
                Alert.alert(tr.error, tr.payFailed);
              }
            } catch (error) {
              console.error('Subscription activation error:', error);
              Alert.alert(tr.error, tr.payFailed);
            }
          },
          onError: (error) => {
            Alert.alert(tr.error, error.error || tr.payFailed);
          },
        };
        setWebViewPaymentData(webViewData);
        setShowRazorpayWebView(true);
      } else if (!razorpayResult.success) {
        Alert.alert(tr.error, razorpayResult.error || tr.payFailed);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert(tr.error, tr.payFailed);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loadingText}>{tr.loading}</Text>
        </View>
      </View>
    );
  }

  const isActive = subscription?.isActive;
  const freeUsed = userProfile?.freePostsUsed || 0;

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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{tr.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr.title}</Text>
        <View style={{ width: 80 }} />
      </View>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusCardTitle}>{tr.currentStatus}</Text>
          {isActive ? (
            <View style={styles.activeStatusRow}>
              <View style={styles.activeIconWrap}>
                <Text style={{ fontSize: 28 }}>👑</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeTitle}>{tr.activeSub}</Text>
                <Text style={styles.activeExpiry}>
                  {tr.expires} {formatExpiryDate(subscription.expiryDate, locale)}
                  {subscription.daysRemaining > 0 ? ` · ${subscription.daysRemaining} ${tr.daysLeft}` : ''}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            </View>
          ) : (
            <View style={styles.inactiveStatusRow}>
              <View style={styles.inactiveIconWrap}>
                <Text style={{ fontSize: 28 }}>💼</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inactiveTitle}>{tr.noSub}</Text>
                <Text style={styles.inactiveExpiry}>{freeUsed}/3 {tr.freePostsUsed}</Text>
              </View>
              <View style={styles.freePill}>
                <Text style={styles.freePillText}>FREE</Text>
              </View>
            </View>
          )}
        </View>

        {/* Monthly Plan Card */}
        <View style={styles.premiumCard}>
          <View style={styles.premiumGlow} />

          <View style={styles.premiumHeader}>
            <View style={styles.premiumBadgeRow}>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>⭐ {tr.recommended}</Text>
              </View>
            </View>
            <Text style={styles.premiumPlanName}>{tr.monthlyPlan}</Text>
            <View style={styles.premiumPriceRow}>
              <Text style={styles.premiumCurrency}>₹</Text>
              <Text style={styles.premiumPrice}>49</Text>
              <View style={styles.premiumPriceSuffix}>
                <Text style={styles.premiumPerMonth}>{tr.perMonth}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.premiumFeatures}>
            {[
              { icon: '♾️', text: tr.unlimited },
              { icon: '🆓', text: tr.noPlatformFees },
              { icon: '🎯', text: tr.prioritySupport },
              { icon: '📊', text: tr.advancedAnalytics },
              { icon: '🏆', text: tr.premiumBadge },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
                <Text style={{ color: C.emerald, fontSize: 16, fontWeight: '700' }}>✓</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.subscribeBtn, (isActive || processing) && styles.subscribeBtnDisabled]}
            onPress={handleSubscribe}
            disabled={isActive || processing}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color={C.bg} size="small" />
            ) : (
              <Text style={styles.subscribeBtnText}>
                {isActive ? `✓ ${tr.alreadyActive}` : `🚀  ${tr.subscribeNow}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Free Plan Card */}
        <View style={styles.freeCard}>
          <View style={styles.freeHeader}>
            <Text style={styles.freePlanName}>{tr.freePlan}</Text>
            <Text style={styles.freeForever}>{tr.freeForever}</Text>
          </View>
          <View style={styles.freePriceRow}>
            <Text style={styles.freePrice}>₹0</Text>
          </View>

          <View style={styles.freeFeatures}>
            {[tr.freeFeature1, tr.freeFeature2, tr.freeFeature3].map((f, i) => (
              <View key={i} style={styles.freeFeatureRow}>
                <Text style={{ color: C.textM, fontSize: 15, marginRight: 10 }}>·</Text>
                <Text style={styles.freeFeatureText}>{f}</Text>
              </View>
            ))}
          </View>

          {!isActive && (
            <View style={styles.currentPlanBadge}>
              <Text style={styles.currentPlanText}>✓ {tr.currentPlan}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  loadingBox:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:  { color: C.textM, marginTop: 14, fontSize: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn:      { paddingVertical: 4, paddingRight: 12 },
  backBtnText:  { color: C.gold, fontSize: 16, fontWeight: '600' },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },

  content: { padding: 20 },

  statusCard:      { backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  statusCardTitle: { fontSize: 11, fontWeight: '700', color: C.textL, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  activeStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  activeIconWrap:  { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  activeTitle:     { fontSize: 15, fontWeight: '700', color: C.gold, marginBottom: 4 },
  activeExpiry:    { fontSize: 13, color: C.textM },
  activeBadge:     { backgroundColor: '#065F46', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#6EE7B7', letterSpacing: 1 },
  inactiveStatusRow:{ flexDirection: 'row', alignItems: 'center', gap: 14 },
  inactiveIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surfaceL, justifyContent: 'center', alignItems: 'center' },
  inactiveTitle:    { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  inactiveExpiry:   { fontSize: 13, color: C.textM },
  freePill:         { backgroundColor: C.surfaceL, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  freePillText:     { fontSize: 10, fontWeight: '800', color: C.textM, letterSpacing: 1 },

  premiumCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: C.gold + '60',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  premiumGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: C.gold + '15',
  },
  premiumHeader:    { marginBottom: 20 },
  premiumBadgeRow:  { marginBottom: 12 },
  recommendedBadge: { alignSelf: 'flex-start', backgroundColor: C.gold + '25', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.gold + '50' },
  recommendedText:  { fontSize: 12, fontWeight: '700', color: C.gold, letterSpacing: 0.5 },
  premiumPlanName:  { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 12, letterSpacing: -0.5 },
  premiumPriceRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  premiumCurrency:  { fontSize: 22, fontWeight: '800', color: C.gold, marginTop: 6 },
  premiumPrice:     { fontSize: 56, fontWeight: '900', color: C.gold, lineHeight: 60, letterSpacing: -2 },
  premiumPriceSuffix:{ justifyContent: 'flex-end', paddingBottom: 8, marginLeft: 6 },
  premiumPerMonth:  { fontSize: 14, color: C.textM, fontWeight: '500' },

  divider: { height: 1, backgroundColor: C.border, marginBottom: 20 },

  premiumFeatures: { marginBottom: 24 },
  featureRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surfaceL, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  featureText:     { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },

  subscribeBtn: {
    backgroundColor: C.gold,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  subscribeBtnDisabled: { backgroundColor: C.textL, shadowOpacity: 0 },
  subscribeBtnText: { color: C.bg, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  freeCard:       { backgroundColor: C.surface, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: C.border },
  freeHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  freePlanName:   { fontSize: 20, fontWeight: '700', color: C.text },
  freeForever:    { fontSize: 12, color: C.textL, fontStyle: 'italic' },
  freePriceRow:   { marginBottom: 16 },
  freePrice:      { fontSize: 36, fontWeight: '800', color: C.textM },
  freeFeatures:   { marginBottom: 16 },
  freeFeatureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  freeFeatureText:{ fontSize: 14, color: C.textM },
  currentPlanBadge: { backgroundColor: C.surfaceL, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  currentPlanText:  { fontSize: 13, fontWeight: '700', color: C.textM, letterSpacing: 0.5 },
});