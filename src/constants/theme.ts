/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Font family tokens — loaded via expo-font in _layout.tsx */
export const Fonts = {
  /** Inter Regular — body text */
  sans: "Inter_400Regular",
  /** Inter Medium — buttons, labels */
  medium: "Inter_500Medium",
  /** Inter SemiBold — table data, stats */
  semiBold: "Inter_600SemiBold",
  /** Inter Bold — strong emphasis */
  bold: "Inter_700Bold",
  /** Space Grotesk SemiBold — brand titles (Tenka) */
  brand: "SpaceGrotesk_600SemiBold",
  /** Sora SemiBold — league names, section headers */
  display: "Sora_600SemiBold",
  /** Sora Bold — scores, numerals */
  displayBold: "Sora_700Bold",
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Border radius tokens — always use these, never raw values */
export const Radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
} as const;

/** Padding tokens (internal spacing) */
export const Pad = {
  micro: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

/** Margin / gap tokens (external spacing) */
export const Gap = {
  micro: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
} as const;

/** Tenka dark-only color palette */
export const Palette = {
  // Base
  black: "#090B10",
  dark: "#11151D",
  surface: "#171C26",
  surfaceLight: "#202736",

  // Text
  white: "#FFFFFF",
  text: "#FFFFFF",
  textSecondary: "#B0BAC9",
  textMuted: "#7A8598",

  // Tenka brand
  cyan: "#4DD0E1",
  cyanBright: "#7CE7F2",
  cyanDark: "#2196A8",

  // States
  success: "#69F0AE",
  danger: "#FF5252",
  warning: "#FFD54F",

  // State/accent surfaces
  cyan10: "#4DD0E11A",
  cyan20: "#4DD0E133",
  success10: "#69F0AE1A",
  danger10: "#FF52521A",
  warning10: "#FFD54F1A",
  playoff: "#A78BFA",
  playoff10: "#A78BFA1A",

  // Overlays and borders
  overlay: "#090B10CC",
  dark40: "#090B1066",
  dark60: "#090B1099",
  border: "#293241",
  borderActive: "#4DD0E1",

} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
