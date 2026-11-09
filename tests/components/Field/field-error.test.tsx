import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FieldError } from '@/components/Field';

describe('FieldError', () => {
  it('is a polite live region that is drawn before it has anything to say', () => {
    const { rerender } = render(<FieldError id="e" />);
    const region = document.getElementById('e');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.textContent).toBe('');
    rerender(<FieldError id="e" message="Enter a name" />);
    expect(document.getElementById('e')).toBe(region);
    expect(region?.textContent).toContain('Enter a name');
  });
  it('says "Error:" before the message to a screen reader', () => {
    render(<FieldError id="e" message="Enter a name" />);
    expect(screen.getByText('Error:').className).toBe('visually-hidden');
  });
});
