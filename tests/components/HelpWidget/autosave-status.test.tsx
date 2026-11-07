import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AutosaveStatusWidget, { STATUS_LABELS } from '@/components/HelpWidget/autosave-status';
import { RETRY_DELAYS_MS } from '@/lib/autosave';

// The real save line in each of its states, beside the retry delays the hook waits on.

function stateNamed(label: string): HTMLElement {
  return screen.getByRole('definition', { name: label });
}

describe('AutosaveStatusWidget', () => {
  it('draws one entry for each of the six states', () => {
    render(<AutosaveStatusWidget />);

    expect(Object.keys(STATUS_LABELS)).toHaveLength(6);
    expect(screen.getAllByRole('term')).toHaveLength(6);
    expect(screen.getAllByRole('definition')).toHaveLength(6);
  });

  it('draws the failed state with its Retry button', () => {
    render(<AutosaveStatusWidget />);

    expect(
      within(stateNamed(STATUS_LABELS.failed)).getByRole('button', { name: 'Retry' }),
    ).toBeInTheDocument();
  });

  it('draws the conflict state with both of its choices', () => {
    render(<AutosaveStatusWidget />);

    const conflict = stateNamed(STATUS_LABELS.conflict);
    expect(within(conflict).getByRole('button', { name: 'Reload Latest' })).toBeInTheDocument();
    expect(within(conflict).getByRole('button', { name: 'Keep My Version' })).toBeInTheDocument();
    expect(within(stateNamed(STATUS_LABELS.saved)).queryByRole('button')).toBeNull();
  });

  it('names each retry delay the hook waits, in seconds', () => {
    render(<AutosaveStatusWidget />);

    const note = screen.getByRole('note', { name: 'Retries' });
    for (const delay of RETRY_DELAYS_MS) expect(note).toHaveTextContent(String(delay / 1000));
    expect(RETRY_DELAYS_MS).toEqual([2000, 5000, 15000]);
  });
});
