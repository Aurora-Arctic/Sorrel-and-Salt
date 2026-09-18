// Hand-written declaration for config.mjs, for `tsc` only. tsconfig has
// `allowJs: false`, so the `@type {import('@ladle/react').UserConfig}` JSDoc
// in config.mjs is read by editors and by nothing else — and without this
// file, src/test/workshop-guards.test.ts (MB.38) cannot import the config
// without tripping TS7016. It is not `UserConfig` itself: @ladle/react's types
// ship as `.ts`/`.tsx` sources under typings-for-build/ that do not pass this
// repo's `strict` (the reason *.stories.tsx is excluded from tsc), and a
// declaration that imports them would drag them back in.
//
// Declares only what the guard reads. Anything else the config sets is
// Ladle's business, typed by the JSDoc above it.
declare const config: {
  addons?: {
    theme?: {
      enabled?: boolean;
      defaultState?: 'light' | 'dark' | 'auto';
    };
  };
};

export default config;
