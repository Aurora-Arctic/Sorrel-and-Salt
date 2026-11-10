import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { router } from '../../support/next-navigation';

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const { default: NewSpellElsewhere } = await import('@/components/AppShell/new-spell-elsewhere');

const at = (path: string, search: string) => {
  pathname.mockReturnValue(path);
  window.history.replaceState(null, '', `${path}?${search}`);
  render(<NewSpellElsewhere />);
};

describe('NewSpellElsewhere', () => {
  it('moves a coven’s New Spell from another page to its grimoire, replacing the address', () => {
    at('/coven/fixture-coven/ingredients', 'new=spell-testwort-circle');

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(
      '/coven/testwort-circle/grimoire?new=spell-testwort-circle',
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('moves it from another coven’s grimoire', () => {
    at('/coven/fixture-coven/grimoire', 'new=spell-testwort-circle');

    expect(router.replace).toHaveBeenCalledOnce();
  });

  it.each([
    ['its own grimoire', '/coven/testwort-circle/grimoire', 'new=spell-testwort-circle'],
    ['its drafts', '/coven/testwort-circle/grimoire/drafts', 'new=spell-testwort-circle'],
    ['a value naming no coven', '/coven/fixture-coven/ingredients', 'new=spell'],
    ['Add Ingredient’s value', '/coven/fixture-coven', 'new=ingredient-coven-spell-x'],
  ])('leaves the address alone on %s', (_, path, search) => {
    at(path, search);

    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
