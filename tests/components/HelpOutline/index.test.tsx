import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import HelpOutline from '@/components/HelpOutline';
import type { HelpOutlineChosen, HelpOutlineGuide } from '@/components/HelpOutline/types';

// The keeper help outline's guides: the count of a guide's sub pages in the chosen guide's facts, and none at all for a
// guide that holds none; the Guides bar and the phone's Guide select carry no count (claude-docs/components/help-outline.md).

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/keepers/help',
  useSearchParams: () => new URLSearchParams(),
}));

const guide = (
  id: string,
  title: string,
  position: number,
  subPages: number,
): HelpOutlineGuide => ({
  id,
  title,
  kind: 'guide',
  audience: 'public',
  position,
  shown: true,
  editHref: `/keepers/help/${id}` as Route,
  subPages,
  href: `/keepers/help?guide=${id}` as Route,
  current: id === 'empty',
});

const GUIDES = [guide('empty', 'Testwort Basics', 1, 0), guide('full', 'Testwort Roots', 2, 3)];

const CHOSEN: HelpOutlineChosen = {
  ...GUIDES[0],
  address: '/help/testwort-basics',
  place: 1,
  of: 2,
  subPages: [],
  order: [],
  addSubPageHref: '/keepers/help/new?parent=empty' as Route,
};

const outline = (chosen: HelpOutlineChosen = CHOSEN) =>
  render(
    <HelpOutline
      filter={{ query: '', kind: '', audience: '', shown: 'shown' }}
      guides={GUIDES}
      others={[]}
      order={GUIDES.map(({ id, title, audience, shown }) => ({ id, title, audience, shown }))}
      pane={{ kind: 'guide', guide: chosen }}
    />,
  );

const guideLink = (title: string) =>
  within(screen.getByRole('navigation', { name: 'Help Outline' })).getByRole('link', {
    name: new RegExp(title),
  });

describe('HelpOutline sub page counts', () => {
  it('counts a guide’s sub pages at the end of its link in the Guides list, and a guide with none shows no count', () => {
    outline();

    expect(guideLink('Testwort Roots')).toHaveAccessibleName('Testwort Roots 3 Sub Pages');
    expect(guideLink('Testwort Basics')).toHaveAccessibleName('Testwort Basics');
  });

  it('lists the phone’s Guide choices by title under their audience, with no count', () => {
    outline();

    fireEvent.click(screen.getByRole('combobox', { name: 'Guide' }));
    const choices = within(screen.getByRole('listbox', { name: 'Guide choices' }));

    const publicGuides = within(choices.getByRole('group', { name: 'Public' }));
    expect(publicGuides.getByRole('option', { name: 'Testwort Roots' })).toBeTruthy();
    expect(publicGuides.getByRole('option', { name: 'Testwort Basics' })).toBeTruthy();
  });

  it('leaves the count out of an empty guide’s facts', () => {
    outline();

    const facts = screen.getByText('Position 1 of 2').parentElement;
    expect(facts).not.toBeNull();
    expect(facts).not.toHaveTextContent(/Sub Page/);
  });
});

describe('HelpOutline guide pane', () => {
  it('hands a keeper the chosen guide’s editor as the Edit Guide link', () => {
    outline();

    expect(screen.getByRole('link', { name: 'Edit Guide' })).toHaveAttribute(
      'href',
      '/keepers/help/empty',
    );
  });
});

describe('HelpOutline top-level article pane', () => {
  it('offers an article no sub pages, as only a guide holds them', () => {
    outline();
    // Precondition: a guide's pane offers its sub pages and Add Sub Page.
    expect(screen.getByRole('link', { name: 'Add Sub Page' })).toBeInTheDocument();
    expect(screen.getByText('Testwort Basics has no sub pages.')).toBeInTheDocument();
    cleanup();

    outline({ ...CHOSEN, kind: 'article' });

    expect(screen.queryByRole('link', { name: 'Add Sub Page' })).toBeNull();
    expect(screen.queryByText('Testwort Basics has no sub pages.')).toBeNull();
    expect(screen.getByRole('link', { name: 'Edit Article' })).toHaveAttribute(
      'href',
      '/keepers/help/empty',
    );
  });
});

describe('HelpOutline audience column', () => {
  it('names a Public row’s audience in its row, as it does a Staff row’s', () => {
    const term = (id: string, title: string, audience: 'public' | 'staff') => ({
      ...GUIDES[0],
      id,
      title,
      kind: 'term' as const,
      audience,
      guideTitle: null,
    });
    render(
      <HelpOutline
        filter={{ query: '', kind: '', audience: '', shown: 'shown' }}
        guides={GUIDES}
        others={[]}
        order={[]}
        pane={{
          kind: 'search',
          rows: [term('a', 'Testwort Open', 'public'), term('b', 'Testwort Closed', 'staff')],
        }}
      />,
    );

    const open = screen.getByRole('row', { name: /Testwort Open/ });
    expect(within(open).getByText('Public')).toBeTruthy();
    const closed = screen.getByRole('row', { name: /Testwort Closed/ });
    expect(within(closed).getByText('Staff')).toBeTruthy();
    expect(within(closed).queryByText('Public')).toBeNull();
  });
});

describe('HelpOutline FAQ and glossary panes', () => {
  const view = (pane: ComponentProps<typeof HelpOutline>['pane']) =>
    render(
      <HelpOutline
        filter={{ query: '', kind: '', audience: '', shown: 'shown' }}
        guides={GUIDES}
        others={[]}
        order={GUIDES.map(({ id, title, audience, shown }) => ({ id, title, audience, shown }))}
        pane={pane}
      />,
    );

  it('links the FAQ’s reader page under its title', () => {
    view({ kind: 'faq', rows: [], order: [], address: '/help#faq' });

    expect(screen.getByRole('link', { name: '/help#faq' })).toHaveAttribute('href', '/help#faq');
  });

  it('links the glossary’s reader page under its title', () => {
    view({ kind: 'glossary', rows: [], address: '/help/glossary' });

    expect(screen.getByRole('link', { name: '/help/glossary' })).toHaveAttribute(
      'href',
      '/help/glossary',
    );
  });
});
