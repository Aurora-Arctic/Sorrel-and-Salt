import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import HelpOutline from '@/components/HelpOutline';
import type { HelpOutlineChosen, HelpOutlineGuide } from '@/components/HelpOutline/types';

// The keeper help outline's guides: each guide's count of sub pages beside it in the Guides list, in the phone's
// Guide select and in the chosen guide's facts, and none at all for a guide that holds none
// (claude-docs/components/help-outline.md).

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
  kind: 'article',
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

const outline = () =>
  render(
    <HelpOutline
      filter={{ query: '', kind: '', audience: '', shown: 'shown' }}
      guides={GUIDES}
      others={[]}
      pane={{ kind: 'guide', guide: CHOSEN }}
    />,
  );

const guideLink = (title: string) =>
  within(screen.getByRole('navigation', { name: 'Help Outline' })).getByRole('link', {
    name: new RegExp(title),
  });

describe('HelpOutline sub page counts', () => {
  it('shows a guide’s count in the Guides list, and no number for a guide with none', () => {
    outline();

    expect(guideLink('Testwort Roots')).toHaveTextContent(/3$/);
    expect(guideLink('Testwort Basics')).not.toHaveTextContent(/\d$/);
    expect(guideLink('Testwort Basics')).not.toHaveTextContent('0');
  });

  it('counts sub pages in the phone’s Guide choices only for a guide that has some', () => {
    outline();

    fireEvent.click(screen.getByRole('combobox', { name: 'Guide' }));
    const choices = within(screen.getByRole('listbox', { name: 'Guide choices' }));

    expect(choices.getByRole('option', { name: '2. Testwort Roots · 3 Sub Pages' })).toBeTruthy();
    expect(choices.getByRole('option', { name: '1. Testwort Basics' })).toBeTruthy();
  });

  it('leaves the count out of an empty guide’s facts', () => {
    outline();

    const facts = screen.getByText('Position 1 of 2').parentElement;
    expect(facts).not.toBeNull();
    expect(facts).not.toHaveTextContent(/Sub Page/);
  });
});
