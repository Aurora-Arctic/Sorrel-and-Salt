import { setupServer } from 'msw/node';

// No base handlers — every operation is registered per test (graphql.ts).
export const server = setupServer();
