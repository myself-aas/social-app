import {type Palette} from '@bsky.app/alf'

/**
 * Brand identity for this fork. Everything that should read as "ours" rather
 * than upstream Bluesky lives here, so the skin is one small file to review or
 * revert.
 *
 * The ramps are consumed by `#/alf/themes` (composed into ALF palettes) and
 * `#/alf/tokens` (gradients).
 */
export const BRAND = {
  /** Short name, used in app config and copy. */
  name: 'reme',
  /** Wordmark, including the trailing period. */
  wordmark: 'reme.',
  /** Azure, for native splash and OS chrome. */
  color: '#0077CD',
} as const

/**
 * Azure brand ramp, hue 205 (more cyan than upstream's royal blue).
 *
 * `primary_500` is picked so white text on it reaches 4.65:1. The lighter
 * steps carry the "electric" accent (links, icons, gradients) and `primary_600`
 * is the light-theme link color, which is why it stays deep.
 */
export const PRIMARY_RAMP: Partial<Palette> = {
  primary_25: '#E6F4FF',
  primary_50: '#C7E8FF',
  primary_100: '#9ED7FF',
  primary_200: '#66BFFF',
  primary_300: '#26A5FF',
  primary_400: '#008FF6',
  primary_500: '#0077CD',
  primary_600: '#0064AC',
  primary_700: '#00518B',
  primary_800: '#004271',
  primary_900: '#00365D',
  primary_950: '#002F50',
  primary_975: '#002946',
}

/**
 * Warm neutral ramp for the light theme. Upstream's neutrals are cool
 * blue-greys; these lean warm (hue ~30) at low saturation, which is what makes
 * the skin read as friendly without losing contrast.
 *
 * Key ratios on `contrast_0`: body text 18.9:1, medium text 8.7:1, low text
 * 3.1:1 (decorative/secondary, unchanged from upstream's intent).
 */
export const LIGHT_NEUTRALS: Partial<Palette> = {
  contrast_0: '#FFFDFB',
  contrast_25: '#FAF6F1',
  contrast_50: '#F4EEE7',
  contrast_100: '#E8DFD4',
  contrast_200: '#D6C9B9',
  contrast_300: '#BFAF9C',
  contrast_400: '#A08F7C',
  contrast_500: '#82715F',
  contrast_600: '#6B5B4A',
  contrast_700: '#55483A',
  contrast_800: '#40362C',
  contrast_900: '#2E271F',
  contrast_950: '#221C16',
  contrast_975: '#1A1511',
  contrast_1000: '#120E0B',
}

/**
 * Slightly compressed warm ramp for the `dim` theme. ALF derives dim by
 * inverting this, so ending at a lighter `contrast_1000` than the dark theme
 * is what makes dim a softened dark rather than a second full dark.
 */
export const DIM_NEUTRALS: Partial<Palette> = {
  contrast_0: '#FFFDFB',
  contrast_25: '#FAF6F1',
  contrast_50: '#F5EFE9',
  contrast_100: '#E9E1D7',
  contrast_200: '#D8CCBE',
  contrast_300: '#C1B3A2',
  contrast_400: '#A3927E',
  contrast_500: '#85745F',
  contrast_600: '#6E5D4C',
  contrast_700: '#584A3B',
  contrast_800: '#44392E',
  contrast_900: '#332B22',
  contrast_950: '#29221B',
  contrast_975: '#221C16',
  contrast_1000: '#1A1511',
}
