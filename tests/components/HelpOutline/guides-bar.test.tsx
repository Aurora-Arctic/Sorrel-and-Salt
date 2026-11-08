import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  HelpOutlineAudience,
  HelpOutlineGuide,
  HelpOutlineOrderGuide,
  HelpOutlineOther,
} from '@/components/HelpOutline/types';
import { HttpResponse } from 'msw/http';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { moveByKeyboard } from '../../support/sortable';

// The keepers' Guides bar: the guides under their audience, Public, then Staff, then Keeper, once each, and Reorder
// Mode, where every live guide is a row to move among its own audience's and Save Order writes the whole order once
// (claude-docs/components/help-outline.md).

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  usePathname: () => '/keepers/help',
  useSearchParams: () => new URLSearchParams(),
}));

const { default: HelpGuidesBar } = await import('@/components/HelpOutline/guides-bar');

const entry = (
  id: string,
  title: string,
  audience: HelpOutlineAudience,
  shown = true,
): HelpOutlineOrderGuide => ({ id, title, audience, shown });

// Every live guide in order: three public ones, the middle one hidden and left out of the bar by the filter, then a
// staff one.
const ORDER = [
  entry('g1', 'Testwort Basics', 'public'),
  entry('g2', 'Testwort Shy Guide', 'public', false),
  entry('g3', 'Testwort Roots', 'public'),
  entry('g4', 'Testwort Queue Notes', 'staff'),
];

const guide = (at: number): HelpOutlineGuide => ({
  ...ORDER[at],
  kind: 'article',
  position: at + 1,
  editHref: `/keepers/help/${ORDER[at].id}` as Route,
  subPages: 2,
  href: `/keepers/help?guide=${ORDER[at].id}` as Route,
  current: at === 0,
});

const GUIDES = [guide(0), guide(2), guide(3)];
const OTHERS: HelpOutlineOther[] = [
  { label: 'FAQ', count: 4, href: '/keepers/help?view=faq' as Route, current: false },
  { label: 'Glossary', count: 7, href: '/keepers/help?view=glossary' as Route, current: false },
];

/** Rows a sortable list lays out 40px apart, as happy-dom lays nothing out. */
function layOutBarRows() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('help-outline__reorder')) {
      return new DOMRect(0, 0, 260, this.children.length * 40);
    }
    const row = this.closest('.help-outline__reorder-row');
    if (!row?.parentElement) return new DOMRect(0, 0, 0, 0);
    const at = Array.prototype.indexOf.call(row.parentElement.children, row);
    return new DOMRect(0, at * 40, 260, 32);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  refresh.mockClear();
});

const bar = (guides = GUIDES, order = ORDER) =>
  render(<HelpGuidesBar guides={guides} order={order} others={OTHERS} />);

const nav = () => within(screen.getByRole('navigation', { name: 'Help Outline' }));
const grips = () => nav().getAllByRole('button', { name: /^Move / });
const gripNames = () => grips().map((grip) => grip.getAttribute('aria-label'));
const reorder = () => fireEvent.click(nav().getByRole('button', { name: 'Reorder' }));
const saveOrder = () => nav().getByRole('button', { name: /Save Order|Saving Order/ });
const audienceLists = () => nav().getAllByRole('list', { name: /^(Public|Staff|Keeper)$/ });
const gripsIn = (list: HTMLElement) =>
  within(list)
    .getAllByRole('button', { name: /^Move / })
    .map((grip) => grip.getAttribute('aria-label'));

describe('HelpGuidesBar at rest', () => {
  it('lists the guides in order under a heading for each audience', () => {
    bar();

    const runs = audienceLists();
    expect(runs).toHaveLength(2);
    expect(runs[0]).toHaveAccessibleName('Public');
    expect(runs[1]).toHaveAccessibleName('Staff');
    const titles = runs.map((run) =>
      within(run)
        .getAllByRole('link')
        .map((link) => link.textContent),
    );
    expect(titles).toEqual([['Testwort Basics', 'Testwort Roots'], ['Testwort Queue Notes']]);
  });

  it('names each audience once, Public, then Staff, then Keeper, whatever order the guides come in', () => {
    const keeper: HelpOutlineGuide = {
      ...guide(0),
      id: 'k1',
      title: 'Testwort Ledger',
      audience: 'keeper',
      current: false,
    };
    bar(
      [keeper, guide(3), guide(0)],
      [ORDER[0], ORDER[3], entry('k1', 'Testwort Ledger', 'keeper')],
    );

    const runs = audienceLists();
    expect(runs).toHaveLength(3);
    expect(runs.map((run) => within(run).getByRole('link').textContent)).toEqual([
      'Testwort Basics',
      'Testwort Queue Notes',
      'Testwort Ledger',
    ]);
    expect(runs[2]).toHaveAccessibleName('Keeper');
  });

  it('carries no position, count or audience badge on a guide’s link', () => {
    bar();

    for (const link of nav().getAllByRole('link', { name: /Testwort/ })) {
      expect(link).not.toHaveTextContent(/\d/);
      expect(link.querySelector('.badge')).toBeNull();
    }
  });

  it('names a hidden guide’s eye in its link, and marks no shown guide', () => {
    const hidden = { ...guide(1) };
    bar([guide(0), hidden]);

    expect(nav().getByRole('link', { name: 'Testwort Shy Guide Hidden' })).toBeTruthy();
    expect(
      within(nav().getByRole('link', { name: 'Testwort Basics' })).queryByRole('img'),
    ).toBeNull();
  });

  it('lists the FAQ and the glossary apart from every audience’s run', () => {
    bar();

    const faq = nav().getByRole('link', { name: 'FAQ' });
    const glossary = nav().getByRole('link', { name: 'Glossary' });
    for (const run of nav().getAllByRole('list', { name: /^(Public|Staff|Keeper)$/ })) {
      expect(run.contains(faq)).toBe(false);
      expect(run.contains(glossary)).toBe(false);
    }
  });

  it('offers no reordering while there is one guide or none', () => {
    bar([guide(0)], [ORDER[0]]);

    expect(nav().queryByRole('button', { name: 'Reorder' })).toBeNull();
  });
});

describe('HelpGuidesBar in Reorder Mode', () => {
  it('lists every live guide to move under its audience, the ones the filter leaves out among them, with no links', () => {
    bar();

    reorder();

    const [publicGuides, staffGuides] = audienceLists();
    expect(publicGuides).toHaveAccessibleName('Public');
    expect(gripsIn(publicGuides)).toEqual([
      'Move Testwort Basics',
      'Move Testwort Shy Guide',
      'Move Testwort Roots',
    ]);
    expect(staffGuides).toHaveAccessibleName('Staff');
    expect(gripsIn(staffGuides)).toEqual(['Move Testwort Queue Notes']);
    expect(nav().queryByRole('link', { name: /Testwort/ })).toBeNull();
    expect(nav().queryByRole('link', { name: 'FAQ' })).toBeNull();
    expect(saveOrder()).toBeDisabled();
    expect(document.activeElement).toBe(grips()[0]);
  });

  it('shows each row’s place in the whole order in the mode', () => {
    bar();
    reorder();

    expect(grips()[2].closest('li')).toHaveTextContent(/^3\./);
    expect(grips()[3].closest('li')).toHaveTextContent(/^4\./);
  });

  it('moves a guide by keyboard only among its own audience’s guides', async () => {
    layOutBarRows();
    bar();
    reorder();

    await moveByKeyboard(grips()[2], 'ArrowDown');
    expect(gripsIn(audienceLists()[0])[2]).toBe('Move Testwort Roots');
    expect(saveOrder()).toBeDisabled();

    await moveByKeyboard(grips()[0], 'End');
    expect(gripsIn(audienceLists()[0])).toEqual([
      'Move Testwort Shy Guide',
      'Move Testwort Roots',
      'Move Testwort Basics',
    ]);
    expect(gripsIn(audienceLists()[1])).toEqual(['Move Testwort Queue Notes']);
  });

  it('saves the moved order in one write, then leaves the mode and refreshes', async () => {
    layOutBarRows();
    const sent: string[][] = [];
    mockGraphQLMutation('OrderHelpGuides', (variables: { ids: string[] }) => {
      sent.push(variables.ids);
      return { orderHelpGuides: variables.ids.map((id) => ({ id })) };
    });
    bar();
    reorder();

    await moveByKeyboard(grips()[0], 'ArrowDown');
    expect(gripNames()[1]).toBe('Move Testwort Basics');
    expect(saveOrder()).toBeEnabled();
    fireEvent.click(saveOrder());

    await waitFor(() => expect(nav().queryByRole('button', { name: /^Move / })).toBeNull());
    expect(sent).toEqual([['g2', 'g1', 'g3', 'g4']]);
    expect(refresh).toHaveBeenCalled();
    expect(document.activeElement).toBe(nav().getByRole('button', { name: 'Reorder' }));
  });

  it('shows Saving Order and holds the rows while the write runs', async () => {
    layOutBarRows();
    let finish: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      finish = resolve;
    });
    server.use(
      graphqlLink.mutation('OrderHelpGuides', async ({ variables }) => {
        await held;
        return HttpResponse.json({
          data: { orderHelpGuides: (variables.ids as string[]).map((id) => ({ id })) },
        });
      }),
    );
    bar();
    reorder();
    await moveByKeyboard(grips()[0], 'ArrowDown');

    fireEvent.click(saveOrder());

    expect(saveOrder()).toHaveAttribute('aria-busy', 'true');
    expect(saveOrder()).toHaveAccessibleName('Saving Order');
    for (const list of audienceLists()) expect(list).toHaveAttribute('aria-busy', 'true');
    for (const grip of grips()) expect(grip).toBeDisabled();
    await act(async () => finish());
  });

  it('puts the saved order back on Cancel, writing nothing', async () => {
    layOutBarRows();
    bar();
    reorder();
    await moveByKeyboard(grips()[0], 'ArrowDown');

    fireEvent.click(nav().getByRole('button', { name: 'Cancel' }));

    expect(nav().queryByRole('button', { name: /^Move / })).toBeNull();
    reorder();
    expect(gripNames()[0]).toBe('Move Testwort Basics');
    expect(saveOrder()).toBeDisabled();
  });

  it('keeps the keeper’s order on a failed save, and sends it again on Try Again', async () => {
    layOutBarRows();
    mockGraphQLError('OrderHelpGuides', { code: 'VALIDATION', message: 'The list has changed' });
    bar();
    reorder();
    await moveByKeyboard(grips()[0], 'ArrowDown');

    fireEvent.click(saveOrder());

    const alert = await nav().findByRole('alert');
    expect(gripNames()[1]).toBe('Move Testwort Basics');
    expect(saveOrder()).toBeEnabled();

    const sent: string[][] = [];
    mockGraphQLMutation('OrderHelpGuides', (variables: { ids: string[] }) => {
      sent.push(variables.ids);
      return { orderHelpGuides: variables.ids.map((id) => ({ id })) };
    });
    fireEvent.click(within(alert).getByRole('button', { name: 'Try Again' }));

    await waitFor(() => expect(sent).toEqual([['g2', 'g1', 'g3', 'g4']]));
    await waitFor(() => expect(nav().queryByRole('alert')).toBeNull());
  });
});
