// src/constants/colors.js

export const colors = {
  // Primary colors - Modern Blue theme
  primary: '#007AFF',
  primaryDark: '#0056CC',
  primaryLight: '#E6F2FF',
  
  // Secondary colors - Purple accent
  secondary: '#5856D6',
  secondaryDark: '#3634A3',
  secondaryLight: '#F0EFFF',
  
  // Background colors
  background: '#F2F2F7',
  card: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)', 
  backdrop: 'rgba(0, 0, 0, 0.3)',
  
  // Text colors
  text: '#1C1C1E',
  textSecondary: '#6A6A6A',
  textPlaceholder: '#C7C7CC',
  textInverse: '#FFFFFF',
  textMuted: '#8E8E93',
  
  // Status colors
  success: '#34C759',
  successLight: '#E6FFEB',
  successDark: '#248A3D',
  
  error: '#FF3B30',
  errorLight: '#FFEDED',
  errorDark: '#C7251A',
  
  warning: '#FF9500',
  warningLight: '#FFF8E6',
  warningDark: '#C77400',
  
  info: '#5AC8FA',
  infoLight: '#EBF9FF',
  infoDark: '#32ADE6',
  
  // UI colors
  white: '#FFFFFF',
  black: '#000000',
  border: '#EFEFF4',
  divider: '#D1D1D6',
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // Grayscale
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
};

/**
 * Get color based on status
 * @param {string} status - Status value (e.g., 'success', 'pending', 'error')
 * @returns {string} - Corresponding color
 */
export const getStatusColor = (status) => {
  const statusLower = status?.toLowerCase();
  
  switch (statusLower) {
    case 'success':
    case 'accepted':
    case 'approved':
    case 'completed':
    case 'active':
      return colors.success;
      
    case 'error':
    case 'rejected':
    case 'declined':
    case 'failed':
    case 'cancelled':
      return colors.error;
      
    case 'warning':
    case 'pending':
    case 'processing':
    case 'in-progress':
    case 'reviewing':
      return colors.warning;
      
    case 'info':
    case 'open':
    case 'available':
    case 'new':
      return colors.info;
      
    default:
      return colors.textSecondary;
  }
};

/**
 * Get background color based on status
 * @param {string} status - Status value
 * @returns {string} - Corresponding background color
 */
export const getStatusBackgroundColor = (status) => {
  const statusLower = status?.toLowerCase();
  
  switch (statusLower) {
    case 'success':
    case 'accepted':
    case 'approved':
    case 'completed':
    case 'active':
      return colors.successLight;
      
    case 'error':
    case 'rejected':
    case 'declined':
    case 'failed':
    case 'cancelled':
      return colors.errorLight;
      
    case 'warning':
    case 'pending':
    case 'processing':
    case 'in-progress':
    case 'reviewing':
      return colors.warningLight;
      
    case 'info':
    case 'open':
    case 'available':
    case 'new':
      return colors.infoLight;
      
    default:
      return colors.gray100;
  }
};

/**
 * Add opacity to color
 * @param {string} color - Hex color code
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string} - Color with opacity
 */
export const withOpacity = (color, opacity) => {
  if (!color) return 'transparent';
  
  // If already rgba, return as is
  if (color.startsWith('rgba')) return color;
  
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Lighten or darken a color
 * @param {string} color - Hex color code
 * @param {number} amount - Amount to lighten (positive) or darken (negative)
 * @returns {string} - Modified color
 */
export const adjustColor = (color, amount) => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export default colors;