// For `tsc` only — Ladle never reads it. `allowJs` is off, so the workshop
// guard could not import config.mjs without it (TS7016). Not `UserConfig`
// itself: Ladle's types ship as sources that fail this repo's `strict`.
// Declares only what the guard reads.
declare const config: {
  addons?: {
    theme?: {
      enabled?: boolean;
      defaultState?: 'light' | 'dark' | 'auto';
    };
  };
};

export default config;
