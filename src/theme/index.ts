/**
 * Zeel Cloud design system
 *
 * Brand (logo) — use for chrome, CTAs, focus, brand marks:
 *   #424096 dark purple | #9C8DCE light purple | #FFFFFF white
 *   #E6E6E6 hairline (sparingly)
 *
 * Semantic — meaning first (money, status, errors):
 *   success green | danger red | warning amber
 *
 * Action icons — recognizable brand/meaning colors:
 *   WhatsApp green | call green | PDF red
 *
 * Neutrals — readable body UI (not forced to brand purple)
 */
export const Colors = {
  // ── Brand (logo) ────────────────────────────────────────────
  primary: '#424096',
  primaryDark: '#2D2B6B',
  primaryLight: '#9C8DCE',
  white: '#FFFFFF',
  hairline: '#E6E6E6',

  gradientStart: '#424096',
  gradientEnd: '#9C8DCE',

  // Soft brand washes (same hue + alpha)
  primaryWash: '#42409614',
  primaryWashStrong: '#42409626',
  lightWash: '#9C8DCE22',
  lightWashStrong: '#9C8DCE40',

  // Canvas — soft lavender tint, white cards on top
  background: '#F3F0FA',
  surface: '#FFFFFF',

  // Text — readable neutrals (indigo-tinted, not washed purple)
  textPrimary: '#2A2758',
  textSecondary: '#6B648F',
  textMuted: '#9A93B5',
  textWhite: '#FFFFFF',

  border: '#E6E6E6',
  borderFocus: '#424096',

  // ── Semantic (do not remap to brand) ────────────────────────
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#424096',
  infoLight: '#E8E3F4',

  // Money direction aliases
  moneyIn: '#10B981',
  moneyOut: '#EF4444',

  // ── Action / third-party icon accents ───────────────────────
  whatsapp: '#25D366',
  whatsappLight: '#E8F9EF',
  call: '#16A34A',
  callLight: '#DCFCE7',
  pdf: '#DC2626',
  pdfLight: '#FEE2E2',

  // Neutral
  neutral: '#6B648F',
  neutralLight: '#F3F0FA',

  drawerBg: '#424096',
  shadow: '#424096',

  // Accent scale (brand)
  purple100: '#E8E3F4',
  purple200: '#D4CBE8',
  purple500: '#9C8DCE',
  purple600: '#424096',
  purple700: '#2D2B6B',

  blue500: '#3B82F6',
  blue600: '#2563EB',

  // Cool-indigo gray scale (readable UI neutrals)
  gray50: '#F7F5FB',
  gray100: '#F0ECF7',
  gray200: '#E2DCEC',
  gray300: '#CBC3DB',
  gray400: '#9A93B5',
  gray500: '#6B648F',
  gray600: '#4F4A72',
  gray700: '#3A3660',
  gray800: '#2A2758',
  gray900: '#1A1838',
};

export const Typography = {
  fontSizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 32,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#424096',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sm: {
    shadowColor: '#424096',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lg: {
    shadowColor: '#424096',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};
