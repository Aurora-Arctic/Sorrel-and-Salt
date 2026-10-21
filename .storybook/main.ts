import type { StorybookConfig } from '@storybook/nextjs-vite';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

// Storybook, the component workshop; the story frame, theme control and viewport
// widths are in ./preview.tsx. See claude-docs/workshop.md, ".storybook/".

// `leave-auth-requests-pending` answers nothing to a request under /api/auth made
// from one of the two stories that show a button waiting on Better Auth
// (M12.33). The window's own `fetch` cannot be replaced for them: Better Auth's
// client takes hold of `fetch` once, when it is created, so a story's stand-in
// is never called. Every other story still gets the workshop's plain 404. The
// referer is the preview iframe's address, whose `id` is the story's.
const WAITING_ON_AUTH = /[?&]id=[a-z-]+--(loading-add|loading-sign-in)(&|$)/;

const config: StorybookConfig = {
  // One story file per component directory and one per mail template, the
  // shapes the workshop guard checks; the last glob is workshop-only pages the
  // guard deliberately ignores.
  stories: [
    '../src/components/**/index.stories.tsx',
    '../src/emails/*.stories.tsx',
    './*.stories.tsx',
  ],
  framework: '@storybook/nextjs-vite',
  core: {
    // This repo is public and the workshop runs in a container: no calls home.
    disableTelemetry: true,
    disableWhatsNewNotifications: true,
    // The container listens on every interface (`--host 0.0.0.0`) so the host can
    // reach it, and Storybook then stops at a prompt unless it is told which Host
    // headers to accept. `localhost` is the owner's browser, `devcontainer` the
    // e2e remote browser, as the Vite `server.allowedHosts` below says.
    allowedHosts: ['localhost', 'devcontainer'],
  },
  // Pages are not documented here (no autodocs), and the props tables they would
  // read cost a type-checker pass on every start.
  typescript: { reactDocgen: false },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      plugins: [
        {
          name: 'leave-auth-requests-pending',
          configureServer(server: {
            middlewares: {
              use: (
                handler: (
                  request: { url?: string; headers: { referer?: string } },
                  response: unknown,
                  next: () => void,
                ) => void,
              ) => void;
            };
          }) {
            server.middlewares.use((request, _response, next) => {
              if (
                request.url?.startsWith('/api/auth') &&
                WAITING_ON_AUTH.test(request.headers.referer ?? '')
              ) {
                return;
              }
              next();
            });
          },
        },
      ],
      // The remote browser of tests/e2e (playwright.workshop.config.ts) reaches the
      // workshop as `devcontainer`, the compose service name, which Vite refuses
      // by default as a host it does not know (tests/e2e/slots.ts, `browserUrl`).
      server: { allowedHosts: ['devcontainer'] },
      resolve: {
        alias: {
          // The components import `@/modules/...` at runtime, as `tsconfig.json`'s
          // paths say; the framework does not read those paths for stories.
          '@': fileURLToPath(new URL('../src', import.meta.url)),
        },
      },
      css: {
        preprocessorOptions: {
          // Sass must resolve `@use` the way `next dev` does: relative paths, empty
          // load paths. Asks for the compiler `sass` supports the app's way.
          scss: { api: 'modern-compiler' },
        },
      },
    }),
};

export default config;
