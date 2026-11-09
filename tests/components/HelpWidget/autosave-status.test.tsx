import { render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
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

  it('holds no live region and no alert, as its lines are examples', () => {
    render(<AutosaveStatusWidget />);

    const figure = screen.getByRole('figure');
    // Why it could have: it draws the failed and conflict lines, which alert outside an example.
    expect(within(figure).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(within(figure).queryAllByRole('alert')).toHaveLength(0);
    expect(within(figure).queryAllByRole('status')).toHaveLength(0);
    expect(figure.querySelector('output')).toBeNull();
  });

  it('draws a fixed saved time on the server and in the browser, so the two agree', () => {
    expect(renderToString(<AutosaveStatusWidget />)).toMatch(/Saved 2:02/);
    render(<AutosaveStatusWidget />);

    expect(within(stateNamed(STATUS_LABELS.saved)).getByText(/^Saved 2:02/)).toBeInTheDocument();
    expect(within(stateNamed(STATUS_LABELS.pending)).getByText(/^Saved 2:02/)).toBeInTheDocument();
    expect(within(stateNamed(STATUS_LABELS.idle)).queryByText(/Saved/)).toBeNull();
  });

  it('names each retry delay the hook waits, in seconds', () => {
    render(<AutosaveStatusWidget />);

    const note = screen.getByRole('note', { name: 'Retries' });
    for (const delay of RETRY_DELAYS_MS) expect(note).toHaveTextContent(String(delay / 1000));
    expect(RETRY_DELAYS_MS).toEqual([2000, 5000, 15000]);
  });
});
