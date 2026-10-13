import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import ActionFailure, { useActionFailure } from '@/components/ActionFailure';

// Where a refused action is said: above the controls it wraps, rather than
// beside the one pressed (claude-docs/components/action-failure.md). A
// control of the test's own reports to it, as a page's buttons do.

const REFUSAL = 'Refused';

const Reporter = (): ReactElement => {
  const failure = useActionFailure();
  return (
    <button type="button" onClick={() => failure?.report(REFUSAL)}>
      Try It
    </button>
  );
};

describe('ActionFailure', () => {
  it('says a reported refusal above the controls it wraps', () => {
    render(
      <ActionFailure>
        <Reporter />
      </ActionFailure>,
    );
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try It' }));

    const alert = screen.getByRole('alert');
    const button = screen.getByRole('button', { name: 'Try It' });
    // Document order: the notice precedes the control.
    expect(alert.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('gives no context outside one, so a control knows to say its refusal itself', () => {
    let failure: ReturnType<typeof useActionFailure> | undefined;
    const Probe = (): null => {
      failure = useActionFailure();
      return null;
    };
    render(<Probe />);

    expect(failure).toBeNull();
  });
});
