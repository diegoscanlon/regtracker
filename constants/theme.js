export const COLORS = {
  bg: '#f4eac1',
  surface: '#FFFFFF',
  primary: '#f68324',
  secondary: '#34b4eb',
  accent: '#f9f961',
  mint: '#269922',
  lavender: '#3465eb',
  peach: '#FFD4A8',
  dark: '#473536',
  muted: '#9980BB',
  error: '#FF4466',
  green: '#269922',
  offWhite: '#f4eac1',
  orange: '#f68324',
  blue: '#34b4eb',
  yellow: '#f9f961',
  brown: '#473536',
};

// Shared layout constants for onboarding screens
export const LAYOUT = {
  // Absolute-positioned title container — keeps titles at the same Y on every screen
  titleContainer: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  // Absolute-positioned bottom container — keeps buttons at the same Y on every screen
  bottomContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  // Standard onboarding action button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    height: 50,
    paddingHorizontal: 28,
    borderRadius: 50,
    width: 260,
  },
  actionBtnLabel: {
    fontFamily: 'AvantGarde',
    fontSize: 15,
    color: '#1E1238',
    letterSpacing: 0.2,
  },
};

export const FONTS = {
  pixel: 'PressStart2P_400Regular',   // pixel headings
  ghibli: 'MochiBoom',                 // titles / Reggy
  ghibliBold: 'MochiBoomExtrude',     // bold/extrude titles
  avant: 'AvantGarde',                // ITC Avant Garde Gothic LT Medium
  mono: 'AvantGarde',                 // default body font
  monoBold: 'AvantGarde',             // bold body font
};
