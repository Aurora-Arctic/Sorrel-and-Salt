import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditMore from '@/components/IngredientEntry/edit-more';
import { UNSAVED_CHANGES_NOT_KEPT } from '@/components/IngredientEntry/link-confirm';
import { press } from '../../support/interact';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The coven edit dialog's foot (M8.17): Link to the Compendium and Delete
// Ingredient in a More menu, or the one allowed as a button of its own. Link
// asks first, then replaces the edit dialog with the Link dialog at its
// address; Delete asks the form's own confirmation.

const LINK = '/coven/fixture-coven/ingredients?link=fixture-id' as Route;
const QUESTION = /^Link Testwort to the compendium\?/;

function renderMore(props: Partial<Parameters<typeof EditMore>[0]> = {}) {
  const requestDelete = vi.fn();
  const view = render(
    <EditMore
      name="Testwort"
      linkHref={LINK}
      dirty={false}
      discardAsking={false}
      requestDelete={requestDelete}
      {...props}
    />,
  );
  return { ...view, requestDelete };
}

const more = () => screen.queryByRole('button', { name: 'More' });

function choose(name: string) {
  fireEvent.click(more()!);
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name }));
}

beforeEach(() => vi.clearAllMocks());

describe('EditMore', () => {
  it('offers Link to the Compendium and Delete Ingredient in More, in that order', () => {
    renderMore();

    fireEvent.click(more()!);
    expect(
      within(screen.getByRole('menu'))
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Link to the Compendium', 'Delete Ingredient']);
  });

  it('offers Delete alone as a button of its own where the role may not link', () => {
    const { requestDelete } = renderMore({ linkHref: undefined });

    expect(more()).toBeNull();
    press(screen.getByRole('button', { name: 'Delete Ingredient' }));
    expect(requestDelete).toHaveBeenCalledOnce();
  });

  it("asks Delete's confirmation from the menu", () => {
    const { requestDelete } = renderMore();

    choose('Delete Ingredient');

    expect(requestDelete).toHaveBeenCalledOnce();
  });

  it('asks before Link, then opens the Link dialog in place of this one', () => {
    renderMore();

    choose('Link to the Compendium');
    const asked = screen.getByRole('group', { name: QUESTION });
    expect(within(asked).queryByText(UNSAVED_CHANGES_NOT_KEPT)).toBeNull();
    press(within(asked).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('group', { name: QUESTION })).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();

    choose('Link to the Compendium');
    press(
      within(screen.getByRole('group', { name: QUESTION })).getByRole('button', {
        name: 'Continue',
      }),
    );

    expect(router.replace).toHaveBeenCalledWith(LINK);
  });

  it('says unsaved changes are not kept while the form holds some', () => {
    renderMore({ dirty: true });

    choose('Link to the Compendium');

    expect(
      within(screen.getByRole('group', { name: QUESTION })).getByText(UNSAVED_CHANGES_NOT_KEPT),
    ).toBeInTheDocument();
  });

  it("steps aside while the form's unsaved-changes confirmation asks", () => {
    const view = renderMore({ dirty: true });
    choose('Link to the Compendium');

    view.rerender(
      <EditMore name="Testwort" linkHref={LINK} dirty discardAsking requestDelete={vi.fn()} />,
    );

    expect(screen.queryByRole('group', { name: QUESTION })).toBeNull();
  });
});
