import type { EmailTheme } from './types';

// The site's two themes as plain hexes: a mail client reads neither Sass nor custom properties, so these are copied
// from src/scss/_mixins.scss and a palette change edits both (claude-docs/email.md).

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
    accent: '#397511',
    onAccent: '#efe9da',
    ornament: { blend: 'multiply', opacity: 0.4 },
  },
} as const satisfies Record<'dark' | 'light', EmailTheme>;
