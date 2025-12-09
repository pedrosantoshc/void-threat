import { MD3DarkTheme } from 'react-native-paper';

// Dark theme based on design system from PRD.md
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // Primary colors from design system
    primary: '#00FF00', // Neon Green
    primaryContainer: '#00DD00', // Deep Green
    
    // Background colors
    background: '#0A0E27', // Space Black
    surface: '#1B1F3B', // Dark grey-blue
    surfaceVariant: '#2D3B52', // Subtle border
    
    // Text colors
    onBackground: '#FFFFFF', // Primary Text
    onSurface: '#FFFFFF', // Primary Text
    onSurfaceVariant: '#B0B0B0', // Secondary Text
    outline: '#616161', // Disabled Text
    
    // Semantic colors
    error: '#F44336', // Danger/Dead
    errorContainer: '#D32F2F',
    success: '#4CAF50', // Success/Alive
    warning: '#FF9800', // Warning/Silenced
    info: '#2196F3', // Information
    
    // Team colors
    crew: '#4CAF50', // Crew Green
    alien: '#F44336', // Alien Red
    independent: '#9C27B0', // Independent Purple
    
    // Balance colors
    crewFavored: '#4CAF50',
    alienFavored: '#F44336',
    balanced: '#9E9E9E',
  },
};

// Spacing system (8px grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const borderRadius = {
  none: 0,
  small: 4,
  medium: 8,
  large: 16,
  full: 50, // percentage
};

// Typography
export const typography = {
  display: {
    fontSize: 40,
    fontWeight: 'bold' as const,
    lineHeight: 1.2,
  },
  heading1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 1.2,
  },
  heading2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 1.2,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 1.5,
  },
  body: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 1.5,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: 10,
    fontWeight: 'normal' as const,
    lineHeight: 1.4,
  },
};

// Button styles
export const buttonStyles = {
  primary: {
    backgroundColor: '#00FF00',
    textColor: '#0A0E27',
    borderRadius: borderRadius.small,
    padding: {
      vertical: 12,
      horizontal: 16,
    },
  },
  secondary: {
    backgroundColor: '#1B1F3B',
    textColor: '#00FF00',
    borderColor: '#00FF00',
    borderWidth: 1,
    borderRadius: borderRadius.small,
    padding: {
      vertical: 12,
      horizontal: 16,
    },
  },
  danger: {
    backgroundColor: '#F44336',
    textColor: '#FFFFFF',
    borderRadius: borderRadius.small,
    padding: {
      vertical: 12,
      horizontal: 16,
    },
  },
  ghost: {
    backgroundColor: 'transparent',
    textColor: '#B0B0B0',
    borderRadius: borderRadius.small,
    padding: {
      vertical: 12,
      horizontal: 16,
    },
  },
};