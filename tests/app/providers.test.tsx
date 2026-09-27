import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Providers from '@/app/providers';
import { shouldRetry } from '@/lib/graphql-client';

const seen: unknown[] = [];
const lastTwo = () => seen.slice(-2);

function Probe() {
  const client = useQueryClient();
  seen.push(client);
  return (
    <p>
      retry is {client.getDefaultOptions().queries?.retry === shouldRetry ? 'ours' : 'not ours'}
    </p>
  );
}

describe('Providers', () => {
  it("hands its children a query client carrying the client's defaults", () => {
    render(
      <Providers>
        <Probe />
      </Providers>,
    );

    expect(screen.getByText('retry is ours')).toBeInTheDocument();
  });

  it('keeps one client in the browser across mounts, so the cache outlives a render', () => {
    const first = render(
      <Providers>
        <Probe />
      </Providers>,
    );
    first.unmount();
    render(
      <Providers>
        <Probe />
      </Providers>,
    );

    expect(seen.length).toBeGreaterThanOrEqual(2);
    const [before, after] = lastTwo();
    expect(after).toBe(before);
  });

  it('builds a fresh client per server render, so one request never serves another', () => {
    vi.stubGlobal('window', undefined);
    const tree = (
      <Providers>
        <Probe />
      </Providers>
    );

    renderToString(tree);
    renderToString(tree);

    const [first, second] = lastTwo();
    expect(second).not.toBe(first);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
