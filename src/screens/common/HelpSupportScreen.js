// src/screens/common/HelpSupportScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';

// ─── Contact Details ──────────────────────────────────────────────────────────
const SUPPORT_PHONE   = '9137532150';
const SUPPORT_EMAIL   = 'hrithikkthakurdbg@gmail.com';
const WHATSAPP_NUMBER = '919137532150'; // country code + number, no +

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       '#F4F6FB',
  white:    '#FFFFFF',
  primary:  '#4F63D2',
  green:    '#25D366',   // WhatsApp brand
  email:    '#EA4335',   // Gmail red
  phone:    '#16A34A',
  text:     '#111827',
  sub:      '#6B7280',
  muted:    '#9CA3AF',
  border:   '#E5E7EB',
};

const SHADOW = {
  shadowColor: '#1A1D2E',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.09,
  shadowRadius: 10,
  elevation: 4,
};

const FAQ_DATA = {
  en: [
    {
      q: 'How do I post a job?',
      a: 'Go to your dashboard and tap "Post New Job". Fill in the job details like title, location, date, time, and hourly rate, then submit.',
    },
    {
      q: 'How do I accept a worker application?',
      a: 'Open the Applications screen, find the pending application, and tap "Accept". Your location will be shared with the worker automatically.',
    },
    {
      q: 'How does payment work?',
      a: 'After the worker marks the job as complete, you will see a "Process Payment" button. You can pay via cash or online. The exact amount is calculated based on actual hours worked.',
    },
    {
      q: 'How do I track a worker on the job?',
      a: 'Once a worker accepts and starts the journey, go to Applications → Track Job to see their real-time status.',
    },
    {
      q: 'Can I cancel or delete a job?',
      a: 'Yes. Jobs that have no accepted applications can be deleted from your job listing. Jobs with completed applications cannot be deleted.',
    },
    {
      q: 'What if I face a login issue?',
      a: 'Try logging out and back in. If the issue persists, contact our support team via WhatsApp or email below.',
    },
  ],
  hi: [
    {
      q: 'नौकरी कैसे पोस्ट करें?',
      a: 'डैशबोर्ड पर जाएं और "नई नौकरी पोस्ट करें" पर टैप करें। नौकरी का विवरण भरें जैसे शीर्षक, स्थान, तारीख, समय और प्रति घंटे की दर।',
    },
    {
      q: 'कर्मचारी का आवेदन कैसे स्वीकार करें?',
      a: 'आवेदन स्क्रीन खोलें, लंबित आवेदन ढूंढें और "स्वीकार करें" पर टैप करें। आपका स्थान स्वचालित रूप से कर्मचारी के साथ साझा हो जाएगा।',
    },
    {
      q: 'भुगतान कैसे होता है?',
      a: 'कर्मचारी के काम पूरा करने के बाद "भुगतान करें" बटन दिखेगा। कैश या ऑनलाइन भुगतान कर सकते हैं। राशि वास्तविक काम के घंटों के आधार पर होगी।',
    },
    {
      q: 'काम के दौरान कर्मचारी को कैसे ट्रैक करें?',
      a: 'आवेदन → नौकरी ट्रैक करें पर जाएं। वहाँ कर्मचारी की रीयल-टाइम स्थिति देख सकते हैं।',
    },
    {
      q: 'क्या नौकरी रद्द या हटाई जा सकती है?',
      a: 'हाँ। जिन नौकरियों में कोई स्वीकृत आवेदन नहीं है उन्हें हटाया जा सकता है। पूर्ण आवेदन वाली नौकरियाँ नहीं हटाई जा सकतीं।',
    },
    {
      q: 'लॉगिन समस्या हो तो क्या करें?',
      a: 'लॉगआउट करके दोबारा लॉगिन करें। समस्या बनी रहे तो नीचे दिए WhatsApp या ईमेल से संपर्क करें।',
    },
  ],
};

export default function HelpSupportScreen({ navigation }) {
  const { locale } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState(null);

  const tr = {
    en: {
      title:        'Help & Support',
      back:         '← Back',
      greeting:     'Hi there! 👋',
      greetingSub:  "We're here to help. Reach us instantly via any channel below.",
      contactUs:    'Contact Us',
      whatsapp:     'WhatsApp',
      whatsappSub:  'Fastest response · Usually replies in minutes',
      callUs:       'Call Us',
      callSub:      'Mon – Sat, 9 AM – 7 PM',
      emailUs:      'Email Us',
      emailSub:     'We reply within 24 hours',
      faqTitle:     'Frequently Asked Questions',
      faqSub:       'Quick answers to common questions',
      stillNeed:    'Still need help?',
      stillSub:     'Send us a message on WhatsApp and we will get back to you quickly.',
      msgUs:        'Message Us on WhatsApp',
    },
    hi: {
      title:        'मदद और सहायता',
      back:         '← पीछे',
      greeting:     'नमस्ते! 👋',
      greetingSub:  'हम आपकी मदद के लिए यहाँ हैं। नीचे दिए किसी भी माध्यम से हमसे संपर्क करें।',
      contactUs:    'संपर्क करें',
      whatsapp:     'WhatsApp',
      whatsappSub:  'सबसे तेज़ जवाब · आमतौर पर कुछ मिनटों में',
      callUs:       'कॉल करें',
      callSub:      'सोम – शनि, सुबह 9 – शाम 7',
      emailUs:      'ईमेल करें',
      emailSub:     '24 घंटे के अंदर जवाब मिलेगा',
      faqTitle:     'अक्सर पूछे जाने वाले सवाल',
      faqSub:       'सामान्य सवालों के त्वरित जवाब',
      stillNeed:    'अभी भी मदद चाहिए?',
      stillSub:     'WhatsApp पर मैसेज करें, हम जल्दी जवाब देंगे।',
      msgUs:        'WhatsApp पर मैसेज करें',
    },
  }[locale] || {};
  const t = { ...(tr.en || {}), ...tr };

  const faqs = FAQ_DATA[locale] || FAQ_DATA.en;

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      locale === 'hi'
        ? 'नमस्ते! मुझे Udyogi ऐप के बारे में मदद चाहिए।'
        : 'Hello! I need help with the Udyogi app.'
    );
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) Linking.openURL(url);
        else Alert.alert('WhatsApp not installed', 'Please install WhatsApp to use this feature.');
      })
      .catch(() => Alert.alert('Error', 'Could not open WhatsApp.'));
  };

  const openPhone = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
      Alert.alert('Error', 'Could not open dialer.')
    );
  };

  const openEmail = () => {
    const subject = encodeURIComponent('Udyogi App Support');
    const body    = encodeURIComponent(
      locale === 'hi'
        ? 'नमस्ते,\n\nमुझे निम्नलिखित समस्या है:\n\n'
        : 'Hello,\n\nI need help with:\n\n'
    );
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() =>
      Alert.alert('Error', 'Could not open email client.')
    );
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Hero greeting ── */}
        <View style={s.hero}>
          <View style={s.heroIconWrap}>
            <Text style={s.heroIcon}>🛟</Text>
          </View>
          <Text style={s.heroTitle}>{t.greeting}</Text>
          <Text style={s.heroSub}>{t.greetingSub}</Text>
        </View>

        {/* ── Contact cards ── */}
        <Text style={s.sectionLabel}>{t.contactUs}</Text>

        {/* WhatsApp */}
        <TouchableOpacity style={[s.contactCard, { borderLeftColor: C.green }]} onPress={openWhatsApp} activeOpacity={0.85}>
          <View style={[s.contactIcon, { backgroundColor: C.green + '18' }]}>
            <Text style={s.contactEmoji}>💬</Text>
          </View>
          <View style={s.contactBody}>
            <Text style={s.contactTitle}>{t.whatsapp}</Text>
            <Text style={s.contactNum}>{SUPPORT_PHONE}</Text>
            <Text style={s.contactSub}>{t.whatsappSub}</Text>
          </View>
          <View style={[s.contactArrow, { backgroundColor: C.green }]}>
            <Text style={s.contactArrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Call */}
        <TouchableOpacity style={[s.contactCard, { borderLeftColor: C.phone }]} onPress={openPhone} activeOpacity={0.85}>
          <View style={[s.contactIcon, { backgroundColor: C.phone + '18' }]}>
            <Text style={s.contactEmoji}>📞</Text>
          </View>
          <View style={s.contactBody}>
            <Text style={s.contactTitle}>{t.callUs}</Text>
            <Text style={s.contactNum}>{SUPPORT_PHONE}</Text>
            <Text style={s.contactSub}>{t.callSub}</Text>
          </View>
          <View style={[s.contactArrow, { backgroundColor: C.phone }]}>
            <Text style={s.contactArrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Email */}
        <TouchableOpacity style={[s.contactCard, { borderLeftColor: C.email }]} onPress={openEmail} activeOpacity={0.85}>
          <View style={[s.contactIcon, { backgroundColor: C.email + '18' }]}>
            <Text style={s.contactEmoji}>✉️</Text>
          </View>
          <View style={s.contactBody}>
            <Text style={s.contactTitle}>{t.emailUs}</Text>
            <Text style={[s.contactNum, { fontSize: 13 }]}>{SUPPORT_EMAIL}</Text>
            <Text style={s.contactSub}>{t.emailSub}</Text>
          </View>
          <View style={[s.contactArrow, { backgroundColor: C.email }]}>
            <Text style={s.contactArrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* ── FAQ ── */}
        <View style={s.faqHeader}>
          <Text style={s.sectionLabel}>{t.faqTitle}</Text>
          <Text style={s.faqSub}>{t.faqSub}</Text>
        </View>

        {faqs.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[s.faqCard, expandedFaq === i && s.faqCardOpen]}
            onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
            activeOpacity={0.85}
          >
            <View style={s.faqRow}>
              <Text style={s.faqQ}>{item.q}</Text>
              <Text style={[s.faqChevron, expandedFaq === i && s.faqChevronOpen]}>
                {expandedFaq === i ? '▲' : '▼'}
              </Text>
            </View>
            {expandedFaq === i && (
              <Text style={s.faqA}>{item.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* ── Bottom CTA ── */}
        <View style={s.ctaCard}>
          <Text style={s.ctaTitle}>{t.stillNeed}</Text>
          <Text style={s.ctaSub}>{t.stillSub}</Text>
          <TouchableOpacity style={s.ctaBtn} onPress={openWhatsApp} activeOpacity={0.85}>
            <Text style={s.ctaBtnIcon}>💬</Text>
            <Text style={s.ctaBtnText}>{t.msgUs}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 16,
    paddingTop:        Platform.OS === 'ios' ? 54 : 16,
    paddingBottom:     14,
    backgroundColor:   C.primary,
  },
  backBtn:     { minWidth: 60 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  // Hero
  hero: {
    alignItems:    'center',
    paddingVertical: 28,
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.primary + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  heroIcon:  { fontSize: 36 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 6 },
  heroSub:   { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },

  // Section label
  sectionLabel: { fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  // Contact card
  contactCard: {
    backgroundColor: C.white,
    borderRadius:    16,
    padding:         16,
    marginBottom:    12,
    flexDirection:   'row',
    alignItems:      'center',
    borderLeftWidth: 4,
    ...SHADOW,
  },
  contactIcon:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  contactEmoji: { fontSize: 24 },
  contactBody:  { flex: 1 },
  contactTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
  contactNum:   { fontSize: 15, fontWeight: '700', color: C.primary, marginBottom: 3 },
  contactSub:   { fontSize: 12, color: C.muted },
  contactArrow: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  contactArrowText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // FAQ
  faqHeader:   { marginTop: 8, marginBottom: 12 },
  faqSub:      { fontSize: 13, color: C.muted, marginTop: 2 },
  faqCard: {
    backgroundColor: C.white,
    borderRadius:    14,
    padding:         16,
    marginBottom:    10,
    ...SHADOW,
  },
  faqCardOpen:    { borderWidth: 1.5, borderColor: C.primary + '40' },
  faqRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ:           { flex: 1, fontSize: 15, fontWeight: '600', color: C.text, paddingRight: 10, lineHeight: 22 },
  faqChevron:     { fontSize: 11, color: C.muted },
  faqChevronOpen: { color: C.primary },
  faqA:           { fontSize: 14, color: C.sub, lineHeight: 22, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },

  // Bottom CTA
  ctaCard: {
    backgroundColor: C.primary,
    borderRadius:    20,
    padding:         24,
    alignItems:      'center',
    marginTop:       12,
    ...SHADOW,
  },
  ctaTitle:   { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  ctaSub:     { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  ctaBtn: {
    flexDirection:   'row',
    backgroundColor: C.green,
    borderRadius:    14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems:      'center',
    gap: 8,
  },
  ctaBtnIcon: { fontSize: 20 },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});