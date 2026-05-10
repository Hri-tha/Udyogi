// src/components/Toast.js
// Beautiful in-app toast notifications — no browser/OS popups
// Usage:
//   import Toast, { useToast } from '../components/Toast';
//   const toast = useToast();
//   toast.success('OTP sent!', 'Check your inbox');
//   toast.error('Invalid code', 'Please try again');
//   toast.info('Loading…');
//
//   Wrap your screen (or root) with <ToastProvider> and render <ToastContainer /> inside.

import React, {
  createContext, useContext, useRef, useState, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  Platform, TouchableOpacity,
} from 'react-native';

const { width } = Dimensions.get('window');

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

let _toastRef = null; // module-level ref so imperative calls work from anywhere

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const ref = useRef(null);

  // Expose imperative API via module ref
  const register = useCallback((api) => {
    _toastRef = api;
  }, []);

  return (
    <ToastContext.Provider value={ref}>
      {children}
      <ToastContainer onMount={register} />
    </ToastContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  return {
    success: (title, subtitle) => _toastRef?.show({ type: 'success', title, subtitle }),
    error:   (title, subtitle) => _toastRef?.show({ type: 'error',   title, subtitle }),
    info:    (title, subtitle) => _toastRef?.show({ type: 'info',    title, subtitle }),
    warning: (title, subtitle) => _toastRef?.show({ type: 'warning', title, subtitle }),
  };
}

// Imperative API (no hook needed) — use anywhere
export const toast = {
  success: (title, subtitle) => _toastRef?.show({ type: 'success', title, subtitle }),
  error:   (title, subtitle) => _toastRef?.show({ type: 'error',   title, subtitle }),
  info:    (title, subtitle) => _toastRef?.show({ type: 'info',    title, subtitle }),
  warning: (title, subtitle) => _toastRef?.show({ type: 'warning', title, subtitle }),
};

// ─── Config per type ──────────────────────────────────────────────────────────
const CONFIG = {
  success: { icon: '✅', bg: '#0f7a3c', accent: '#22c55e', label: 'Success' },
  error:   { icon: '❌', bg: '#b91c1c', accent: '#ef4444', label: 'Error'   },
  info:    { icon: 'ℹ️',  bg: '#1a56db', accent: '#60a5fa', label: 'Info'    },
  warning: { icon: '⚠️', bg: '#92400e', accent: '#f59e0b', label: 'Warning' },
};

// ─── Container (renders the actual toasts) ────────────────────────────────────
function ToastContainer({ onMount }) {
  const [toasts, setToasts] = useState([]);
  const idRef  = useRef(0);

  const show = useCallback(({ type = 'info', title = '', subtitle = '', duration = 3200 }) => {
    const id = ++idRef.current;
    const translateY = new Animated.Value(-120);
    const opacity    = new Animated.Value(0);
    const scale      = new Animated.Value(0.92);

    setToasts(prev => [...prev, { id, type, title, subtitle, translateY, opacity, scale }]);

    // Animate in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0,   useNativeDriver: true, tension: 70, friction: 10 }),
      Animated.timing(opacity,    { toValue: 1,   useNativeDriver: true, duration: 220 }),
      Animated.spring(scale,      { toValue: 1,   useNativeDriver: true, tension: 80, friction: 9  }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(id, translateY, opacity, scale), duration);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback((id, translateY, opacity, scale) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, useNativeDriver: true, duration: 280 }),
      Animated.timing(opacity,    { toValue: 0,    useNativeDriver: true, duration: 220 }),
      Animated.timing(scale,      { toValue: 0.92, useNativeDriver: true, duration: 250 }),
    ]).start(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    });
  }, []);

  // Register imperative API
  React.useEffect(() => { onMount?.({ show }); }, [show]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map(({ id, type, title, subtitle, translateY, opacity, scale }) => {
        const cfg = CONFIG[type] || CONFIG.info;
        return (
          <Animated.View
            key={id}
            style={[
              styles.toast,
              { backgroundColor: cfg.bg, opacity, transform: [{ translateY }, { scale }] },
            ]}
          >
            {/* Accent bar */}
            <View style={[styles.accentBar, { backgroundColor: cfg.accent }]} />

            <View style={styles.iconWrap}>
              <Text style={styles.iconText}>{cfg.icon}</Text>
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.toastTitle} numberOfLines={1}>{title}</Text>
              {!!subtitle && (
                <Text style={styles.toastSub} numberOfLines={2}>{subtitle}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => dismiss(id, translateY, opacity, scale)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position:  'absolute',
    top:       Platform.OS === 'ios' ? 54 : 44,
    left:      0,
    right:     0,
    zIndex:    99999,
    alignItems:'center',
    pointerEvents: 'box-none',
  },
  toast: {
    width:        width - 24,
    flexDirection:'row',
    alignItems:   'center',
    borderRadius: 16,
    marginBottom: 10,
    paddingVertical:   13,
    paddingHorizontal: 14,
    // Classy shadow
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius:  14,
    elevation:     14,
    overflow:      'hidden',
  },
  accentBar: {
    position:     'absolute',
    left:         0,
    top:          0,
    bottom:       0,
    width:        4,
    borderTopLeftRadius:    16,
    borderBottomLeftRadius: 16,
  },
  iconWrap: {
    marginLeft:  8,
    marginRight: 10,
    width:       28,
    alignItems:  'center',
  },
  iconText: { fontSize: 18 },
  textWrap: { flex: 1 },
  toastTitle: {
    fontSize:   14,
    fontWeight: '700',
    color:      '#ffffff',
    marginBottom: 2,
  },
  toastSub: {
    fontSize:   12,
    color:      'rgba(255,255,255,0.82)',
    fontWeight: '500',
    lineHeight: 16,
  },
  closeBtn: {
    marginLeft:  10,
    width:       24,
    height:      24,
    justifyContent: 'center',
    alignItems:     'center',
  },
  closeBtnText: {
    fontSize:   13,
    color:      'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
});