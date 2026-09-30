import type { EmailTheme } from './types';

// The site's two themes as plain hexes. A mail client reads neither Sass nor
// CSS custom properties, so these are copied from the theme mixins in
// src/scss/_mixins.scss; tests/emails/theme.test.ts compiles those mixins and
// fails when a value here disagrees.

export const EMAIL_THEMES = {
  dark: {
    page: '#14120e',
    text: '#ebe4d4',
    muted: '#c0baac',
    accent: '#88b669',
    onAccent: '#14120e',
    ornament: { blend: 'screen', opacity: 0.3 },
  },
  light: {
    page: '#efe9da',
    text: '#23201a',
    muted: '#5e5645',
    accent: '#4a6b34',
    onAccent: '#efe9da',
    ornament: { blend: 'multiply', opacity: 0.4 },
  },
} as const satisfies Record<'dark' | 'light', EmailTheme>;
