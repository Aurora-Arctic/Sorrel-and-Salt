import { act, render, screen, within, fireEvent } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecipeStep } from '@/components/SpellRecipe/types';
import { press } from '../../support/interact';

// The address as the browser keeps it, with a history stack: the pane's open state is read from it,
// as Next's `useSearchParams` does for a `pushState` write.
const browser = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = { stack: ['/page'], at: 0 };
  const go = (to: number): void => {
    state.at = to;
    listeners.forEach((listen) => listen());
  };
  return {
    state,
    listeners,
    reset: (url: string): void => {
      state.stack = [url];
      state.at = 0;
    },
    push: (url: string): void => {
      state.stack = [...state.stack.slice(0, state.at + 1), url];
      go(state.stack.length - 1);
    },
    replace: (url: string): void => {
      state.stack[state.at] = url;
      go(state.at);
    },
    back: (): void => go(Math.max(0, state.at - 1)),
    forward: (): void => go(Math.min(state.stack.length - 1, state.at + 1)),
  };
});
vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        (listen) => {
          browser.listeners.add(listen);
          return () => browser.listeners.delete(listen);
        },
        () => browser.state.stack[browser.state.at]!.split('?')[1] ?? '',
        () => '',
      ),
    ),
}));

const { default: SpellPreview } = await import('@/components/SpellPreview');

// The Preview pane: a button on the recipe page opens the spell full screen, with only the title,
// the ingredients with their amounts and the steps (claude-docs/components/spell-preview.md).

const STEPS: RecipeStep[] = [
  {
    kind: 'ingredient',
    id: 'a',
    name: 'Testwort',
    form: 'dried leaf',
    formal: null,
    variantId: 'v1',
    quantity: '2',
    unit: 'tsp',
    look: null,
    safety: null,
    oneOff: false,
    deleted: false,
    body: null,
  },
  { kind: 'instruction', id: 'b', body: 'Stir three times, sunwise.' },
];

const onPage = (demoNotice?: string) => (
  <main>
    <h1>Fixture Working</h1>
    <a href="/elsewhere">Elsewhere</a>
    <SpellPreview
      title="Fixture Working"
      intent="Keeps the hearth warm."
      categories={[]}
      note="Best on a cold night."
      steps={STEPS}
      jarDescription="Squat Amber Jar"
      sealWaxColor={null}
      moonPhase={null}
      dayOfWeek={null}
      demoNotice={demoNotice}
    />
  </main>
);

const opener = () => screen.getByRole('button', { name: 'Preview Spell Fixture Working' });
const pane = () => screen.getByRole('dialog', { name: 'Fixture Working' });

const here = () => browser.state.stack[browser.state.at]!;

beforeEach(() => {
  browser.reset('/page?tab=a');
  vi.spyOn(window.history, 'pushState').mockImplementation((_s, _t, url) =>
    browser.push(String(url)),
  );
  vi.spyOn(window.history, 'replaceState').mockImplementation((_s, _t, url) =>
    browser.replace(String(url)),
  );
  vi.spyOn(window.history, 'back').mockImplementation(browser.back);
  // The component reads the pathname and query from the window when it writes the address.
  vi.spyOn(window, 'location', 'get').mockImplementation(
    () => new URL(here(), 'http://localhost') as unknown as Location,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
  Reflect.deleteProperty(document, 'exitFullscreen');
  Reflect.deleteProperty(document, 'fullscreenElement');
  Reflect.deleteProperty(navigator, 'wakeLock');
});

// A stand-in for the Screen Wake Lock API: each request hands back a lock that can be released.
function fakeWakeLock(request?: () => Promise<unknown>) {
  const locks: { released: boolean; release: () => Promise<void>; onrelease: () => void }[] = [];
  const asked = vi.fn(
    request ??
      (() => {
        const lock = {
          released: false,
          onrelease: (): void => undefined,
          release: () => {
            lock.released = true;
            lock.onrelease();
            return Promise.resolve();
          },
          addEventListener: (_type: string, fn: () => void) => {
            lock.onrelease = fn;
          },
        };
        locks.push(lock);
        return Promise.resolve(lock);
      }),
  );
  Object.defineProperty(navigator, 'wakeLock', { value: { request: asked }, configurable: true });
  return { asked, locks };
}

const settle = () => act(async () => undefined);
const sign = () => screen.queryByRole('button', { name: /screen awake/i });

describe('SpellPreview', () => {
  it('shows nothing until Preview is pressed', () => {
    render(onPage());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('holds no copy of the spell in the page while closed', () => {
    render(onPage());
    expect(screen.queryByText('Keeps the hearth warm.')).toBeNull();
    press(opener());
    expect(screen.getByText('Keeps the hearth warm.')).toBeTruthy();
    press(within(pane()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Keeps the hearth warm.')).toBeNull();
  });

  it("draws Steps and Ingredients one level below the pane's h2 title", () => {
    render(onPage());
    press(opener());
    const dialog = pane();
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Fixture Working' })).toBeTruthy();
    expect(within(dialog).getByRole('heading', { level: 3, name: 'Steps' })).toBeTruthy();
    expect(within(dialog).getByRole('heading', { level: 3, name: 'Ingredients' })).toBeTruthy();
  });

  it('opens a pane of everything the printed spell shows, and no controls but Close', () => {
    render(onPage());
    press(opener());
    const dialog = pane();
    expect(within(dialog).getByRole('heading', { name: 'Fixture Working' })).toBeTruthy();
    expect(within(dialog).getByText('Keeps the hearth warm.')).toBeTruthy();
    expect(within(dialog).getByText('Squat Amber Jar')).toBeTruthy();
    expect(within(dialog).getByText('Best on a cold night.')).toBeTruthy();
    // The Ingredients section: the amount in a cell of its own, beside the name.
    expect(within(dialog).getByRole('heading', { name: 'Ingredients' })).toBeTruthy();
    const needs = within(within(dialog).getByRole('list', { name: 'Ingredients' })).getAllByRole(
      'listitem',
    );
    expect(needs).toHaveLength(1);
    expect(needs[0]?.textContent).toContain('2 tsp');
    expect(needs[0]?.textContent).toContain('Testwort (Dried Leaf)');
    const items = within(within(dialog).getByRole('list', { name: 'Steps' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain('Testwort (Dried Leaf)');
    expect(items[0]?.textContent).toContain('2 tsp');
    expect(items[1]?.textContent).toContain('Stir three times, sunwise.');
    expect(within(dialog).queryAllByRole('link')).toEqual([]);
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label') ?? b.textContent),
    ).toEqual(['Close']);
    // An icon button: the name is for assistive technology only, and the mark is a drawn icon.
    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(close.querySelector('svg')).not.toBeNull();
    expect(close.textContent).toBe('Close');
    expect(close.querySelector('.visually-hidden')?.textContent).toBe('Close');
  });

  it('holds the demo notice as a status in the open pane when given one, and none otherwise', () => {
    const sentence = 'This is a demo coven, fixture words.';
    render(onPage(sentence));
    expect(screen.queryByRole('status')).toBeNull();
    press(opener());
    expect(within(pane()).getByRole('status')).toHaveTextContent(sentence);
  });

  it('holds no status in the open pane without a demo notice', () => {
    render(onPage());
    press(opener());
    expect(within(pane()).queryByRole('status')).toBeNull();
  });

  it('adds ?preview to the address on opening, keeping the other parameters', () => {
    render(onPage());
    expect(here()).toBe('/page?tab=a');
    press(opener());
    expect(here()).toBe('/page?tab=a&preview');
    expect(pane()).toBeInTheDocument();
  });

  it('goes back over the entry it pushed on Close, and Back and Forward close and reopen it', () => {
    render(onPage());
    press(opener());
    act(() => browser.back());
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => browser.forward());
    expect(pane()).toBeInTheDocument();
    press(within(pane()).getByRole('button', { name: 'Close' }));
    expect(here()).toBe('/page?tab=a');
    expect(browser.state.at).toBe(0);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens from a direct link, and Close replaces the address rather than leaving the page', () => {
    browser.reset('/page?preview&tab=a');
    render(onPage());
    expect(pane()).toBeInTheDocument();
    press(within(pane()).getByRole('button', { name: 'Close' }));
    expect(here()).toBe('/page?tab=a');
    expect(browser.state.stack).toHaveLength(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Close (the browser then gives the focus back to Preview, which the story proves)', () => {
    render(onPage());
    press(opener());
    press(within(pane()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape, which the browser reports as the dialog closing', () => {
    render(onPage());
    press(opener());
    fireEvent(pane(), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('asks for true full screen where the browser has it, and leaves it on Close', () => {
    const request = vi.fn(() => Promise.resolve());
    const exit = vi.fn(() => Promise.resolve());
    HTMLElement.prototype.requestFullscreen = request;
    Object.defineProperty(document, 'exitFullscreen', { value: exit, configurable: true });
    render(onPage());
    press(opener());
    expect(request).toHaveBeenCalledTimes(1);
    // Asked of the page: a browser refuses full screen for a dialog.
    expect(request.mock.contexts[0]).toBe(document.documentElement);
    Object.defineProperty(document, 'fullscreenElement', { value: pane(), configurable: true });
    press(within(pane()).getByRole('button', { name: 'Close' }));
    expect(exit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes when the browser leaves full screen, as Escape does there', () => {
    HTMLElement.prototype.requestFullscreen = () => Promise.resolve();
    render(onPage());
    press(opener());
    Object.defineProperty(document, 'fullscreenElement', { value: pane(), configurable: true });
    fireEvent(document, new Event('fullscreenchange'));
    expect(screen.queryByRole('dialog')).not.toBeNull();
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    fireEvent(document, new Event('fullscreenchange'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('still works where full screen is refused or absent', () => {
    HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('refused'));
    render(onPage());
    press(opener());
    expect(pane()).toBeTruthy();
    press(within(pane()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  describe('keeping the screen awake', () => {
    it('asks for a screen lock when the pane opens and releases it on Close', async () => {
      const { asked, locks } = fakeWakeLock();
      render(onPage());
      expect(asked).not.toHaveBeenCalled();
      press(opener());
      await settle();
      expect(asked).toHaveBeenCalledWith('screen');
      expect(within(pane()).getByRole('button', { name: /screen awake/i })).toBeTruthy();
      press(within(pane()).getByRole('button', { name: 'Close' }));
      await settle();
      expect(locks[0]?.released).toBe(true);
    });

    it('turns the lock off from the sign, and on again', async () => {
      const { asked, locks } = fakeWakeLock();
      render(onPage());
      press(opener());
      await settle();
      expect(sign()?.getAttribute('aria-pressed')).toBe('true');
      press(sign() as HTMLElement);
      await settle();
      expect(locks[0]?.released).toBe(true);
      expect(sign()?.getAttribute('aria-pressed')).toBe('false');
      press(sign() as HTMLElement);
      await settle();
      expect(asked).toHaveBeenCalledTimes(2);
      expect(sign()?.getAttribute('aria-pressed')).toBe('true');
    });

    it('tips the sign with what a press will do, and changes it when pressed', async () => {
      fakeWakeLock();
      render(onPage());
      press(opener());
      await settle();
      // The tip opens on focus; its bubble is hidden from assistive technology, so it is asked for as hidden.
      const tip = () =>
        within((sign() as HTMLElement).parentElement as HTMLElement).getByRole('tooltip', {
          hidden: true,
        }).textContent;
      fireEvent.focus(sign() as HTMLElement);
      expect(sign()?.getAttribute('aria-pressed')).toBe('true');
      expect(tip()).toBe('Let the Screen Sleep');
      press(sign() as HTMLElement);
      await settle();
      expect(sign()?.getAttribute('aria-pressed')).toBe('false');
      expect(tip()).toBe('Keep the Screen from Sleeping');
      // The name stays, so the toggle is one control with a state, not two.
      expect(sign()).not.toBeNull();
    });

    it('takes the lock again when the tab comes back, unless it was turned off', async () => {
      const { asked, locks } = fakeWakeLock();
      render(onPage());
      press(opener());
      await settle();
      // The browser drops the lock when the tab is hidden.
      await act(async () => {
        await locks[0]?.release();
      });
      expect(sign()?.getAttribute('aria-pressed')).toBe('false');
      fireEvent(document, new Event('visibilitychange'));
      await settle();
      expect(asked).toHaveBeenCalledTimes(2);
      expect(sign()?.getAttribute('aria-pressed')).toBe('true');
      press(sign() as HTMLElement);
      await settle();
      fireEvent(document, new Event('visibilitychange'));
      await settle();
      expect(asked).toHaveBeenCalledTimes(2);
    });

    it('shows no sign where the browser has no wake lock', async () => {
      render(onPage());
      press(opener());
      await settle();
      expect(sign()).toBeNull();
      expect(pane()).toBeTruthy();
    });

    it('shows no sign and no error when the request is refused', async () => {
      fakeWakeLock(() => Promise.reject(new Error('refused')));
      render(onPage());
      press(opener());
      await settle();
      expect(sign()).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(pane()).toBeTruthy();
    });
  });
});
