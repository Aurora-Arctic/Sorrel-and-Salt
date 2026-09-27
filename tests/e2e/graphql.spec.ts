import { test, expect } from './fixtures';

// Against `next start`, which runs at NODE_ENV=production like every deploy:
// the endpoint is served by the app's own process, and the IDE is not.
test('/api/graphql answers a query from the app itself', async ({ request }) => {
  const response = await request.post('/api/graphql', { data: { query: '{ ok }' } });

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ data: { ok: true } });
});

test('/api/graphql serves no IDE in a production build', async ({ request }) => {
  const response = await request.get('/api/graphql', { headers: { accept: 'text/html' } });

  expect(response.headers()['content-type'] ?? '').not.toMatch(/^text\/html/);
  expect(await response.text()).not.toMatch(/altair|graphiql/i);
});

// `next start` runs at NODE_ENV=production, so this is what staging answers.
test('/api/graphql refuses introspection in a production build', async ({ request }) => {
  const response = await request.post('/api/graphql', {
    data: { query: '{ __schema { queryType { name } } }' },
  });

  const result = await response.json();
  expect(result.data).toBeUndefined();
  expect(result.errors[0].message).toMatch(/^GraphQL introspection has been disabled/);
});

test('/api/graphql suggests no field in a production build', async ({ request }) => {
  const response = await request.post('/api/graphql', { data: { query: '{ ko }' } });

  const result = await response.json();
  expect(result.errors[0].message).toMatch(/^Cannot query field "ko" on type "Query"\./);
  expect(result.errors[0].message).not.toMatch(/"ok"|did you mean/i);
});
