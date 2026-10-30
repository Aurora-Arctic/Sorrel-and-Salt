import { act, render, screen, within, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SpellPreview from '@/components/SpellPreview';
import type { RecipeStep } from '@/components/SpellRecipe/types';
import { press } from '../../support/interact';

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

const onPage = () => (
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
    />
  </main>
);

const opener = () => screen.getByRole('button', { name: 'Preview Spell Fixture Working' });
const pane = () => screen.getByRole('dialog', { name: 'Fixture Working' });

afterEach(() => {
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
    // An X, not the word.
    expect(within(dialog).getByRole('button', { name: 'Close' }).textContent).toBe('×');
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
