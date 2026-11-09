import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw/http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HelpOrderList, HelpOrderRow } from '@/components/HelpOutline/types';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { moveByKeyboard } from '../../support/sortable';

// The outline's sortable tables, a guide's sub pages and the FAQ: a grip on every row, and a drop saved at once in the
// whole order, the rows the filter leaves out among it (claude-docs/components/help-outline.md, "Ordering").

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  usePathname: () => '/keepers/help',
  useSearchParams: () => new URLSearchParams(),
}));

const { default: HelpOrderTable } = await import('@/components/HelpOutline/order-table');

// The whole order is s1, s2, s3, s4; the filter leaves s2 out, so the table shows three rows.
const ORDER = ['s1', 's2', 's3', 's4'];
const TITLES: Record<string, string> = {
  s1: 'Testwort Opening',
  s2: 'Testwort Left Out',
  s3: 'Testwort Middle',
  s4: 'Testwort Closing',
};
const row = (id: string): HelpOrderRow => ({
  id,
  title: TITLES[id],
  index: ORDER.indexOf(id),
  cells: [<span key="title">{TITLES[id]}</span>, <span key="audience">Public</span>],
});
const ROWS = [row('s1'), row('s3'), row('s4')];

/** Rows laid out 40px apart, as happy-dom lays nothing out. */
function layOutTableRows() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.tagName === 'TBODY') return new DOMRect(0, 0, 600, this.children.length * 40);
    const tr = this.closest('tbody > tr');
    if (!tr?.parentElement) return new DOMRect(0, 0, 0, 0);
    const at = Array.prototype.indexOf.call(tr.parentElement.children, tr);
    return new DOMRect(0, at * 40, 600, 32);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  refresh.mockClear();
});

const table = (list: HelpOrderList = { kind: 'subPages', guideId: 'g1' }, rows = ROWS) =>
  render(
    <HelpOrderTable
      aria-label="Sub Pages of Testwort Basics"
      list={list}
      order={ORDER}
      columns={[{ heading: 'Sub Page', rowHeader: true }, { heading: 'Audience' }]}
      rows={rows}
      empty="Testwort Basics has no sub pages."
    />,
  );

const grid = () => within(screen.getByRole('table', { name: /Sub Pages|FAQ/ }));
const grips = () => grid().getAllByRole('button', { name: /^Move / });
const gripNames = () => grips().map((grip) => grip.getAttribute('aria-label'));
const positionOf = (title: string) =>
  within(grid().getByRole('rowheader', { name: title }).closest('tr') as HTMLElement).getAllByRole(
    'cell',
  )[1];

describe('HelpOrderTable', () => {
  it('puts a grip in the first column of every row, under a heading named Order, with each row’s place in the whole order', () => {
    table();

    const headings = grid().getAllByRole('columnheader');
    expect(headings[0]).toHaveAccessibleName('Order');
    expect(headings[1]).toHaveAccessibleName('Position');
    expect(gripNames()).toEqual([
      'Move Testwort Opening',
      'Move Testwort Middle',
      'Move Testwort Closing',
    ]);
    expect(positionOf('Testwort Middle')).toHaveTextContent('3');
    expect(grid().queryByRole('button', { name: /Move Up|Move Down/ })).toBeNull();
  });

  it('saves a sub page’s drop at once as the guide’s whole order, the left-out sub page kept in its place', async () => {
    layOutTableRows();
    const sent: unknown[] = [];
    mockGraphQLMutation(
      'OrderHelpSubPages',
      (variables: { id: string; input: { childIds: string[] } }) => {
        sent.push(variables);
        return { updateHelpArticle: { id: variables.id } };
      },
    );
    table();

    await moveByKeyboard(grips()[0], 'ArrowDown');

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ id: 'g1', input: { childIds: ['s2', 's3', 's1', 's4'] } });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(gripNames()).toEqual([
      'Move Testwort Middle',
      'Move Testwort Opening',
      'Move Testwort Closing',
    ]);
  });

  it('saves an FAQ drop through the FAQ’s own write, listing every entry', async () => {
    layOutTableRows();
    const sent: string[][] = [];
    mockGraphQLMutation('OrderHelpFaq', (variables: { ids: string[] }) => {
      sent.push(variables.ids);
      return { orderHelpFaq: variables.ids.map((id) => ({ id })) };
    });
    table({ kind: 'faq' });

    await moveByKeyboard(grips()[2], 'ArrowUp');

    await waitFor(() => expect(sent).toEqual([['s1', 's2', 's4', 's3']]));
  });

  it('marks the moved row’s Position busy and holds every grip while the write runs', async () => {
    layOutTableRows();
    let finish: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      finish = resolve;
    });
    server.use(
      graphqlLink.mutation('OrderHelpSubPages', async ({ variables }) => {
        await held;
        return HttpResponse.json({ data: { updateHelpArticle: { id: variables.id } } });
      }),
    );
    table();

    await moveByKeyboard(grips()[0], 'ArrowDown');

    await waitFor(() =>
      expect(positionOf('Testwort Opening')).toHaveAttribute('aria-busy', 'true'),
    );
    expect(positionOf('Testwort Middle')).not.toHaveAttribute('aria-busy');
    for (const grip of grips()) expect(grip).toBeDisabled();
    await act(async () => finish());
  });

  it('springs the row back on a failed save, and sends the same move again on Try Again', async () => {
    layOutTableRows();
    mockGraphQLError('OrderHelpSubPages', { code: 'VALIDATION', message: 'The list has changed' });
    table();

    await moveByKeyboard(grips()[0], 'ArrowDown');

    const alert = await screen.findByRole('alert');
    expect(gripNames()[0]).toBe('Move Testwort Opening');
    expect(refresh).not.toHaveBeenCalled();

    const sent: string[][] = [];
    mockGraphQLMutation(
      'OrderHelpSubPages',
      (variables: { id: string; input: { childIds: string[] } }) => {
        sent.push(variables.input.childIds);
        return { updateHelpArticle: { id: variables.id } };
      },
    );
    fireEvent.click(within(alert).getByRole('button', { name: 'Try Again' }));

    await waitFor(() => expect(sent).toEqual([['s2', 's3', 's1', 's4']]));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(gripNames()[1]).toBe('Move Testwort Opening');
  });

  it('says the list is empty, with no table, when no row is left to show', () => {
    table(undefined, []);

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Testwort Basics has no sub pages.')).toBeTruthy();
  });
});
