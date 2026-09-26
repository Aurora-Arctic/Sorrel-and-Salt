// The site's two themes as plain hexes. A mail client reads neither Sass nor
// CSS custom properties, so these are copied from the theme mixins in
// src/scss/_mixins.scss; tests/emails/theme.test.ts compiles those mixins and
// fails when a value here disagrees.

export interface EmailTheme {
  page: string;
  text: string;
  muted: string;
  accent: string;
  /** The label on an accent fill: the page surface, as on the site. */
  onAccent: string;
  /** How Backdrop's grey photographs meet this theme's page; baked into the mail's images. */
  ornament: { blend: 'screen' | 'multiply'; opacity: number };
}

export const EMAIL_THEMES = {
  dark: {
    page: '#14120e',
    text: '#ebe4d4',
    muted: '#c7b487',
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
