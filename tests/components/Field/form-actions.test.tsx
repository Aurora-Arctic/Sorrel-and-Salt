import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormActions } from '@/components/Field';

// A form's row of actions names its submit "Save <noun>" unless the form says
// otherwise: an invitation is sent, not saved (MB.119).

describe('FormActions', () => {
  it('names its submit by the label it is given, in place of Save', () => {
    render(<FormActions noun="Invitation" label="Send Invitation" dirty submitting={false} />);

    expect(screen.getByRole('button', { name: 'Send Invitation' })).toHaveAttribute(
      'type',
      'submit',
    );
    expect(screen.queryByRole('button', { name: 'Save Invitation' })).toBeNull();
  });
});
