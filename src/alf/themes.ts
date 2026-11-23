import {
  createThemes,
  DEFAULT_PALETTE,
  DEFAULT_SUBDUED_PALETTE,
  type Palette,
} from '@bsky.app/alf'

import {DIM_NEUTRALS, LIGHT_NEUTRALS, PRIMARY_RAMP} from '#/alf/brand'

/*
 * This fork's skin replaces upstream's cool neutral ramps with a warm one and
 * the royal-blue brand ramp with azure. Everything else - semantic atoms,
 * positive/negative colors, statics - still comes from ALF, so upstream fixes
 * continue to flow through. See `#/alf/brand`.
 */
const remeLightPalette: Palette = {
  ...DEFAULT_PALETTE,
  ...LIGHT_NEUTRALS,
  ...PRIMARY_RAMP,
}
const remeSubduedPalette: Palette = {
  ...DEFAULT_SUBDUED_PALETTE,
  ...DIM_NEUTRALS,
  ...PRIMARY_RAMP,
}

const DEFAULT_THEMES = createThemes({
  defaultPalette: remeLightPalette,
  subduedPalette: remeSubduedPalette,
})

export const themes = {
  lightPalette: DEFAULT_THEMES.light.palette,
  darkPalette: DEFAULT_THEMES.dark.palette,
  dimPalette: DEFAULT_THEMES.dim.palette,
  light: DEFAULT_THEMES.light,
  dark: DEFAULT_THEMES.dark,
  dim: DEFAULT_THEMES.dim,
}

/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const lightPalette = DEFAULT_THEMES.light.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const darkPalette = DEFAULT_THEMES.dark.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const dimPalette = DEFAULT_THEMES.dim.palette
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const light = DEFAULT_THEMES.light
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dark = DEFAULT_THEMES.dark
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dim = DEFAULT_THEMES.dim
