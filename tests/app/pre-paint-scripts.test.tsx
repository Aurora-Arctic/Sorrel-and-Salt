import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PrePaintScripts from '@/app/pre-paint-scripts';

// The root layout's two pre-paint scripts run from the server's HTML. A
// document the browser renders itself — Next's recovery when `forbidden()` or
// `notFound()` is thrown — must not get them: React creates such a script
// inert and warns (claude-docs/auth/admin-guard.md, "The admin guard").

describe('PrePaintScripts', () => {
  // Hydration starts from the server's snapshot, then re-renders from the
  // browser's, which drops the scripts that have already run.
  it('writes both scripts into the server HTML, and hydrates it without complaint', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<PrePaintScripts />);
    document.body.append(container);
    // Why it could have complained: the scripts are really there to hydrate.
    expect(container.querySelectorAll('script')).toHaveLength(2);

    await act(async () => {
      hydrateRoot(container, <PrePaintScripts />);
    });

    // Hydration trouble would log, which the dom project fails on (setup-dom.ts).
    container.remove();
  });
});
