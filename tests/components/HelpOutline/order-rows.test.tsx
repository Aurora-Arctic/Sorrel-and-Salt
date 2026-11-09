import { render } from '@testing-library/react';
import type { Route } from 'next';
import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import HelpOutline from '@/components/HelpOutline';
import type { HelpOrderRow } from '@/components/HelpOutline/types';
import type { HelpOutlineChosen, HelpOutlineSubPage } from '@/components/HelpOutline/types';

// The order table's cells are built on the server and cross to the client as one array per row, so React checks their
// keys there: every element in a row's cells must carry one, or the page logs "Each child in a list should have a
// unique key".

const handed = vi.hoisted(() => ({ rows: [] as HelpOrderRow[][] }));

vi.mock('@/components/HelpOutline/order-table', () => ({
  default: ({ rows }: { rows: HelpOrderRow[] }) => {
    handed.rows.push(rows);
    return null;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/keepers/help',
  useSearchParams: () => new URLSearchParams(),
}));

const sub = (
  id: string,
  title: string,
  index: number,
  audience: HelpOutlineSubPage['audience'],
): HelpOutlineSubPage => ({
  id,
  title,
  kind: 'article',
  audience,
  position: index + 1,
  shown: true,
  editHref: `/keepers/help/${id}` as Route,
  index,
});

const SUB_PAGES = [
  sub('s1', 'Testwort Kindling', 0, 'public'),
  sub('s2', 'Testwort Embers', 1, 'staff'),
];

const CHOSEN: HelpOutlineChosen = {
  ...sub('g1', 'Testwort Basics', 0, 'public'),
  kind: 'guide',
  address: '/help/testwort-basics',
  place: 1,
  of: 1,
  subPages: SUB_PAGES,
  order: ['s1', 's2'],
  addSubPageHref: '/keepers/help/new?parent=g1' as Route,
};

const unkeyed = (cells: readonly ReactNode[]) =>
  cells.filter((cell) => isValidElement(cell) && cell.key === null);

describe('HelpOutline order rows', () => {
  it.each([
    ['a guide’s sub pages', { kind: 'guide', guide: CHOSEN } as const],
    ['the FAQ', { kind: 'faq', rows: SUB_PAGES, order: ['s1', 's2'] } as const],
  ])('keys every cell element of %s', (_, pane) => {
    handed.rows = [];
    render(
      <HelpOutline
        filter={{ query: '', kind: '', audience: '', shown: 'shown' }}
        guides={[]}
        others={[]}
        order={[]}
        pane={pane}
      />,
    );

    // Precondition: the table was handed both rows, each with its three cells, so there were elements to key.
    const rows: HelpOrderRow[] = handed.rows[handed.rows.length - 1] ?? [];
    expect(rows.map((row) => row.cells.length)).toEqual([3, 3]);
    expect(rows.flatMap((row) => unkeyed(row.cells))).toEqual([]);
  });
});
