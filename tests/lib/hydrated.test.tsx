import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, onTestFinished } from 'vitest';
import { useHydrated } from '@/lib/hydrated';

// The flag a control reads to draw the server's version or the browser's: the
// server's and hydration's render must agree, or React reports a mismatch,
// and the one after must be the browser's.

function Flag() {
  return <output>{useHydrated() ? 'browser' : 'server'}</output>;
}

describe('useHydrated', () => {
  it('is false on the server and true once the page has hydrated', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Flag />);
    document.body.append(container);
    onTestFinished(() => container.remove());
    expect(container.textContent).toBe('server');

    const errors: unknown[] = [];
    const root = await act(async () =>
      hydrateRoot(container, <Flag />, { onRecoverableError: (error) => errors.push(error) }),
    );
    onTestFinished(() => act(() => root.unmount()));

    expect(container.textContent).toBe('browser');
    expect(errors).toEqual([]);
  });
});
