/**
 * REGTRACKER DESIGN SYSTEM
 *
 * Aesthetic: pixel-art kawaii — bright vibrant colors, chunky pixel font,
 * rounded corners, halftone dot patterns, rainbow gradients, cute/playful tone.
 * Reference: Kumo app visual language.
 */

// ─── Color Palette ───────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds (one per "mood" / screen state)
  skyBlue:    '#4FC3F7',   // calm / default
  mintGreen:  '#69F0AE',   // happy / success
  sunYellow:  '#FFF176',   // playful / neutral
  coralRed:   '#FF5252',   // alert / danger
  lavender:   '#CE93D8',   // sleepy / rest
  peach:      '#FFAB91',   // warm / reward

  // Rainbow strip (progress bars, accents)
  rainbow: ['#FF5252', '#FF9800', '#FFEB3B', '#66BB6A', '#B0BEC5'],

  // UI chrome
  white:      '#FFFFFF',
  offWhite:   '#F5F5F5',
  pixelBlue:  '#1E88E5',   // outline / border color on light backgrounds
  darkPixel:  '#1A237E',   // dark text on bright backgrounds
  black:      '#000000',

  // Transparent overlays
  dotOverlay: 'rgba(255,255,255,0.12)',  // halftone shimmer
};

// ─── Typography ──────────────────────────────────────────────────────────────
// "Press Start 2P" is the canonical pixel font. Load it via expo-google-fonts:
//   npx expo install @expo-google-fonts/press-start-2p expo-font
// Then in your root component:
//   const [loaded] = useFonts({ 'PressStart2P': PressStart2P_400Regular });

export const fonts = {
  pixel: 'PressStart2P',     // all-caps pixel font for headings / labels
  fallback: 'monospace',     // used until font loads
};

export const textStyles = {
  heading: {
    fontFamily: fonts.pixel,
    fontSize: 22,
    color: colors.white,
    letterSpacing: 2,
    textTransform: 'uppercase',
    lineHeight: 34,
  },
  subheading: {
    fontFamily: fonts.pixel,
    fontSize: 14,
    color: colors.white,
    letterSpacing: 1,
    textTransform: 'uppercase',
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stat: {
    fontFamily: fonts.pixel,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 2,
  },
};

// ─── Spacing & Shape ─────────────────────────────────────────────────────────

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  40,
};

export const radius = {
  sm:   8,
  md:   16,
  lg:   24,
  xl:   36,
  pill: 999,
};

// ─── Shadows / Elevation ─────────────────────────────────────────────────────

export const shadow = {
  card: {
    shadowColor: colors.darkPixel,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 0,   // hard pixel shadow (no blur)
    elevation: 6,
  },
  button: {
    shadowColor: colors.darkPixel,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 4,
  },
};

// ─── Component Presets ───────────────────────────────────────────────────────

export const card = {
  backgroundColor: colors.white,
  borderRadius: radius.lg,
  padding: spacing.md,
  ...shadow.card,
};

export const button = {
  primary: {
    backgroundColor: colors.pixelBlue,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    ...shadow.button,
  },
  danger: {
    backgroundColor: colors.coralRed,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    ...shadow.button,
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
};

// ─── Progress Bar (rainbow strip) ────────────────────────────────────────────
// Usage: wrap in a View with borderRadius + overflow:'hidden', then render
// colored segments side-by-side using the rainbow array above.

export const progressBar = {
  container: {
    height: 28,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
    flexDirection: 'row',
  },
  // Each segment fills proportionally; grey = empty portion
  emptyColor: '#B0BEC5',
};

// ─── Background Patterns ─────────────────────────────────────────────────────
// Halftone dot grid: achieved with a repeating small circular View overlay,
// or via an SVG pattern / image. This object documents the intended look.

export const dotPattern = {
  dotSize: 4,
  dotSpacing: 12,
  dotColor: colors.dotOverlay,
};

// ─── Status Color Map ─────────────────────────────────────────────────────────
// Maps semantic states to background colors (used for full-screen state views)

export const statusColors = {
  healthy:  colors.mintGreen,
  warning:  colors.sunYellow,
  critical: colors.coralRed,
  idle:     colors.skyBlue,
  asleep:   colors.lavender,
  reward:   colors.peach,
};
