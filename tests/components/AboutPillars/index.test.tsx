import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AboutPillars from '@/components/AboutPillars';
import type { AboutPillar } from '@/components/AboutPillars/types';

// claude-docs/components/about-pillars.md

const PILLARS: AboutPillar[] = [
  { kicker: 'The Testwort', heading: 'What Is Fixed', text: 'The fixture reference.' },
  { kicker: 'Fixture Stock', heading: 'What Is Held', text: 'The fixture stock.' },
  { kicker: 'The Fixture Book', heading: 'What Is Made', text: 'The fixture spells.' },
  { kicker: 'The Fixture Ring', heading: 'Who Is Joined', text: 'The fixture group.' },
];

describe('AboutPillars', () => {
  it('lists one item per pillar', () => {
    render(<AboutPillars pillars={PILLARS} />);
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(4);
  });

  it('gives each pillar a heading, the name of what it holds, and its sentence', () => {
    render(<AboutPillars pillars={PILLARS} />);
    for (const pillar of PILLARS) {
      const heading = screen.getByRole('heading', { level: 3, name: new RegExp(pillar.heading) });
      const item = heading.closest('li') as HTMLElement;
      expect(within(item).getByText(pillar.kicker)).toBeTruthy();
      expect(within(item).getByText(pillar.text)).toBeTruthy();
    }
  });

  it('draws no image a screen reader would announce', () => {
    render(<AboutPillars pillars={PILLARS} />);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('draws a pillar’s icon beside its heading, hidden from a screen reader', () => {
    render(
      <AboutPillars
        pillars={[{ ...PILLARS[0], icon: <span>Fixture glyph</span>, accent: 'woad' }, PILLARS[1]]}
      />,
    );
    const item = screen
      .getByRole('heading', { name: PILLARS[0].heading })
      .closest('li') as HTMLElement;
    expect(within(item).getByText('Fixture glyph').closest('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('reads the same without an icon', () => {
    render(<AboutPillars pillars={PILLARS} />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });
});
