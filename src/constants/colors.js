// src/constants/colors.js
export const colors = {
  // Primary colors - Blue theme
  primary: '#007AFF',
  primaryDark: '#0056CC',
  primaryLight: '#4DA3FF',
  primaryExtraLight: '#E6F2FF',
  
  // Secondary colors - Purple accent
  secondary: '#5856D6',
  secondaryDark: '#3634A3',
  secondaryLight: '#8E8CE8',
  
  // Background colors
  background: '#F8F9FA',
  backgroundLight: '#FFFFFF',
  backgroundDark: '#E9ECEF',
  backgroundCard: '#FFFFFF',
  
  // Text colors
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  textInverse: '#FFFFFF',
  textMuted: '#6C757D',
  
  // Status colors
  success: '#34C759',
  successDark: '#28A745',
  successLight: '#D4EDDA',
  successText: '#155724',
  
  error: '#FF3B30',
  errorDark: '#DC3545',
  errorLight: '#F8D7DA',
  errorText: '#721C24',
  
  warning: '#FF9500',
  warningDark: '#E0A800',
  warningLight: '#FFF3CD',
  warningText: '#856404',
  
  info: '#5AC8FA',
  infoDark: '#17A2B8',
  infoLight: '#D1ECF1',
  infoText: '#0C5460',
  
  // UI colors
  white: '#FFFFFF',
  black: '#000000',
  border: '#DEE2E6',
  borderLight: '#E9ECEF',
  borderDark: '#CED4DA',
  placeholder: '#ADB5BD',
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // Gray scale
  gray100: '#F8F9FA',
  gray200: '#E9ECEF',
  gray300: '#DEE2E6',
  gray400: '#CED4DA',
  gray500: '#ADB5BD',
  gray600: '#6C757D',
  gray700: '#495057',
  gray800: '#343A40',
  gray900: '#212529',
  
  // Semantic colors
  card: '#FFFFFF',
  cardDark: '#F8F9FA',
  overlay: 'rgba(0, 0, 0, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.3)',
  
  // Gradient colors
  gradientPrimary: ['#007AFF', '#5856D6'],
  gradientSuccess: ['#34C759', '#28A745'],
  gradientWarning: ['#FF9500', '#FFCC00'],
};

// Additional color utilities
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'success':
    case 'accepted':
    case 'completed':
      return colors.success;
    case 'error':
    case 'rejected':
    case 'failed':
      return colors.error;
    case 'warning':
    case 'pending':
    case 'processing':
      return colors.warning;
    case 'info':
    case 'active':
    case 'open':
      return colors.info;
    default:
      return colors.textSecondary;
  }
};

export const getStatusBackgroundColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'success':
    case 'accepted':
    case 'completed':
      return colors.successLight;
    case 'error':
    case 'rejected':
    case 'failed':
      return colors.errorLight;
    case 'warning':
    case 'pending':
    case 'processing':
      return colors.warningLight;
    case 'info':
    case 'active':
    case 'open':
      return colors.infoLight;
    default:
      return colors.gray200;
  }
};

export default colors;