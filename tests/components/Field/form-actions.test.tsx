import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormActions } from '@/components/Field';

// A form's row of actions names its submit "Save <noun>" unless the form says otherwise: an invitation is sent, not saved.
// It also owns two rules every form relies on, so no form proves them again (rule 6): Save is off until there is something to save, and busy from the press to the answer.

describe('FormActions', () => {
  it('names its submit by the label it is given, in place of Save', () => {
    render(<FormActions noun="Invitation" label="Send Invitation" dirty submitting={false} />);

    expect(screen.getByRole('button', { name: 'Send Invitation' })).toHaveAttribute(
      'type',
      'submit',
    );
    expect(screen.queryByRole('button', { name: 'Save Invitation' })).toBeNull();
  });

  it('has nothing to save until the form is dirty', () => {
    const { rerender } = render(<FormActions noun="Name" dirty={false} submitting={false} />);

    expect(screen.getByRole('button', { name: 'Save Name' })).toBeDisabled();

    rerender(<FormActions noun="Name" dirty submitting={false} />);
    expect(screen.getByRole('button', { name: 'Save Name' })).toBeEnabled();
  });

  it('is busy and disabled, saying what is happening, while the save is in flight', () => {
    const { rerender } = render(<FormActions noun="Name" dirty submitting={false} />);
    expect(screen.getByRole('button', { name: 'Save Name' })).not.toHaveAttribute('aria-busy');

    rerender(<FormActions noun="Name" dirty submitting />);

    const busy = screen.getByRole('button', { name: 'Saving Name' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
  });
});
