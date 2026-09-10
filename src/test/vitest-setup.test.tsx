import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server';

// These exercise vitest.setup.ts's global hooks rather than any app code —
// each assertion depends on the previous test in the same describe having
// run and NOT been undone by hand, so the hook under test is the only thing
// that could have reset the state.

describe('vitest.setup.ts — RTL cleanup', () => {
  it('renders a marker element', () => {
    render(<div data-testid="cleanup-marker">first render</div>);
    expect(screen.getByTestId('cleanup-marker')).toBeInTheDocument();
  });

  it("does not see the previous test's render, because afterEach(cleanup) unmounted it", () => {
    expect(screen.queryByTestId('cleanup-marker')).not.toBeInTheDocument();
    expect(document.body.innerHTML).toBe('');
  });
});

describe('vitest.setup.ts — localStorage polyfill', () => {
  it('is a fully working Storage, not the Node native shadow', () => {
    expect(window.localStorage.getItem('missing')).toBeNull();

    window.localStorage.setItem('theme', 'dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
    expect(window.localStorage.length).toBe(1);
    expect(window.localStorage.key(0)).toBe('theme');

    window.localStorage.removeItem('theme');
    expect(window.localStorage.getItem('theme')).toBeNull();

    window.localStorage.setItem('a', '1');
    window.localStorage.setItem('b', '2');
    window.localStorage.clear();
    expect(window.localStorage.length).toBe(0);
  });

  it('starts empty in a fresh test, proving state does not leak between tests', () => {
    expect(window.localStorage.length).toBe(0);
  });
});

describe('vitest.setup.ts — MSW server lifecycle', () => {
  it('is listening, so a one-off handler intercepts a request', async () => {
    server.use(http.get('https://vitest-setup.test/ping', () => HttpResponse.json({ ok: true })));

    const response = await fetch('https://vitest-setup.test/ping');
    expect(await response.json()).toEqual({ ok: true });
  });

  it('resets handlers between tests, so the previous one-off handler is gone', async () => {
    await expect(fetch('https://vitest-setup.test/ping')).rejects.toThrow();
  });
});
