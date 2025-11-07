export const colors = {
  // Primary colors - Blue theme (Modern iOS/Android Blue)
  primary: '#007AFF',
  primaryDark: '#0056CC',
  primaryLight: '#E6F2FF', // Softer light blue
  
  // Secondary colors - Purple accent
  secondary: '#5856D6',
  secondaryDark: '#3634A3',
  
  // Background colors (Clean and modern light mode)
  background: '#F2F2F7', // Standard light gray background
  card: '#FFFFFF', // Elevated container/card background
  overlay: 'rgba(0, 0, 0, 0.5)', 
  backdrop: 'rgba(0, 0, 0, 0.3)',
  
  // Text colors
  textPrimary: '#1C1C1E',    // Near Black
  textSecondary: '#6A6A6A',  // Dark Gray for supporting text
  textPlaceholder: '#C7C7CC',// Placeholder text
  textInverse: '#FFFFFF',    // White for text on colored backgrounds
  textMuted: '#8E8E93',      // Timestamps, subtle hints
  
  // Status colors
  success: '#34C759',
  successLight: '#E6FFEB', // Softer green light
  
  error: '#FF3B30',
  errorLight: '#FFEDED',   // Softer red light
  
  warning: '#FF9500',
  warningLight: '#FFF8E6', // Softer orange light
  
  info: '#5AC8FA',
  infoLight: '#EBF9FF',    // Softer blue light
  
  // UI colors
  white: '#FFFFFF',
  black: '#000000',
  border: '#EFEFF4',      // Very light border for separating lists
  divider: '#D1D1D6',     // Thicker divider for sections
  shadow: 'rgba(0, 0, 0, 0.1)',

  // ... (Remove redundant grayscale definitions to simplify)
};

// ... (getStatusColor function remains the same)

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
      return colors.border; // Use a light, general UI color
  }
};

export default colors;