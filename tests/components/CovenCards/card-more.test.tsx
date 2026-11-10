import type { Route } from 'next';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { router } from '../../support/next-navigation';
import CardMore from '@/components/CovenCards/card-more';
import type { CardMoreProps } from '@/components/CovenCards/types';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { WORKSPACE_ID } from '../../support/constants';
import { renderWithQuery } from '../../support/render-with-query';

// claude-docs/components/coven-cards.md

const ID = '00000000-0000-4000-8000-000000000002';
const LIST = '/coven/fixture-coven/ingredients' as Route;

const HELD: CardMoreProps = {
  id: ID,
  label: 'House Salt',
  name: 'House Salt',
  workspaceId: WORKSPACE_ID,
  covenSlug: 'fixture-coven',
  mayMakeOurs: true,
  mayRemove: true,
};

const onPage = (props?: CardMoreProps) => (
  <StatusRegionProvider>
    <main>
      <h1>Ingredients</h1>
      {props && <CardMore {...props} />}
    </main>
  </StatusRegionProvider>
);
function renderOnPage(props: CardMoreProps) {
  return renderWithQuery(onPage(props));
}

const more = (name: string) => screen.getByRole('button', { name: `More for ${name}` });
function choices(name: string): string[] {
  fireEvent.click(more(name));
  return within(screen.getByRole('menu', { name: `More for ${name}` }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}
function choose(name: string, item: string): void {
  fireEvent.click(more(name));
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: item }));
}

describe('CardMore', () => {
  beforeEach(() => {
    router.replace.mockClear();
    router.push.mockClear();
    router.refresh.mockClear();
  });

  it('offers Make It Ours and Remove on a compendium entry the cupboard holds', () => {
    renderOnPage(HELD);
    expect(choices('House Salt')).toEqual(['Make It Ours', 'Remove']);
    const menu = screen.getByRole('menu', { name: 'More for House Salt' });
    expect(within(menu).getByRole('group', { name: 'Coven' })).toContainElement(
      within(menu).getByRole('menuitem', { name: 'Remove' }),
    );
    expect(within(menu).queryByRole('group', { name: 'Compendium' })).not.toBeInTheDocument();
  });

  it('draws no bin for a lone Remove, which the Annotate dialog holds', () => {
    renderOnPage({ ...HELD, mayMakeOurs: false });
    // Why it could show: the role may remove the entry.
    expect(screen.queryByRole('button', { name: 'Remove House Salt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps a lone Make It Ours in the menu', () => {
    renderOnPage({ ...HELD, mayRemove: false });
    expect(choices('House Salt')).toEqual(['Make It Ours']);
  });

  it('draws nothing where the role may do nothing more', () => {
    renderOnPage({ ...HELD, mayMakeOurs: false, mayRemove: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('leaves for the given address after a remove, replacing the history entry and reading nothing again', async () => {
    mockGraphQLMutation('RemoveCupboardEntry', () => ({ removeCupboardEntry: ID }));
    renderOnPage({ ...HELD, leaveHref: LIST });

    choose('House Salt', 'Remove');
    press(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Remove/ }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(LIST));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("shows the service's refusal of a Remove and gives More the focus back", async () => {
    mockGraphQLError('RemoveCupboardEntry', { code: 'NOT_FOUND', message: 'No such ingredient' });
    renderOnPage(HELD);

    choose('House Salt', 'Remove');
    const ask = screen.getByRole('alertdialog');
    press(within(ask).getByRole('button', { name: /^Remove/ }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(more('House Salt')).toHaveFocus();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
