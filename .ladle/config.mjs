// Ladle — the component workshop. Ladle over Storybook and Histoire because it
// is Vite + React only, so it never couples the workshop to a Next.js major.
// claude-docs/workshop.md is the summary; the Vite half of the config — the
// Sass wiring that keeps `@use` resolving the way `next dev` resolves it —
// lives in .ladle/vite.config.ts.

/** @type {import('@ladle/react').UserConfig} */
export default {
  // One story file per component directory, beside index.tsx — the shape the
  // workshop guard is written against. The second glob is for workshop-only
  // pages the app never imports (currently just the design-language
  // reference), and is deliberately out of the guard's scope.
  stories: ['src/components/**/index.stories.tsx', '.ladle/*.stories.tsx'],
  // Forces `Default` to the top of every component's group and leaves the rest
  // as Ladle sorted them. A global-config hook only — there is no per-story-file
  // equivalent — taking the fully-sorted list of story ids
  // (`themetoggle--default`, `forms--input--default`, …). Must stay a
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
  // Ladle's own defaults, stated anyway because the makefile targets name them.
  port: 61000,
  previewPort: 61001,
  outDir: 'build',
  // Pinned so the HMR socket lands on a known port rather than a random free
  // one: reachable over the LAN, and unmoved between restarts. Editing a file
  // in this folder still needs the dev server restarted — Vite cannot hot-swap
  // them.
  hmrPort: 61002,
  addons: {
    // The toolbar's theme control; the decorator (.ladle/components.tsx) reads
    // its state and applies it through ThemeToggle's own helper.
    //
    // `defaultState` must stay `'dark'` — it matches the app's dark-first
    // default in globals.scss, and tests/guards/workshop-guards.test.ts pins
    // it. It was briefly 'auto'; 'dark' is the confirmed intent
    // (claude-docs/workshop.md, ".ladle/").
    theme: {
      enabled: true,
      defaultState: 'dark',
    },
  },
};
