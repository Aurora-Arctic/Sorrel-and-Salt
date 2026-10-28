import type { Route } from 'next';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddAction from '@/app/(shell)/admin/add-action';

const NEW_SPELL_HREF = '/coven/fixture/grimoire?new=spell' as Route;

describe('AddAction', () => {
  it('is named by its label at every width, the plus hidden from assistive technology', () => {
    const { container } = render(
      <AddAction href="/admin/categories?new" heading={{ title: 'Add Category' }}>
        Add Category
      </AddAction>,
    );

    const link = screen.getByRole('link', { name: 'Add Category' });

    expect(link).toHaveAttribute('href', '/admin/categories?new');
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(link).toContainElement(icon as SVGElement);
  });

  // A dialog the browser draws itself, New Spell's (M10.12): the press writes the address with
  // pushState, as Add Ingredient's does, so its form shows at once with no skeleton before it.
  describe('with a dialog the client draws', () => {
    it('writes its address with pushState on a plain press, with no navigation', () => {
      const push = vi.spyOn(window.history, 'pushState');
      render(
        <AddAction href={NEW_SPELL_HREF} heading={{ title: 'New Spell' }} drawnHere>
          New Spell
        </AddAction>,
      );

      const press = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      screen.getByRole('link', { name: 'New Spell' }).dispatchEvent(press);

      expect(push).toHaveBeenCalledWith(null, '', '/coven/fixture/grimoire?new=spell');
      // The precondition: the browser's own follow of the link was stopped.
      expect(press.defaultPrevented).toBe(true);
      push.mockRestore();
    });

    it('leaves a press with a modifier to the browser, to open a new tab', () => {
      const push = vi.spyOn(window.history, 'pushState');
      render(
        <AddAction href={NEW_SPELL_HREF} heading={{ title: 'New Spell' }} drawnHere>
          New Spell
        </AddAction>,
      );

      const press = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
      screen.getByRole('link', { name: 'New Spell' }).dispatchEvent(press);

      expect(push).not.toHaveBeenCalled();
      push.mockRestore();
    });
  });
});
