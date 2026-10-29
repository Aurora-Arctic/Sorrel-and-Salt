import { render, screen, within, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SpellPreview from '@/components/SpellPreview';
import type { PreviewStep } from '@/components/SpellPreview/types';
import { press } from '../../support/interact';

// The Preview pane: a button on the recipe page opens the spell full screen, with only the title,
// the ingredients with their amounts and the steps (claude-docs/components/spell-preview.md).

const STEPS: PreviewStep[] = [
  {
    kind: 'ingredient',
    id: 'a',
    name: 'Testwort (Dried Leaf)',
    quantity: '2',
    unit: 'tsp',
    body: null,
  },
  { kind: 'instruction', id: 'b', body: 'Stir three times, sunwise.' },
];

const onPage = () => (
  <main>
    <h1>Fixture Working</h1>
    <a href="/elsewhere">Elsewhere</a>
    <SpellPreview title="Fixture Working" steps={STEPS} />
  </main>
);

const opener = () => screen.getByRole('button', { name: 'Preview' });
const pane = () => screen.getByRole('dialog', { name: 'Fixture Working' });

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
  Reflect.deleteProperty(document, 'exitFullscreen');
  Reflect.deleteProperty(document, 'fullscreenElement');
});

describe('SpellPreview', () => {
  it('shows nothing until Preview is pressed', () => {
    render(onPage());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a pane of the title, the ingredients with amounts and the steps, and no controls but Close', () => {
    render(onPage());
    press(opener());
    const dialog = pane();
    expect(within(dialog).getByRole('heading', { name: 'Fixture Working' })).toBeTruthy();
    const items = within(dialog).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain('Testwort (Dried Leaf)');
    expect(items[0]?.textContent).toContain('2 tsp');
    expect(items[1]?.textContent).toContain('Stir three times, sunwise.');
    expect(within(dialog).queryAllByRole('link')).toEqual([]);
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Close']);
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
});
