import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CovenSwitchTargets from '@/components/CovenSwitchTargets';
import {
  CovenSwitchProvider,
  useCovenSwitchRegistration,
} from '@/components/CovenSwitchTargets/context';

function Reader() {
  const registration = useCovenSwitchRegistration();
  return (
    <p>{registration ? `${registration.path} in ${registration.slugs.join(',')}` : 'nothing'}</p>
  );
}

describe('CovenSwitchTargets', () => {
  it('makes the registration readable beside it, and clears it when the page goes', () => {
    const { rerender } = render(
      <CovenSwitchProvider>
        <CovenSwitchTargets path="/coven/a/ingredients/x" slugs={['a', 'b']} />
        <Reader />
      </CovenSwitchProvider>,
    );
    expect(screen.getByText('/coven/a/ingredients/x in a,b')).toBeInTheDocument();

    rerender(
      <CovenSwitchProvider>
        <Reader />
      </CovenSwitchProvider>,
    );
    expect(screen.getByText('nothing')).toBeInTheDocument();
  });

  it('replaces the registration when the next page registers, and the old page going keeps the new', () => {
    const { rerender } = render(
      <CovenSwitchProvider>
        <CovenSwitchTargets path="/coven/a/ingredients/x" slugs={['a']} />
        <Reader />
      </CovenSwitchProvider>,
    );

    rerender(
      <CovenSwitchProvider>
        <CovenSwitchTargets path="/coven/a/ingredients/y" slugs={['a', 'b']} />
        <Reader />
      </CovenSwitchProvider>,
    );

    expect(screen.getByText('/coven/a/ingredients/y in a,b')).toBeInTheDocument();
  });

  it('is harmless with no provider', () => {
    render(<CovenSwitchTargets path="/coven/a/ingredients/x" slugs={['a']} />);
    expect(screen.queryByText(/./)).not.toBeInTheDocument();
  });
});
