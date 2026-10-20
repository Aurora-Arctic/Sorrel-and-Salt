import { fileURLToPath } from 'node:url';

// Ladle — the component workshop; the Vite half (the Sass wiring and the
// next/link alias) is in ./vite.config.ts. See claude-docs/workshop.md, ".ladle/".

/** @type {import('@ladle/react').UserConfig} */
export default {
  // Ladle hands Vite's config loader this path as-is and, given none, Vite
  // looks in the project root — so without it ./vite.config.ts is never read.
  viteConfig: fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
  // One story file per component directory and one per mail template, the
  // shapes the workshop guard checks; the last glob is workshop-only pages the
  // guard deliberately ignores.
  stories: [
    'src/components/**/index.stories.tsx',
    'src/emails/*.stories.tsx',
    '.ladle/*.stories.tsx',
  ],
  // The sidebar's order, over the fully-sorted ids: the top-level groups in the
  // order claude-docs/workshop.md gives (Foundations, the areas as a person
  // meets them, then the kinds), and `Default` first in every group, the rest as
  // Ladle sorted them. A group not listed here keeps its place after the
  // listed ones. A global hook only; must stay self-contained because Ladle
  // serializes it with `.toString()`.
  storyOrder: (stories) => {
    const topOrder = [
      'foundations',
      'pages',
      'sign-in',
      'shell',
      'account',
      'coven',
      'admin',
      'emails',
      'forms',
      'layout',
      'navigation',
      'surfaces',
    ];
    const groupOf = (id) => id.split('--').slice(0, -1).join('--');
    const isDefault = (id) => id.split('--').pop() === 'default';
    const rankOf = (id) => {
      const rank = topOrder.indexOf(id.split('--')[0]);
      return rank === -1 ? topOrder.length : rank;
    };
    const seen = new Set();
    const ordered = [];
    for (const id of stories) {
      const group = groupOf(id);
      if (seen.has(group)) continue;
      seen.add(group);
      const inGroup = stories.filter((s) => groupOf(s) === group);
      ordered.push(...inGroup.filter(isDefault), ...inGroup.filter((s) => !isDefault(s)));
    }
    // Array.prototype.sort is stable, so within a top-level group the order above holds.
    return ordered.sort((a, b) => rankOf(a) - rankOf(b));
  },
  // Ladle's own default ports, stated anyway because the makefile targets name them.
  port: 61000,
  previewPort: 61001,
  // With the other generated output rather than Ladle's default `build/`.
  outDir: '.reports/workshop',
  // Pinned so compose can publish the HMR socket, and unmoved between restarts.
  // `LADLE_HMR_PORT` moves it for the workshop e2e run alone
  // (playwright.workshop.config.ts), so a test Ladle never competes with a
  // review Ladle for it.
  hmrPort: Number(process.env.LADLE_HMR_PORT) || 61002,
  // Empty, not unset: Ladle's `hmrHost ?? 'localhost'` would bind the socket to
  // the workshop container's loopback, where the published port never arrives.
  // An empty host binds every interface, and the browser connects back to the
  // page's own hostname — `'0.0.0.0'` would be sent to it as the address.
  hmrHost: '',
  addons: {
    // The toolbar's theme control, read by the decorator (./components.tsx).
    // `defaultState` stays `'dark'` — the app's dark-first default, so the
    // workshop opens as a viewer who never touched the toggle sees the app.
    theme: {
      enabled: true,
      defaultState: 'dark',
    },
  },
};
