// Ladle — the component workshop; the Vite half (the Sass wiring) is in
// ./vite.config.ts. See claude-docs/workshop.md, ".ladle/".

/** @type {import('@ladle/react').UserConfig} */
export default {
  // One story file per component directory, the shape the workshop guard checks;
  // the second glob is workshop-only pages the guard deliberately ignores.
  stories: ['src/components/**/index.stories.tsx', '.ladle/*.stories.tsx'],
  // `Default` first in every group, the rest as Ladle sorted them. A global hook
  // only, over the fully-sorted ids; must stay self-contained because Ladle
  // serializes it with `.toString()`.
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
  // Pinned so the HMR socket is reachable over the LAN and unmoved between restarts.
  hmrPort: 61002,
  addons: {
    // The toolbar's theme control, read by the decorator (./components.tsx).
    // `defaultState` stays `'dark'` — the app's dark-first default — and
    // tests/guards/workshop-guards.test.ts pins it.
    theme: {
      enabled: true,
      defaultState: 'dark',
    },
  },
};
