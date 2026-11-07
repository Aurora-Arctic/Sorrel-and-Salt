import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DisclaimerNotice from '@/components/DisclaimerNotice';

// claude-docs/components/document-page.md

describe('DisclaimerNotice', () => {
  it('links the disclaimer page, as a note rather than a control', () => {
    render(<DisclaimerNotice />);
    const link = screen.getByRole('link', { name: 'Read the Disclaimer' });
    expect(link).toHaveAttribute('href', '/disclaimer');
    expect(screen.getByRole('note')).toContainElement(link);
  });
});
