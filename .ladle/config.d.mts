// Hand-written declaration for config.mjs, for `tsc` only — Ladle never reads
// it. tsconfig has `allowJs: false`, so config.mjs's
// `@type {import('@ladle/react').UserConfig}` JSDoc reaches editors and
// nothing else, and tests/guards/workshop-guards.test.ts could not import the
// config without this file (TS7016). Deliberately not `UserConfig` itself:
// @ladle/react's types ship as `.ts`/`.tsx` sources that do not pass this
// repo's `strict` — the reason *.stories.tsx is excluded from tsc — and a
// declaration importing them would drag them back in.
//
// Declares only what the guard reads; the rest is Ladle's business.
declare const config: {
  addons?: {
    theme?: {
      enabled?: boolean;
      defaultState?: 'light' | 'dark' | 'auto';
    };
  };
};

export default config;
