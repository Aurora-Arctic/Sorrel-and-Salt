import { type ReactElement, type ReactNode, useLayoutEffect, useRef } from 'react';
import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { startMockWorker } from './mock-api';
import Providers from '../src/app/providers';
import { StatusRegionProvider } from '../src/components/ClickFeedback/status-region';
import { STORAGE_KEY, applyTheme } from '../src/components/ThemeToggle';
import './theme.scss';
import './story-frame.scss';
import './typography.scss';
import './layout.scss';
import './primitives.scss';

// The class the three sheets above hang off; the preview iframe's body holds
// only the story, so the app's own `body` rules can apply here unchanged.
if (typeof document !== 'undefined') document.body.classList.add('workshop-app');

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Storybook's load-once preview and the workshop decorator: frames every story in the app surface
// and drives html[data-theme] from the toolbar through ThemeToggle's `applyTheme`, remounting the
// story on each switch since ThemeToggle reads data-theme only on mount. The `*-base` sheets are
// scoped to the frame (claude-docs/workshop.md, ".storybook/").

type Theme = 'dark' | 'light' | 'auto';

// 'light'/'dark' are an explicit choice; 'auto' is the toolbar's unset position.
const syncTheme = (theme: Theme): void => {
  if (theme === 'light' || theme === 'dark') {
    applyTheme(theme);
    return;
  }
  // Auto: clear the attribute and the persisted key, or a stale pin reasserts
  // itself; ./theme.scss then follows the system.
  document.documentElement.removeAttribute('data-theme');
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked — nothing to undo
  }
};

// One half of the `reducedMotion` story pin — the matchMedia patch ThemeToggle's
// click handler reads; story-frame.scss's rule is the other. Undone on cleanup.
const useSimulatedReducedMotion = (enabled: boolean): void => {
  useLayoutEffect(() => {
    if (!enabled || typeof window.matchMedia !== 'function') return;
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string): MediaQueryList =>
      query === REDUCED_MOTION_QUERY
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as MediaQueryList)
        : original(query);
    return () => {
      window.matchMedia = original;
    };
  }, [enabled]);
};

// A component, not the decorator's own body, so its hooks belong to the story's tree.
const Frame = ({
  theme,
  reducedMotion,
  children,
}: {
  theme: Theme;
  reducedMotion: boolean;
  children: ReactNode;
}): ReactElement => {
  useLayoutEffect(() => {
    syncTheme(theme);
  }, [theme]);
  useSimulatedReducedMotion(reducedMotion);
  const frameRef = useRef<HTMLDivElement>(null);
  // A page story draws its own <main> and a page holds one, so the frame becomes the page's main
  // (role="main" on a <div>, not a nested <main>) only when the story has none. It is set on the
  // element after every render, since the answer comes from the rendered story.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (frame.querySelector('main')) frame.removeAttribute('role');
    else frame.setAttribute('role', 'main');
  });

  const frameClassName = [
    'workshop-story-frame',
    reducedMotion && 'workshop-story-frame--reduced-motion',
  ]
    .filter(Boolean)
    .join(' ');

  // `key` remounts the story on every theme change. The TanStack Query client and the status
  // region are mounted once here, as the root layout mounts them.
  return (
    <StatusRegionProvider>
      <Providers>
        <div className={frameClassName} key={theme} ref={frameRef}>
          {children}
        </div>
      </Providers>
    </StatusRegionProvider>
  );
};

const withWorkshopFrame: Decorator = (Story, context) => (
  <Frame
    theme={(context.globals.theme as Theme | undefined) ?? 'dark'}
    // A story pins it with `parameters: { reducedMotion: true }`.
    reducedMotion={context.parameters.reducedMotion === true}
  >
    <Story />
  </Frame>
);

// The widths stories pin with `globals: { viewport: { value: 'w375' } }`. The viewport control
// resizes the preview pane, so media queries answer as in the app; opened alone at /iframe.html
// the window's own width stands.
const VIEWPORT_WIDTHS = [375, 382, 600, 700];

const preview: Preview = {
  decorators: [withWorkshopFrame],
  // Starts the fake API and, per story, swaps in that story's `msw` handlers.
  loaders: [mswLoader(startMockWorker)],
  initialGlobals: {
    // The app's dark-first default (`:root { @include theme-dark }` in
    // globals.scss), so the workshop opens as a viewer who never touched the
    // toggle sees the app.
    theme: 'dark',
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
          { value: 'auto', title: 'Auto (system)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    // Fills the preview, as the app surface does; the frame brings its own padding.
    layout: 'fullscreen',
    viewport: {
      options: Object.fromEntries(
        VIEWPORT_WIDTHS.map((width) => [
          `w${width}`,
          { name: `${width}px`, styles: { width: `${width}px`, height: '800px' }, type: 'mobile' },
        ]),
      ),
    },
    nextjs: {
      // Without it the framework mounts the Pages Router's context, and the
      // App Router hooks the components call (`useRouter`, `usePathname`)
      // have nothing to read.
      appDirectory: true,
      // The page the workshop pretends to be on, unless a story wraps itself
      // in WorkshopPathname (./navigation.tsx).
      navigation: { pathname: '/admin/users' },
    },
    options: {
      // The top-level groups in the order claude-docs/workshop.md gives
      // (Foundations, the areas as a person meets them, then the kinds), then
      // by group, with `States` first in every group, then `Default` (a piece with
      // nothing to merge), and the rest by name.
      // Storybook reads this function from the source text without running
      // the file, and evaluates it with the types still on, so it can use no name
      // from outside it and carry no type annotation: the parameters are typed
      // by the `satisfies` after `parameters`, which Storybook strips before it looks.
      storySort: (a, b) => {
        const order = [
          'foundations',
          'pages',
          'sign-in',
          'shell',
          'account',
          'coven',
          'ingredients',
          'grimoire',
          'admin',
          'emails',
          'forms',
          'feedback',
          'layout',
          'navigation',
          'surfaces',
        ];
        const [rankA, rankB] = [a.title, b.title].map((title) => {
          const top = (title.split('/')[0] || '').trim().toLowerCase().replace(/\s+/g, '-');
          const index = order.indexOf(top);
          return index === -1 ? order.length : index;
        });
        const byTop = (rankA ?? 0) - (rankB ?? 0);
        if (byTop !== 0) return byTop;
        if (a.title !== b.title) return a.title < b.title ? -1 : 1;
        const [firstA, firstB] = [a.name, b.name].map((name) =>
          name === 'States' ? 0 : name === 'Default' ? 1 : 2,
        );
        const byFirst = (firstA ?? 2) - (firstB ?? 2);
        if (byFirst !== 0) return byFirst;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      },
    },
  } satisfies {
    options: {
      storySort: (
        a: { title: string; name: string; id: string },
        b: { title: string; name: string; id: string },
      ) => number;
    };
    [name: string]: unknown;
  },
};

export default preview;
