// src/screens/employer/PostJobSuccessScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { colors } from '../../constants/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Theme ──────────────────────────────────────────────────────────────────
const PRIMARY   = '#4F63D2';
const SUCCESS   = '#22C55E';
const WARNING   = '#F59E0B';
const BG        = '#F7F8FC';
const WHITE     = '#FFFFFF';
const BORDER    = '#ECEEF5';
const TEXT      = '#1A1D2E';
const MUTED     = '#8A8FA8';
const CARD_SH   = {
  shadowColor: '#1A1D2E',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
};

export default function PostJobSuccessScreen() {
  const navigation  = useNavigation();
  const route       = useRoute();
  const { locale }  = useLanguage();
  const { jobData, isPaid = true } = route.params || {};

  // ── Animations ──────────────────────────────────────────────────────────
  const checkScale  = useRef(new Animated.Value(0)).current;
  const fadeIn      = useRef(new Animated.Value(0)).current;
  const slideUp     = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeIn,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Translations ─────────────────────────────────────────────────────────
  const tr = {
    en: {
      title: 'Job Posted!',
      subtitle: 'Your job is now live and visible to workers nearby.',
      platformFeePaid: 'Platform fee paid',
      jobDetails: 'Job Details',
      jobTitle: 'Job Title',
      description: 'Description',
      date: 'Date',
      time: 'Time',
      duration: 'Duration',
      hourlyRate: 'Hourly Rate',
      totalPayment: 'Total Payment',
      platformFee: 'Platform Fee',
      paid: 'Paid',
      pending: 'Pending',
      location: 'Location',
      whatsNext: "What's Next?",
      step1Title: 'Wait for Applications',
      step1Desc: 'Workers will apply once they see your listing.',
      step2Title: 'Review & Select',
      step2Desc: 'Check worker profiles, ratings and experience.',
      step3Title: 'Confirm Worker',
      step3Desc: 'Send confirmation to your preferred worker.',
      step4Title: 'Track Progress',
      step4Desc: 'Monitor the job and chat with your worker.',
      viewMyJobs: 'View My Jobs',
      postAnotherJob: 'Post Another Job',
      shareThisJob: 'Share This Job',
      shareFeature: 'Share Feature',
      shareFeatureMessage: 'Job sharing feature will be added soon!',
      proTip: '💡 Respond quickly to applications to find the best workers!',
      noDescription: 'No description provided',
      notAvailable: 'N/A',
      hours: 'hrs',
      perHour: '/hr',
    },
    hi: {
      title: 'नौकरी पोस्ट हो गई!',
      subtitle: 'आपकी नौकरी अब लाइव है और आस-पास के कर्मचारियों को दिख रही है।',
      platformFeePaid: 'प्लेटफॉर्म शुल्क चुकाया गया',
      jobDetails: 'नौकरी विवरण',
      jobTitle: 'नौकरी शीर्षक',
      description: 'विवरण',
      date: 'तारीख',
      time: 'समय',
      duration: 'अवधि',
      hourlyRate: 'प्रति घंटा दर',
      totalPayment: 'कुल भुगतान',
      platformFee: 'प्लेटफॉर्म शुल्क',
      paid: 'चुकाया गया',
      pending: 'लंबित',
      location: 'स्थान',
      whatsNext: 'अगले कदम',
      step1Title: 'आवेदनों की प्रतीक्षा करें',
      step1Desc: 'कर्मचारी आपकी नौकरी देखकर आवेदन करेंगे।',
      step2Title: 'समीक्षा करें और चुनें',
      step2Desc: 'प्रोफाइल, रेटिंग और अनुभव जांचें।',
      step3Title: 'कर्मचारी की पुष्टि करें',
      step3Desc: 'अपने पसंदीदा कर्मचारी को पुष्टि भेजें।',
      step4Title: 'प्रगति ट्रैक करें',
      step4Desc: 'नौकरी की स्थिति देखें और कर्मचारी से चैट करें।',
      viewMyJobs: 'मेरी नौकरियां देखें',
      postAnotherJob: 'एक और नौकरी पोस्ट करें',
      shareThisJob: 'इस नौकरी को साझा करें',
      shareFeature: 'साझा करें',
      shareFeatureMessage: 'नौकरी साझा करने की सुविधा जल्द आएगी!',
      proTip: '💡 सर्वश्रेष्ठ कर्मचारी पाने के लिए आवेदनों का जल्दी जवाब दें!',
      noDescription: 'कोई विवरण नहीं',
      notAvailable: 'उपलब्ध नहीं',
      hours: 'घंटे',
      perHour: '/घंटा',
    },
  }[locale] || {};

  const handleViewJobs    = () => navigation.replace('EmployerMain', { screen: 'EmployerHome' });
  const handlePostAnother = () => navigation.replace('PostJob');

  const STEPS = [
    { num: 1, title: tr.step1Title, desc: tr.step1Desc, icon: '📬', color: PRIMARY },
    { num: 2, title: tr.step2Title, desc: tr.step2Desc, icon: '🔍', color: '#8B5CF6' },
    { num: 3, title: tr.step3Title, desc: tr.step3Desc, icon: '✅', color: SUCCESS },
    { num: 4, title: tr.step4Title, desc: tr.step4Desc, icon: '📍', color: WARNING },
  ];

  // ── Minimal fallback (no jobData) ────────────────────────────────────────
  if (!jobData) {
    return (
      <View style={s.screen}>
        <View style={s.fallbackCenter}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <LinearGradient colors={[SUCCESS, '#16a34a']} style={s.bigCheck}>
              <Text style={s.bigCheckText}>✓</Text>
            </LinearGradient>
          </Animated.View>
          <Text style={s.fallbackTitle}>{tr.title}</Text>
          <Text style={s.fallbackSub}>{tr.subtitle}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={handleViewJobs} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>{tr.viewMyJobs}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={handlePostAnother} activeOpacity={0.8}>
            <Text style={s.ghostBtnText}>{tr.postAnotherJob}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Full screen ──────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      {/* ── Hero gradient header ── */}
      <LinearGradient colors={['#4F63D2', '#6B7FE3']} style={s.hero}>
        <Animated.View style={{ transform: [{ scale: checkScale }] }}>
          <View style={s.checkRing}>
            <View style={s.checkInner}>
              <Text style={s.checkMark}>✓</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <Text style={s.heroTitle}>{tr.title}</Text>
          <Text style={s.heroSub}>{tr.subtitle}</Text>
          {isPaid && (
            <View style={s.feeBadge}>
              <Text style={s.feeBadgeText}>💰 {tr.platformFeePaid}</Text>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Job Details card ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>{tr.jobDetails}</Text>

          <DetailRow label={tr.jobTitle}     value={jobData.title} bold />
          {jobData.description ? (
            <DetailRow label={tr.description} value={jobData.description} lines={2} />
          ) : null}
          <DetailRow label={tr.date}         value={jobData.jobDate} />
          <DetailRow label={tr.time}         value={`${jobData.startTime} – ${jobData.endTime}`} />
          {jobData.duration ? (
            <DetailRow label={tr.duration}   value={`${jobData.duration} ${tr.hours}`} />
          ) : null}
          <DetailRow label={tr.hourlyRate}   value={`₹${jobData.rate || tr.notAvailable}${tr.perHour}`} accent />
          <DetailRow label={tr.totalPayment} value={`₹${jobData.totalPayment || tr.notAvailable}`} bold />
          <View style={s.divider} />
          <View style={s.feeRow}>
            <Text style={s.feeLabel}>{tr.platformFee}</Text>
            <View style={[s.feePill, isPaid ? s.feePillPaid : s.feePillPending]}>
              <Text style={[s.feePillText, { color: isPaid ? SUCCESS : WARNING }]}>
                ₹{jobData.platformFee || '0'} · {isPaid ? tr.paid : tr.pending}
              </Text>
            </View>
          </View>
          {jobData.location ? (
            <DetailRow label={tr.location} value={jobData.location} />
          ) : null}
        </View>

        {/* ── What's Next ── */}
        <Text style={s.sectionHeader}>{tr.whatsNext}</Text>
        {STEPS.map((step, idx) => (
          <View key={step.num} style={s.stepCard}>
            <View style={[s.stepIconWrap, { backgroundColor: step.color + '18' }]}>
              <Text style={s.stepIconText}>{step.icon}</Text>
            </View>
            <View style={s.stepBody}>
              <Text style={s.stepNum}>Step {step.num}</Text>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDesc}>{step.desc}</Text>
            </View>
            {idx < STEPS.length - 1 && <View style={s.stepConnector} />}
          </View>
        ))}

        {/* ── Tip ── */}
        <View style={s.tipCard}>
          <Text style={s.tipText}>{tr.proTip}</Text>
        </View>

        {/* ── Actions ── */}
        <TouchableOpacity style={s.primaryBtn} onPress={handleViewJobs} activeOpacity={0.85}>
          <LinearGradient colors={['#4F63D2', '#6B7FE3']} style={s.primaryBtnGrad}>
            <Text style={s.primaryBtnText}>{tr.viewMyJobs}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={s.ghostBtn} onPress={handlePostAnother} activeOpacity={0.8}>
          <Text style={s.ghostBtnText}>{tr.postAnotherJob}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.shareBtn}
          onPress={() => Alert.alert(tr.shareFeature, tr.shareFeatureMessage)}
          activeOpacity={0.8}
        >
          <Text style={s.shareBtnText}>🔗 {tr.shareThisJob}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ── Sub-component ────────────────────────────────────────────────────────────
const DetailRow = ({ label, value, bold, accent, lines }) => (
  <View style={s.detailRow}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text
      style={[s.detailValue, bold && s.detailBold, accent && s.detailAccent]}
      numberOfLines={lines || 1}
    >
      {value}
    </Text>
  </View>
);

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Hero
  hero: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  checkRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  checkInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 34, color: SUCCESS },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: WHITE,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  feeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  feeBadgeText: { color: WHITE, fontSize: 13, fontWeight: '600' },

  // Fallback
  fallbackCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  bigCheck: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  bigCheckText: { fontSize: 44, color: WHITE, fontWeight: '800' },
  fallbackTitle: { fontSize: 24, fontWeight: '800', color: TEXT, marginBottom: 8, textAlign: 'center' },
  fallbackSub: { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 20 },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    ...CARD_SH,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  detailLabel: { fontSize: 14, color: MUTED, flex: 1 },
  detailValue: { fontSize: 14, color: TEXT, fontWeight: '500', textAlign: 'right', flex: 2 },
  detailBold:  { fontWeight: '700', color: TEXT },
  detailAccent:{ fontWeight: '700', color: PRIMARY },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  feeRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  feeLabel:{ fontSize: 14, color: MUTED },
  feePill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  feePillPaid:    { backgroundColor: SUCCESS + '18' },
  feePillPending: { backgroundColor: WARNING + '18' },
  feePillText: { fontSize: 13, fontWeight: '600' },

  // Steps
  sectionHeader: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 14,
    marginTop: 4,
  },
  stepCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    ...CARD_SH,
  },
  stepIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepIconText: { fontSize: 22 },
  stepBody: { flex: 1 },
  stepNum:  { fontSize: 11, color: MUTED, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  stepTitle:{ fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  stepDesc: { fontSize: 13, color: MUTED, lineHeight: 18 },
  stepConnector: { display: 'none' }, // visual connector is implicit via spacing

  // Tip
  tipCard: {
    backgroundColor: PRIMARY + '10',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  tipText: { fontSize: 13, color: PRIMARY, lineHeight: 19, fontWeight: '500' },

  // Buttons
  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    ...CARD_SH,
  },
  primaryBtnGrad: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  ghostBtn: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: WHITE,
  },
  ghostBtnText: { color: PRIMARY, fontSize: 15, fontWeight: '700' },

  shareBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  shareBtnText: { color: MUTED, fontSize: 14, fontWeight: '600' },
});