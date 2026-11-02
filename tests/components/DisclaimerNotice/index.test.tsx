import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DisclaimerNotice from '@/components/DisclaimerNotice';

// The one line beside every safety-notes section that says the notes are not complete and links the
// disclaimer page (claude-docs/components/disclaimer-notice.md).

describe('DisclaimerNotice', () => {
  it('links the disclaimer page, as a note rather than a control', () => {
    render(<DisclaimerNotice />);
    const link = screen.getByRole('link', { name: 'Read the Disclaimer' });
    expect(link).toHaveAttribute('href', '/disclaimer');
    expect(screen.getByRole('note')).toContainElement(link);
  });
});
