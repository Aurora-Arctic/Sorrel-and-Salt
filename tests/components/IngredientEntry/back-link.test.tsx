import { act, render, screen } from '@testing-library/react';
import type { Route } from 'next';
import { useInsertionEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));

const { default: BackLink } = await import('@/components/IngredientEntry/back-link');

// A fake Navigation API: an entry list, an index, and the event Next's history write fires.
class FakeNavigation extends EventTarget {
  index = 0;
  urls = [`${window.location.origin}/coven/x/grimoire?tab=spells`];
  get currentEntry() {
    return { index: this.index };
  }
  entries() {
    return this.urls.map((url) => ({ url }));
  }
}
const navigation = new FakeNavigation();

// Next writes the history inside an insertion effect (its HistoryUpdater), and the browser fires
// `currententrychange` from that very call.
function HistoryWrite({ pushes }: { pushes: number }) {
  useInsertionEffect(() => {
    if (pushes === 0) return;
    navigation.urls.push(`${window.location.origin}/coven/x/grimoire/1`);
    navigation.index = navigation.urls.length - 1;
    navigation.dispatchEvent(new Event('currententrychange'));
  }, [pushes]);
  return null;
}

function Page() {
  const [pushes, setPushes] = useState(0);
  return (
    <>
      <BackLink href={'/coven/x/grimoire' as Route}>Grimoire</BackLink>
      <HistoryWrite pushes={pushes} />
      <button onClick={() => setPushes(1)}>Navigate</button>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'navigation');
});

describe('BackLink', () => {
  it('reads the history after Next writes it, without scheduling an update inside the write', async () => {
    Object.defineProperty(window, 'navigation', { value: navigation, configurable: true });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Page />);
    expect(screen.getByRole('link', { name: /Grimoire/ })).toHaveAttribute(
      'href',
      '/coven/x/grimoire',
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Navigate' }).click();
    });

    // The link still follows the history once the write is done.
    expect(screen.getByRole('link', { name: /Grimoire/ })).toHaveAttribute(
      'href',
      '/coven/x/grimoire?tab=spells',
    );
    expect(error.mock.calls.map((call) => String(call[0]))).toEqual([]);
  });
});
