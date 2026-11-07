import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotAuthorized from '@/components/NotAuthorized';

// claude-docs/components/error-page.md

describe('NotAuthorized', () => {
  // Nothing to press and no one to write to: a request control or an address
  // would be a way to request access, and a name would say who the keepers are.
  it('names no keeper and offers no way to request access, only the way back', () => {
    const { container } = render(<NotAuthorized />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/@|request|contact|ask/i);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/');
  });
});
