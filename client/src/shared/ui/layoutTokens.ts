import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Canonical content widths (px) for PageShell across both portals.
 * Layout chrome caps at `full`; individual pages pick the tier that fits.
 */
export const pageWidth = {
  /** Auth, not found, find-player form */
  narrow: 640,
  /** Player profile, team page — readable column */
  content: 960,
  /** Default org/player hub pages */
  default: 1200,
  /** Matches, tournament wizard, lobby room */
  wide: 1440,
  /** Dashboard, servers, bracket data */
  full: 1680,
} as const;

export type PageWidthKey = keyof typeof pageWidth;

/** Base sx merged into authenticated pages inside Layout (Layout already applies p:3). */
export const pageShellBaseSx: SxProps<Theme> = {
  width: '100%',
  minHeight: 0,
};

/** Public pages with TopNavBar — vertical rhythm below the bar. */
export const publicPageShellSx: SxProps<Theme> = {
  ...pageShellBaseSx,
  py: { xs: 4, md: 6 },
};
