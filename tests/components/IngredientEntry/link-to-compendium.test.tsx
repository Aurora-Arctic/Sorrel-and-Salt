import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkToCompendium from '@/components/IngredientEntry/link-to-compendium';
import { GraphQLClientError } from '@/lib/graphql-client-error';
import { useNavigationState } from '@/lib/navigation';
import { Navigating } from '../../support/navigating';

// Link to Selected sends M12.21's conversion for the entry chosen, after a
// question in a dialog, and moves on only when it succeeds; a refusal shows in
// the dialog and nothing moves.

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const graphqlRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const entries = [
  {
    title: 'Fixture One',
    href: '/compendium/ingredients/fixture-one' as Route,
    id: 'c-1',
    thenHref: '/coven/fixture-coven/ingredients/c-1' as Route,
  },
  {
    title: 'Fixture Two',
    href: '/compendium/ingredients/fixture-two' as Route,
    id: 'c-2',
    thenHref: '/coven/fixture-coven/ingredients/c-2' as Route,
  },
];

const show = () =>
  render(
    <>
      <h3 id="similar-heading">Similar in the Compendium</h3>
      <LinkToCompendium
        workspaceId="w-1"
        localId="l-1"
        name="Fixture Own"
        entries={entries}
        labelledBy="similar-heading"
      />
    </>,
  );
const link = () => screen.getByRole('button', { name: 'Link to Selected' });
const choose = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
const dialog = () => screen.getByRole('dialog');

beforeEach(() => vi.clearAllMocks());

describe('LinkToCompendium', () => {
  it("names the compendium page an Open link leads to, so that page's frame is drawn while it loads", async () => {
    let target: unknown;
    function Probe() {
      const state = useNavigationState();
      useEffect(() => {
        target = state.target;
      });
      return null;
    }
    let arrive = () => {};
    const arrives = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    render(
      <Navigating push={router.push} arrives={arrives}>
        <h3 id="similar-heading">Similar in the Compendium</h3>
        <LinkToCompendium
          workspaceId="w-1"
          localId="l-1"
          name="Fixture Own"
          entries={entries}
          labelledBy="similar-heading"
        />
        <Probe />
      </Navigating>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Open Fixture One' }), { button: 0 });
    });

    expect(router.push.mock.calls[0]?.[0]).toBe(entries[0].href);
    expect(target).toEqual({ region: 'main', shape: 'page', frame: 'entry', head: 'eyebrow' });
    await act(async () => arrive());
  });

  it('offers one radio for each entry beside its link, and Link to Selected only once one is chosen', () => {
    show();

    const group = screen.getByRole('radiogroup', { name: 'Similar in the Compendium' });
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
    expect(within(group).getAllByRole('link')).toHaveLength(2);
    expect(link()).toBeDisabled();

    choose('Fixture Two');

    expect(screen.getByRole('radio', { name: 'Fixture Two' })).toBeChecked();
    expect(link()).toBeEnabled();
  });

  it('chooses an entry when its name is pressed, and opens it only from the separate Open link', () => {
    show();

    fireEvent.click(screen.getByText('Fixture One'));

    expect(screen.getByRole('radio', { name: 'Fixture One' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Fixture Two' })).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'Open Fixture One' })).toHaveAttribute(
      'href',
      entries[0].href,
    );
    expect(
      screen.getByRole('radio', { name: 'Fixture One' }).closest('label'),
    ).not.toContainElement(screen.getByRole('link', { name: 'Open Fixture One' }));
  });

  it('asks in a dialog, and Cancel closes it without sending anything', () => {
    show();
    choose('Fixture One');

    fireEvent.click(link());
    expect(dialog()).toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));

    expect(graphqlRequest).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('sends the three ids of the chosen entry and goes to it in the coven, busy meanwhile', async () => {
    let done: (value: unknown) => void = () => {};
    graphqlRequest.mockReturnValue(new Promise((resolve) => (done = resolve)));
    show();
    choose('Fixture Two');
    fireEvent.click(link());

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Link' }));

    expect(within(dialog()).getByRole('button', { busy: true })).toBeDisabled();
    expect(graphqlRequest.mock.calls[0]?.[1]).toEqual({
      workspaceId: 'w-1',
      localId: 'l-1',
      compendiumId: 'c-2',
    });
    expect(router.push).not.toHaveBeenCalled();

    done({});
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(entries[1]?.thenHref));
  });

  it('says the refusal in the dialog, stays put, and can be pressed again', async () => {
    graphqlRequest.mockRejectedValue(
      new GraphQLClientError({
        status: 200,
        errors: [
          {
            message: 'Invalid input',
            extensions: {
              code: 'VALIDATION',
              fieldErrors: [
                { path: ['forms'], message: 'The compendium entry has no Fixture form' },
              ],
            },
          },
        ],
      }),
    );
    show();
    choose('Fixture One');
    fireEvent.click(link());

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Link' }));

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('no Fixture form');
    expect(router.push).not.toHaveBeenCalled();
    expect(within(dialog()).getByRole('button', { name: 'Link' })).toBeEnabled();
  });
});
