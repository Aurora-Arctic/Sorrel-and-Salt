import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Providers from '@/app/providers';
import { shouldRetry } from '@/lib/graphql-client';

const seen: QueryClient[] = [];
const lastTwo = () => seen.slice(-2);

function Probe() {
  seen.push(useQueryClient());
  return null;
}

describe('Providers', () => {
  it("keeps one client in the browser across mounts, carrying the client's defaults", () => {
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
    expect(after?.getDefaultOptions().queries?.retry).toBe(shouldRetry);
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
