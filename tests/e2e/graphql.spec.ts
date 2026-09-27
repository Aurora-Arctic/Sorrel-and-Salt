import { test, expect } from './fixtures';

// Against `next start`, which runs at NODE_ENV=production like every deploy:
// the endpoint is served by the app's own process, and GraphiQL is not.
test('/api/graphql answers a query from the app itself', async ({ request }) => {
  const response = await request.post('/api/graphql', { data: { query: '{ ok }' } });

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ data: { ok: true } });
});

test('/api/graphql serves no GraphiQL in a production build', async ({ request }) => {
  const response = await request.get('/api/graphql', { headers: { accept: 'text/html' } });

  expect(response.headers()['content-type'] ?? '').not.toMatch(/^text\/html/);
  expect(await response.text()).not.toMatch(/graphiql/i);
});
