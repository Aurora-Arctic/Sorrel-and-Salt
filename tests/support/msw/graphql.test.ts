import { describe, it, expect } from 'vitest';
import { mockGraphQLMutation, mockGraphQLQuery } from './graphql';

async function postGraphQL(query: string) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

describe('MSW GraphQL handler stub', () => {
  it('lets a test override a single query operation response', async () => {
    mockGraphQLQuery('GetPing', () => ({ ping: 'pong' }));

    const { data } = await postGraphQL('query GetPing { ping }');
    expect(data).toEqual({ ping: 'pong' });
  });

  it('lets a test override a single mutation operation response', async () => {
    mockGraphQLMutation('SendPing', () => ({ sendPing: true }));

    const { data } = await postGraphQL('mutation SendPing { sendPing }');
    expect(data).toEqual({ sendPing: true });
  });

  it('fails loudly on an operation with no override, rather than hitting the network', async () => {
    await expect(postGraphQL('query GetPing { ping }')).rejects.toThrow();
  });

  it("resets the previous test's override, so the same operation fails loudly again here", async () => {
    await expect(postGraphQL('query GetPing { ping }')).rejects.toThrow();
  });
});
