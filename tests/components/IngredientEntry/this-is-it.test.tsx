import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThisIsIt from '@/components/IngredientEntry/this-is-it';
import { GraphQLClientError } from '@/lib/graphql-client-error';

// This Is It sends M12.21's conversion and moves on only when it succeeds;
// a refusal shows beside the entry, with the button usable again.

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const graphqlRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const THEN = '/coven/fixture-coven/ingredients/c-1' as Route;
const press = () =>
  render(
    <ThisIsIt workspaceId="w-1" localId="l-1" compendiumId="c-1" thenHref={THEN} name="Fixture" />,
  );

beforeEach(() => vi.clearAllMocks());

describe('ThisIsIt', () => {
  it('sends the three ids and goes to the entry in the coven, busy and disabled meanwhile', async () => {
    let done: (value: unknown) => void = () => {};
    graphqlRequest.mockReturnValue(new Promise((resolve) => (done = resolve)));
    press();

    fireEvent.click(screen.getByRole('button', { name: /This Is It/ }));

    const busy = screen.getByRole('button', { busy: true });
    expect(busy).toBeDisabled();
    expect(graphqlRequest.mock.calls[0]?.[1]).toEqual({
      workspaceId: 'w-1',
      localId: 'l-1',
      compendiumId: 'c-1',
    });
    expect(router.push).not.toHaveBeenCalled();

    done({});
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(THEN));
  });

  it('says the refusal beside the entry, stays put, and can be pressed again', async () => {
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
    press();

    fireEvent.click(screen.getByRole('button', { name: /This Is It/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('no Fixture form');
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /This Is It/ })).toBeEnabled();
  });
});
