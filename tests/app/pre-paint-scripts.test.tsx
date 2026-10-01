import { render } from '@testing-library/react';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PrePaintScripts from '@/app/pre-paint-scripts';

// The root layout's two pre-paint scripts run from the server's HTML. A
// document the browser renders itself — Next's recovery when `forbidden()` or
// `notFound()` is thrown — must not get them: React creates such a script
// inert and warns (claude-docs/auth/admin-guard.md, "The admin guard").

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PrePaintScripts', () => {
  it('writes both scripts into the server HTML', () => {
    const html = renderToString(<PrePaintScripts />);

    expect(html).toContain('localStorage.getItem("theme")');
    expect(html).toContain('#_=_');
  });

  it('hydrates the server HTML without complaint', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<PrePaintScripts />);
    document.body.append(container);
    // Why it could have complained: the scripts are really there to hydrate.
    expect(container.querySelectorAll('script')).toHaveLength(2);
    const error = vi.spyOn(console, 'error');

    await act(async () => {
      hydrateRoot(container, <PrePaintScripts />);
    });

    expect(error).not.toHaveBeenCalled();
    container.remove();
  });

  it('renders no script, and no warning, when the browser renders the document itself', () => {
    const error = vi.spyOn(console, 'error');

    const { container } = render(<PrePaintScripts />);

    expect(container.querySelector('script')).toBeNull();
    expect(error).not.toHaveBeenCalled();
  });
});
