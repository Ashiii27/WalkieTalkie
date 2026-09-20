import { Platform } from 'react-native';

/**
 * Retro Motorola-style radio palette + typography.
 * All colors documented in the WalkieTalk spec live here so nothing is
 * hardcoded across the UI.
 */
export const colors = {
  // Chassis / structure
  background: '#1a1a1a',
  body: '#2a2a2a',
  bodyLight: '#3a3a3a',
  bodyDark: '#141414',

  // LCD display panel
  panel: '#0d1f0d',
  panelBorder: '#061206',
  displayText: '#39ff14',
  displayTextDim: '#1f7a0d',
  displayGlow: '#39ff14',

  // PTT button
  pttIdle: '#333333',
  pttActive: '#cc0000',
  pttActiveGlow: '#ff3b3b',
  pttRemote: '#ff8800',

  // Accents / status
  accent: '#ff8800',
  amber: '#ff8800',
  red: '#cc0000',
  green: '#39ff14',
  greenDim: '#1f7a0d',
  danger: '#ff4444',
  warning: '#ffb020',
  muted: '#777777',
  textOnDark: '#e8e8e8',
  textDim: '#9a9a9a',

  // Misc
  speakerDot: '#101010',
  speakerDotLight: '#242424',
  overlay: 'rgba(0,0,0,0.82)',
  white: '#ffffff',
  black: '#000000',
} as const;

/**
 * We ship no custom font files (to avoid binary bloat), so we lean on the
 * platform monospace faces to fake a 7-segment / LED look.
 */
export const fonts = {
  led: Platform.select({
    ios: 'Courier New',
    android: 'monospace',
    default: 'monospace',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }) as string,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const theme = { colors, fonts, radii, spacing };
export default theme;
