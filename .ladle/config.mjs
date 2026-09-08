// Ladle — the component workshop (M0.30). Greenfield tooling, not a port:
// resume-2026 has no workshop. Ladle over Storybook and Histoire because it is
// Vite + React only, so it never couples the workshop to a Next.js major; it
// installs an order of magnitude lighter; and its config is this one file.
// The reasoning in full: claude-docs/design-decisions/m0.30-ladle-component-workshop.md
//
// The Vite side of the config — the Sass wiring that keeps `@use` resolving the
// way `next dev` resolves it — lives in .ladle/vite.config.ts.

/** @type {import('@ladle/react').UserConfig} */
export default {
  // One story file per component directory, beside index.tsx and
  // index.test.tsx, imported the same way. Nothing outside a component
  // directory is a story — the M0.33 gate is written against this exact shape.
  stories: 'src/components/**/index.stories.tsx',
  // `npm run workshop` serves here; `npm run workshop:build` writes ./build.
  // Both match Ladle's own defaults — stated anyway, because these two numbers
  // are named in the acceptance criteria and in the makefile targets.
  port: 61000,
  previewPort: 61001,
  outDir: 'build',
  // Hot reload: `ladle serve` (what `npm run workshop` runs) already drives
  // Vite HMR + React Fast Refresh, so editing a story, a component or its SCSS
  // updates the open workshop with no manual refresh. The one exception is the
  // files in this folder — config.mjs, vite.config.ts, components.tsx,
  // theme.scss — which Vite can't hot-swap; changing those needs the dev
  // server restarted.
  //
  // `hmrPort` is pinned only so the HMR socket lands on a known port instead of
  // a random free one — it stays reachable when the workshop is opened over the
  // LAN rather than at http://localhost:61000, and it doesn't move between
  // restarts. 61000 serves, 61001 is `ladle preview`, 61002 is the HMR socket.
  hmrPort: 61002,
  addons: {
    // The app is dark-first (globals.scss: `:root { @include theme-dark }`),
    // so the workshop opens dark too. This sets `html[data-theme="dark"]` on
    // load; the M0.31 decorator will drive the same control through the M0.29
    // helper.
    theme: {
      enabled: true,
      defaultState: 'dark',
    },
  },
};
