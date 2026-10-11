import { describe, expect, it } from 'vitest';

// The harness's one test (claude-docs/testing/layer-ownership.md, "What a test
// may assert", rule 1): a component test that forgets to register an
// operation must fail, not reach the network and pass on whatever answers.

describe('MSW GraphQL handler stub', () => {
  it('fails loudly on an operation with no override, rather than hitting the network', async () => {
    await expect(
      fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'query GetPing { ping }' }),
      }),
    ).rejects.toThrow();
  });
});
