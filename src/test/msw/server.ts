import { setupServer } from 'msw/node';

// No handlers yet — the `/api/graphql` stub and its per-test override helper
// land in M1.10. This just gives vitest.setup.ts's lifecycle hooks a server
// to start, reset, and close.
export const server = setupServer();
