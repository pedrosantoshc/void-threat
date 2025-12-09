import { MD3DarkTheme } from 'react-native-paper';

// Dark theme based on design system from PRD.md
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00FF00',
    primaryContainer: '#00DD00',
    background: '#0A0E27',
    surface: '#1B1F3B',
    surfaceVariant: '#2D3B52',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#B0B0B0',
    outline: '#616161',
    error: '#F44336',
    errorContainer: '#D32F2F',
  },
};

// App-specific colors that are NOT part of Paper's MD3 theme
export const appColors = {
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
  crew: '#4CAF50',
  alien: '#F44336',
  independent: '#9C27B0',
  crewFavored: '#4CAF50',
  alienFavored: '#F44336',
  balanced: '#9E9E9E',
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
    fontWeight: '700' as const,
    lineHeight: 1.2,
  },
  heading1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 1.2,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 1.2,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 1.5,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 1.5,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: 10,
    fontWeight: '400' as const,
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