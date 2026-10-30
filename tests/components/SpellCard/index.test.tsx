import { QueryClientProvider } from '@tanstack/react-query';
import type { Route } from 'next';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import SpellCard from '@/components/SpellCard';
import type {
  RecordWorkingMutation,
  RecordWorkingMutationVariables,
  RecordWorkingSetupQuery,
  RecordWorkingSetupQueryVariables,
  WorkingDeductionPreviewQuery,
} from '@/gql/graphql';
import { mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';

// The title link navigates through the shared hook, so the App Router is mocked.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/here',
}));

// (claude-docs/components/spell-card.md): the card is presentational, so each
// case is its props in and what rendered out. The spells are the test's own data.

const GROUP = { colorDark: '#7a5c99', colorLight: '#5b3f7a' };
const BASE = {
  id: 'spell-1',
  title: 'Fixture Working',
  intent: 'To keep the testwort fresh.',
  status: 'complete' as const,
  visibility: 'workspace' as const,
  categories: [],
};

const MORE = {
  workspaceId: 'workspace-1',
  covenSlug: 'fixture-coven',
  deletedHref: '/here?deleted=Fixture+Working' as Route,
  canDuplicate: true,
  canDelete: true,
};

describe('SpellCard', () => {
  it('says how many times a spell has been made, once for one and nothing for none', () => {
    const { rerender } = render(<SpellCard {...BASE} workingCount={3} />);
    expect(screen.getByText('Made 3 times')).toBeInTheDocument();
    rerender(<SpellCard {...BASE} workingCount={1} />);
    expect(screen.getByText('Made once')).toBeInTheDocument();
    rerender(<SpellCard {...BASE} workingCount={0} />);
    expect(screen.queryByText(/^made /i)).not.toBeInTheDocument();
    rerender(<SpellCard {...BASE} />);
    expect(screen.queryByText(/^made /i)).not.toBeInTheDocument();
  });

  // The count is read with the edit line, after it and before the actions, as one line of the foot.
  it('reads the made count after the edit line and before the actions', () => {
    render(
      <SpellCard
        {...BASE}
        workingCount={3}
        lastEdit={{ by: 'Fixture A', at: '2026-09-01T12:00:00.000Z' }}
        editHref={'/edit' as Route}
      />,
    );
    const made = screen.getByText('Made 3 times');
    const edited = screen.getByRole('button', { name: /^Edited/ });
    const edit = screen.getByRole('link', { name: /^Edit Fixture Working/ });
    expect(edited.compareDocumentPosition(made) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(made.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws a Record a Working button only when given what recording needs, and reads the dialog’s members and steps only once it opens', async () => {
    const asked: RecordWorkingSetupQueryVariables[] = [];
    mockGraphQLQuery<RecordWorkingSetupQuery, RecordWorkingSetupQueryVariables>(
      'RecordWorkingSetup',
      (variables) => {
        asked.push(variables);
        return {
          spell: {
            id: 'spell-1',
            steps: [
              { id: 's0', name: null, form: null, ingredient: null, variant: null },
              {
                id: 's1',
                name: 'Testwort',
                form: 'Dried Leaf',
                ingredient: { id: 'i1' },
                variant: { id: 'v1' },
              },
            ],
          },
          workspace: {
            id: 'workspace-1',
            members: {
              edges: [
                { node: { user: { id: 'u1', name: 'Testa Owner' } } },
                { node: { user: { id: 'u2', name: 'Mocka Member' } } },
              ],
            },
          },
        } as RecordWorkingSetupQuery;
      },
    );
    mockGraphQLMutation<RecordWorkingMutation, RecordWorkingMutationVariables>(
      'RecordWorking',
      (variables) =>
        ({
          recordWorking: {
            id: 'w1',
            status: 'draft',
            note: null,
            workedOn: variables.input.workedOn,
            visibility: 'workspace',
            participants: [{ id: 'p1', name: 'Testa Owner', userId: 'u1' }],
          },
        }) as RecordWorkingMutation,
    );
    mockGraphQLQuery<WorkingDeductionPreviewQuery>('WorkingDeductionPreview', () => ({
      workingDeductionPreview: {
        deductions: [],
        warnings: [{ position: 2, reason: 'UNSTOCKED', stepId: 's1', stepName: 'Testwort' }],
      },
    }));
    const recordWorking = { workspaceId: 'workspace-1', recorderId: 'u1' };
    const { rerender } = render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('button', { name: /^Record a Working/ })).not.toBeInTheDocument();
    rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <SpellCard {...BASE} recordWorking={recordWorking} />
      </QueryClientProvider>,
    );
    // A list draws many cards, so nothing is read for a card until its dialog opens.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(asked).toEqual([]);

    press(screen.getByRole('button', { name: 'Record a Working of Fixture Working' }));
    const dialog = await screen.findByRole('dialog', { name: 'Record a Working' });
    expect(within(dialog).getByRole('status')).toHaveTextContent('Loading');
    // The recorder starts as a participant, picked from the members read on opening.
    expect(
      await within(dialog).findByRole('button', { name: /Remove.*Testa Owner/ }),
    ).toBeInTheDocument();
    expect(asked).toEqual([{ workspaceId: 'workspace-1', spellId: 'spell-1' }]);
    // The ingredient step read on opening is the one the completion preview names.
    press(within(dialog).getByRole('button', { name: 'Complete' }));
    expect(await screen.findByRole('list', { name: 'Deductions' })).toHaveTextContent('Testwort');
  });

  it('draws the foot in the order Record a Working, Edit, then the More menu', () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <SpellCard
          {...BASE}
          editHref={'/here?edit=spell-1' as Route}
          recordWorking={{ workspaceId: 'workspace-1', recorderId: 'u1' }}
          more={MORE}
        />
      </QueryClientProvider>,
    );
    const names = within(screen.getByRole('article'))
      .getAllByRole('button')
      .concat(screen.getAllByRole('link', { name: /^Edit / }))
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .map((el) => el.textContent);
    expect(names.join('|')).toMatch(
      /Record a Working.*Edit Fixture Working.*More for Fixture Working/,
    );
  });

  it('draws a More menu holding Duplicate and Delete Spell, and no Print, and Delete asks in a dialog naming the spell', async () => {
    const { rerender } = render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('button', { name: /^More for / })).not.toBeInTheDocument();
    rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <SpellCard {...BASE} more={MORE} />
      </QueryClientProvider>,
    );
    press(screen.getByRole('button', { name: 'More for Fixture Working' }));
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([
      'Duplicate',
      'Delete Spell',
    ]);
    press(screen.getByRole('menuitem', { name: 'Delete Spell' }));
    expect(
      within(await screen.findByRole('dialog', { name: 'Delete Spell' })).getByText(
        'Fixture Working',
      ),
    ).toBeInTheDocument();
  });

  it('offers only what the role may do in the menu, and draws no menu when it may do neither', async () => {
    const { rerender } = render(
      <QueryClientProvider client={makeQueryClient()}>
        <SpellCard {...BASE} more={{ ...MORE, canDelete: false }} />
      </QueryClientProvider>,
    );
    press(screen.getByRole('button', { name: 'More for Fixture Working' }));
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([
      'Duplicate',
    ]);
    rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <SpellCard {...BASE} more={{ ...MORE, canDuplicate: false, canDelete: false }} />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('button', { name: /^More for / })).not.toBeInTheDocument();
  });

  it('keeps the buttons out of the title link', () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <SpellCard
          {...BASE}
          href={'/coven/x/grimoire/spell-1' as Route}
          recordWorking={{ workspaceId: 'workspace-1', recorderId: 'u1' }}
          more={MORE}
        />
      </QueryClientProvider>,
    );
    const title = screen.getByRole('link', { name: /^Fixture Working/ });
    expect(title.contains(screen.getByRole('button', { name: /^Record a Working of / }))).toBe(
      false,
    );
    expect(title.contains(screen.getByRole('button', { name: /^More for / }))).toBe(false);
  });

  it('draws an Edit link named for the spell only when given the address', () => {
    const { rerender } = render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('link', { name: /^Edit / })).not.toBeInTheDocument();
    rerender(<SpellCard {...BASE} editHref={'/here?edit=spell-1' as Route} />);
    expect(screen.getByRole('link', { name: 'Edit Fixture Working' })).toHaveAttribute(
      'href',
      '/here?edit=spell-1',
    );
  });

  it('draws a Quick Look eye named for the spell only when given the address, apart from the title link', () => {
    const href = '/coven/x/grimoire/spell-1' as Route;
    const { rerender } = render(<SpellCard {...BASE} href={href} />);
    expect(screen.queryByRole('link', { name: /^Quick Look / })).not.toBeInTheDocument();
    rerender(
      <SpellCard
        {...BASE}
        href={href}
        lookHref={'/here?spell=spell-1' as Route}
        editHref={'/here?edit=spell-1' as Route}
      />,
    );
    const eye = screen.getByRole('link', { name: 'Quick Look Fixture Working' });
    expect(eye).toHaveAttribute('href', '/here?spell=spell-1');
    expect(screen.getByRole('link', { name: /^Fixture Working/ }).contains(eye)).toBe(false);
    expect(screen.getByRole('link', { name: 'Edit Fixture Working' })).toBeInTheDocument();
  });

  it('keeps the Edit link out of the title link, so the stretched title link never swallows it', () => {
    render(
      <SpellCard
        {...BASE}
        href={'/coven/x/grimoire/spell-1' as Route}
        editHref={'/here?edit=spell-1' as Route}
      />,
    );
    const title = screen.getByRole('link', { name: /^Fixture Working/ });
    const edit = screen.getByRole('link', { name: 'Edit Fixture Working' });
    expect(title).not.toBe(edit);
    expect(title.contains(edit)).toBe(false);
    expect(edit.contains(title)).toBe(false);
  });

  it('names the card by its title heading', () => {
    render(<SpellCard {...BASE} />);
    const card = screen.getByRole('article', { name: 'Fixture Working' });
    expect(within(card).getByRole('heading', { name: 'Fixture Working' })).toBeInTheDocument();
  });

  it('calls a spell with no title Untitled Spell', () => {
    render(<SpellCard {...BASE} title={null} status="draft" />);
    expect(screen.getByRole('heading', { name: 'Untitled Spell' })).toBeInTheDocument();
  });

  it('calls a blank title Untitled Spell too', () => {
    render(<SpellCard {...BASE} title="   " status="draft" />);
    expect(screen.getByRole('heading', { name: 'Untitled Spell' })).toBeInTheDocument();
  });

  it('shows the intent, and no paragraph for a spell without one', () => {
    const { rerender } = render(<SpellCard {...BASE} />);
    expect(screen.getByText('To keep the testwort fresh.')).toBeInTheDocument();
    rerender(<SpellCard {...BASE} intent={null} />);
    expect(screen.queryByText('To keep the testwort fresh.')).not.toBeInTheDocument();
  });

  // Complete is the default, so only a draft is marked.
  it('marks a draft with a Draft badge, and a complete spell with no status badge', () => {
    const { rerender } = render(<SpellCard {...BASE} status="draft" />);
    expect(within(screen.getByRole('article')).getByText('Draft')).toBeInTheDocument();
    rerender(<SpellCard {...BASE} status="complete" />);
    const card = screen.getByRole('article', { name: 'Fixture Working' });
    expect(within(card).queryByText('Draft')).not.toBeInTheDocument();
    expect(within(card).queryByText('Complete')).not.toBeInTheDocument();
  });

  // Only its author lists a private spell, so the badge tells them it
  // is theirs alone. A word, not a colour, so it reads without one.
  it('marks a private spell Private, and a spell shared with the coven with nothing', () => {
    const { rerender } = render(<SpellCard {...BASE} visibility="private" />);
    expect(within(screen.getByRole('article')).getByText('Private')).toBeInTheDocument();
    rerender(<SpellCard {...BASE} visibility="workspace" />);
    expect(within(screen.getByRole('article')).queryByText('Private')).not.toBeInTheDocument();
  });

  it('marks a private draft with both badges', () => {
    render(<SpellCard {...BASE} status="draft" visibility="private" />);
    const card = within(screen.getByRole('article'));
    expect(card.getByText('Draft')).toBeInTheDocument();
    expect(card.getByText('Private')).toBeInTheDocument();
  });

  // Who last changed the spell, drawn from what the caller hands in, as IngredientCard's.
  it('says who last edited the spell and when, given the edit', () => {
    render(<SpellCard {...BASE} lastEdit={{ by: 'Fixture A', at: '2026-09-01T12:00:00.000Z' }} />);
    const card = screen.getByRole('article', { name: 'Fixture Working' });
    expect(within(card).getByRole('button', { name: /^Edited/ })).toHaveAccessibleDescription(
      'Last edited by Fixture A on 1 September 2026',
    );
  });

  it('draws no edit line when it is given none', () => {
    render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('button', { name: /^Edited/ })).not.toBeInTheDocument();
  });

  it('lists the assigned categories as chips', () => {
    render(
      <SpellCard
        {...BASE}
        categories={[{ category: { id: 'c1', name: 'Testward' }, group: GROUP }]}
      />,
    );
    const chips = screen.getByRole('list', { name: 'Categories' });
    expect(within(chips).getByText('Testward')).toBeInTheDocument();
  });

  it('is not a link until the spell page exists', () => {
    render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  // The smouldering edge (spell-card.md) is decoration: a screen reader meets the card's title
  // and nothing the hover draws.
  it('exposes the card as its title alone, with no description and no image from the smoulder', () => {
    render(<SpellCard {...BASE} />);
    const card = screen.getByRole('article', { name: 'Fixture Working' });
    expect(card).toHaveAccessibleName('Fixture Working');
    expect(card).toHaveAccessibleDescription('');
    expect(within(card).queryAllByRole('img')).toHaveLength(0);
  });
});

// The title links to the spell's recipe page, through the shared navigation hook.
describe('SpellCard link', () => {
  it('makes the title a link to the recipe page when given an address', () => {
    render(<SpellCard {...BASE} href={'/coven/fixture-coven/grimoire/spell-1' as Route} />);
    const link = screen.getByRole('link', { name: 'Fixture Working' });
    expect(link).toHaveAttribute('href', '/coven/fixture-coven/grimoire/spell-1');
    expect(within(screen.getByRole('heading')).getByRole('link')).toBe(link);
  });

  it('leaves the title plain text with no address', () => {
    render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
