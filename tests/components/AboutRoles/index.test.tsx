import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AboutRoles from '@/components/AboutRoles';
import type { AboutRole } from '@/components/AboutRoles/types';

// claude-docs/components/about-roles.md

const ROLES: AboutRole[] = [
  { heading: 'The Fixture Owner', text: 'Holds the fixture account.' },
  { heading: 'A Fixture Keeper', text: 'Manages the fixture invitations.' },
  { heading: 'A Fixture Curator', text: 'Curates the fixture reference.' },
];

describe('AboutRoles', () => {
  it('lists one item per role', () => {
    render(<AboutRoles roles={ROLES} />);
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
  });

  it('gives each role a heading and its sentence', () => {
    render(<AboutRoles roles={ROLES} />);
    for (const role of ROLES) {
      const heading = screen.getByRole('heading', { level: 3, name: role.heading });
      const item = heading.closest('li') as HTMLElement;
      expect(within(item).getByText(role.text)).toBeTruthy();
    }
  });

  it('draws no image a screen reader would announce', () => {
    render(<AboutRoles roles={ROLES} />);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('draws a role’s icon beside its heading, hidden from a screen reader', () => {
    render(<AboutRoles roles={[{ ...ROLES[0], icon: <span>Fixture glyph</span> }, ROLES[1]]} />);
    const item = screen
      .getByRole('heading', { name: ROLES[0].heading })
      .closest('li') as HTMLElement;
    expect(within(item).getByText('Fixture glyph').closest('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
});
