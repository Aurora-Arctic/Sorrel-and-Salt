import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PrePaintScripts from '@/app/pre-paint-scripts';

// The root layout's four pre-paint scripts run from the server's HTML. A document the browser renders itself (Next's recovery when `forbidden()` or `notFound()` is thrown)
// must not get them: React creates such a script inert and warns (claude-docs/auth/admin-guard.md, "The admin guard").

describe('PrePaintScripts', () => {
  // Hydration starts from the server's snapshot, then re-renders from the
  // browser's, which drops the scripts that have already run.
  it('writes the scripts into the server HTML, and hydrates it without complaint', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<PrePaintScripts />);
    document.body.append(container);
    // Why it could have complained: the scripts are really there to hydrate.
    expect(container.querySelectorAll('script')).toHaveLength(4);

    await act(async () => {
      hydrateRoot(container, <PrePaintScripts />);
    });

    // Hydration trouble would log, which the dom project fails on (setup-dom.ts).
    container.remove();
  });

  // The script that lets CSS tell a page with script from one without: it marks <html>
  // before first paint, so the panel drawn open for the no-script form can be hidden.
  it('marks the document as one that runs script', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<PrePaintScripts />);
    const scripts = [...container.querySelectorAll('script')].map((script) => script.textContent);
    expect(document.documentElement.hasAttribute('data-js')).toBe(false);
    for (const source of scripts) new Function(source ?? '')();
    expect(document.documentElement.hasAttribute('data-js')).toBe(true);
    document.documentElement.removeAttribute('data-js');
  });

  // The Compact switch is on by default, so only a stored "regular" reaches <html>. A stored
  // "compact" and nothing stored take the same branch, so the "compact" row covers both.
  describe.each([
    ['regular', 'regular'],
    ['compact', null],
  ])('with %s stored for the card density', (stored, expected) => {
    it('sets the attribute only for a stored regular', () => {
      const container = document.createElement('div');
      container.innerHTML = renderToString(<PrePaintScripts />);
      const scripts = [...container.querySelectorAll('script')].map((script) => script.textContent);
      if (stored) window.localStorage.setItem('card-density', stored);
      for (const source of scripts) new Function(source ?? '')();
      expect(document.documentElement.getAttribute('data-card-density')).toBe(expected);
      document.documentElement.removeAttribute('data-card-density');
      document.documentElement.removeAttribute('data-js');
      window.localStorage.clear();
    });
  });
});
