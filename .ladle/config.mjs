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
  // index.test.tsx, imported the same way — that's where every component's
  // stories live, and the M0.33 gate is written against that shape.
  //
  // The second glob is for workshop-only pages that aren't components and the
  // app never imports — currently just the design-language reference
  // (.ladle/design-language.stories.tsx). M0.32 added it; see
  // claude-docs/design-decisions/m0.32-component-stories.md. M0.33's gate stays
  // "a component dir needs a story", and this location is the known exception.
  stories: ['src/components/**/index.stories.tsx', '.ladle/*.stories.tsx'],
  // Force the `Default` story to the top of every component's group; leave the
  // order of the rest as Ladle sorted them (alphabetical, folders before
  // leaves). Ladle's `storyOrder` is a global-config hook only — there is no
  // per-story-file equivalent — and it hands us the fully-sorted list of story
  // ids (`themetoggle--default`, `forms--input--default`, …). Must stay a
  // self-contained function: Ladle serializes it with `.toString()`.
  storyOrder: (stories) => {
    const groupOf = (id) => id.split('--').slice(0, -1).join('--');
    const isDefault = (id) => id.split('--').pop() === 'default';
    const seen = new Set();
    const ordered = [];
    for (const id of stories) {
      const group = groupOf(id);
      if (seen.has(group)) continue;
      seen.add(group);
      const inGroup = stories.filter((s) => groupOf(s) === group);
      ordered.push(...inGroup.filter(isDefault), ...inGroup.filter((s) => !isDefault(s)));
    }
    return ordered;
  },
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
    // The toolbar's theme control. M0.31's decorator (.ladle/components.tsx)
    // reads its state and drives `html[data-theme]` through the M0.29 helper —
    // the one place a theme is applied — so the workshop and the app agree on
    // what a theme swap does.
    //
    // `defaultState: 'dark'` matches the app's dark-first default in
    // globals.scss (`:root { @include theme-dark }`) — the workshop opens
    // dark, same as a viewer who has never touched the toggle. M0.31 moved
    // this to 'auto' (the control's unset position, letting
    // prefers-color-scheme decide); M0.32 moved it back to 'dark', which is
    // the confirmed intent — see
    // claude-docs/design-decisions/m0.34-doc-archive-and-compression-pass.md.
    theme: {
      enabled: true,
      defaultState: 'dark',
    },
  },
};
