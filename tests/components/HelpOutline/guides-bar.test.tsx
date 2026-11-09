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
// Mode, where every live guide is a row to move among its own audience's and each move saves as it happens
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
  kind: 'guide',
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
    const bare = (text: string | null) => (text ?? '').replace(/ \d+ Sub Pages?$/, '');
    const titles = runs.map((run) =>
      within(run)
        .getAllByRole('link')
        .map((link) => bare(link.textContent)),
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
    const bare = (text: string | null) => (text ?? '').replace(/ \d+ Sub Pages?$/, '');
    expect(runs.map((run) => bare(within(run).getByRole('link').textContent))).toEqual([
      'Testwort Basics',
      'Testwort Queue Notes',
      'Testwort Ledger',
    ]);
    expect(runs[2]).toHaveAccessibleName('Keeper');
  });

  it('counts a guide’s sub pages in its link, and a guide with none shows no count', () => {
    bar([guide(0), { ...guide(2), subPages: 1 }, { ...guide(3), subPages: 0 }]);

    expect(nav().getByRole('link', { name: 'Testwort Basics 2 Sub Pages' })).toBeTruthy();
    expect(nav().getByRole('link', { name: 'Testwort Roots 1 Sub Page' })).toBeTruthy();
    expect(nav().getByRole('link', { name: /^Testwort Queue Notes/ })).toBeTruthy();
  });

  it('names a hidden guide’s eye in its link, and marks no shown guide', () => {
    const hidden = { ...guide(1) };
    bar([guide(0), hidden]);

    expect(nav().getByRole('link', { name: 'Testwort Shy Guide Hidden 2 Sub Pages' })).toBeTruthy();
    expect(
      within(nav().getByRole('link', { name: /^Testwort Basics/ })).queryByRole('img'),
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

  it('lists the FAQ and the glossary in a list named Reference, ahead of the Guides heading', () => {
    bar();

    const reference = nav().getByRole('list', { name: 'Reference' });
    expect(within(reference).getByRole('link', { name: 'FAQ' })).toBeTruthy();
    expect(within(reference).getByRole('link', { name: 'Glossary' })).toBeTruthy();
    expect(
      reference.compareDocumentPosition(nav().getByText('Guides')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps the Reference list, with its two links, once Reorder is pressed', () => {
    bar();
    reorder();

    const reference = nav().getByRole('list', { name: 'Reference' });
    expect(within(reference).getByRole('link', { name: 'FAQ' })).toBeTruthy();
    expect(within(reference).getByRole('link', { name: 'Glossary' })).toBeTruthy();
    expect(within(reference).queryByRole('button', { name: /^Move / })).toBeNull();
  });

  it('offers no reordering while there is one guide or none', () => {
    bar([guide(0)], [ORDER[0]]);

    expect(nav().queryByRole('button', { name: 'Reorder' })).toBeNull();
  });
});

describe('HelpGuidesBar in Reorder Mode', () => {
  const sentOrders = () => {
    const sent: string[][] = [];
    mockGraphQLMutation('OrderHelpGuides', (variables: { ids: string[] }) => {
      sent.push(variables.ids);
      return { orderHelpGuides: variables.ids.map((id) => ({ id })) };
    });
    return sent;
  };

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
    expect(document.activeElement).toBe(grips()[0]);
  });

  it('offers no Save Order or Cancel, since each move saves as it happens', () => {
    bar();

    reorder();

    expect(nav().queryByRole('button', { name: /Save Order|Saving Order/ })).toBeNull();
    expect(nav().queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(nav().queryByText('The order is not saved yet.')).toBeNull();
  });

  it('keeps the Reorder button in its slot, pressed, and leaves the mode when it is pressed again', () => {
    bar();
    const button = nav().getByRole('button', { name: 'Reorder' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);

    const pressed = nav().getByRole('button', { name: 'Reorder' });
    expect(pressed).toBe(button);
    expect(pressed).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(pressed);

    expect(nav().queryByRole('button', { name: /^Move / })).toBeNull();
    expect(nav().getByRole('link', { name: /^Testwort Basics/ })).toBeTruthy();
    expect(nav().getByRole('button', { name: 'Reorder' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('numbers each audience’s rows from 1, before and after a move, and sends the whole order', async () => {
    layOutBarRows();
    const sent = sentOrders();
    bar();
    reorder();

    const places = (list: HTMLElement) =>
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.textContent?.match(/^\d+\./)?.[0]);
    expect(places(audienceLists()[0])).toEqual(['1.', '2.', '3.']);
    expect(places(audienceLists()[1])).toEqual(['1.']);

    await moveByKeyboard(grips()[2], 'Home');
    await waitFor(() => expect(sent).toEqual([['g3', 'g1', 'g2', 'g4']]));
    expect(gripsIn(audienceLists()[0])[0]).toBe('Move Testwort Roots');
    expect(places(audienceLists()[0])).toEqual(['1.', '2.', '3.']);
    expect(places(audienceLists()[1])).toEqual(['1.']);
  });

  it('moves a guide by keyboard only among its own audience’s guides, saving a move and not a drop in place', async () => {
    layOutBarRows();
    const sent = sentOrders();
    bar();
    reorder();

    await moveByKeyboard(grips()[2], 'ArrowDown');
    expect(gripsIn(audienceLists()[0])[2]).toBe('Move Testwort Roots');
    expect(sent).toEqual([]);

    await moveByKeyboard(grips()[0], 'End');
    expect(gripsIn(audienceLists()[0])).toEqual([
      'Move Testwort Shy Guide',
      'Move Testwort Roots',
      'Move Testwort Basics',
    ]);
    expect(gripsIn(audienceLists()[1])).toEqual(['Move Testwort Queue Notes']);
    await waitFor(() => expect(sent).toEqual([['g2', 'g3', 'g1', 'g4']]));
  });

  it('saves a move with no Save press, stays in the mode, announces it and refreshes', async () => {
    layOutBarRows();
    const sent = sentOrders();
    bar();
    reorder();

    await moveByKeyboard(grips()[0], 'ArrowDown');

    await waitFor(() => expect(sent).toEqual([['g2', 'g1', 'g3', 'g4']]));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(gripNames()[1]).toBe('Move Testwort Basics');
    expect(nav().getByRole('button', { name: 'Reorder' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the moved row busy and holds every grip while the write runs', async () => {
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

    await waitFor(() => {
      for (const list of audienceLists()) expect(list).toHaveAttribute('aria-busy', 'true');
    });
    for (const grip of grips()) expect(grip).toBeDisabled();
    const moved = within(audienceLists()[0])
      .getAllByRole('listitem')
      .find((row) => row.querySelector('[aria-busy="true"]'));
    expect(moved).toBeTruthy();
    await act(async () => finish());
    await waitFor(() => expect(audienceLists()[0]).not.toHaveAttribute('aria-busy'));
    for (const grip of grips()) expect(grip).toBeEnabled();
  });

  it('leaves the mode on Escape, keeping what was saved', async () => {
    layOutBarRows();
    sentOrders();
    bar();
    reorder();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(nav().queryByRole('button', { name: /^Move / })).toBeNull();
    expect(nav().getByRole('button', { name: 'Reorder' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the mode when Escape puts down a guide mid-drag', async () => {
    layOutBarRows();
    bar();
    reorder();
    const grip = grips()[0];
    grip.focus();
    await act(async () => {
      fireEvent.keyDown(grip, { key: ' ', code: 'Space' });
    });
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? grip, { key: 'Escape', code: 'Escape' });
    });

    expect(grips()).toHaveLength(4);
  });

  it('puts the previous order back on a failed save, says so, and sends the move again on Try Again', async () => {
    layOutBarRows();
    mockGraphQLError('OrderHelpGuides', { code: 'VALIDATION', message: 'The list has changed' });
    bar();
    reorder();

    await moveByKeyboard(grips()[0], 'ArrowDown');

    const alert = await nav().findByRole('alert');
    expect(gripNames()[0]).toBe('Move Testwort Basics');
    expect(gripNames()[1]).toBe('Move Testwort Shy Guide');
    for (const grip of grips()) expect(grip).toBeEnabled();

    const sent = sentOrders();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try Again' }));

    await waitFor(() => expect(sent).toEqual([['g2', 'g1', 'g3', 'g4']]));
    await waitFor(() => expect(nav().queryByRole('alert')).toBeNull());
    expect(gripNames()[0]).toBe('Move Testwort Shy Guide');
  });
});
