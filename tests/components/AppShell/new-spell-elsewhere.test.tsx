import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `?new=spell-<slug>` away from that coven's grimoire moves there, since New Spell is a
// dialog over the grimoire alone (M10.12, the owner's call, 2026-10-28).
const pathname = vi.fn<() => string>();
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push, replace }),
}));

const { default: NewSpellElsewhere } = await import('@/components/AppShell/new-spell-elsewhere');

const at = (path: string, search: string) => {
  pathname.mockReturnValue(path);
  window.history.replaceState(null, '', `${path}?${search}`);
  render(<NewSpellElsewhere />);
};

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
});

describe('NewSpellElsewhere', () => {
  it('moves a coven’s New Spell from another page to its grimoire, replacing the address', () => {
    at('/coven/fixture-coven/ingredients', 'new=spell-testwort-circle');

    expect(replace).toHaveBeenCalledExactlyOnceWith(
      '/coven/testwort-circle/grimoire?new=spell-testwort-circle',
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('moves it from another coven’s grimoire', () => {
    at('/coven/fixture-coven/grimoire', 'new=spell-testwort-circle');

    expect(replace).toHaveBeenCalledOnce();
  });

  it.each([
    ['its own grimoire', '/coven/testwort-circle/grimoire', 'new=spell-testwort-circle'],
    ['its drafts', '/coven/testwort-circle/grimoire/drafts', 'new=spell-testwort-circle'],
    ['a value naming no coven', '/coven/fixture-coven/ingredients', 'new=spell'],
    ['Add Ingredient’s value', '/coven/fixture-coven', 'new=ingredient-coven-spell-x'],
  ])('leaves the address alone on %s', (_, path, search) => {
    at(path, search);

    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
