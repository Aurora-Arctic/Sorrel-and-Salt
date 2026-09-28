import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// Every request a test did not register fails loudly rather than reaching the
// network. Both `unit` and `dom` run this; only `dom` runs setup-dom.ts.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
