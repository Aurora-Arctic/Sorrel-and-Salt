import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContextRow from '@/components/ContextRow';

describe('ContextRow', () => {
  it('holds the lead and the section nav together', () => {
    render(
      <ContextRow lead={<span>Fixture Coven</span>}>
        <nav aria-label="Fixture Sections" />
      </ContextRow>,
    );

    expect(screen.getByText('Fixture Coven')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Fixture Sections' })).toBeInTheDocument();
  });

  it('shows the lead alone when there is no nav', () => {
    render(<ContextRow lead={<span>Fixture Coven</span>} />);

    expect(screen.getByText('Fixture Coven')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
