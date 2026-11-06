import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { onTestFinished, describe, expect, it, vi } from 'vitest';
import DownloadCsv from '@/components/AdminCards/download-csv';

// Download CSV reads the arrivals, then hands the browser the file. The read is a server round trip,
// so the button is busy, with its place in the tab order kept, until the download starts.

/** The anchor the file is handed over through, its click stubbed so happy-dom does not navigate to the object URL. */
function watchDownloads(): string[] {
  const started: string[] = [];
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    started.push(this.download);
  });
  onTestFinished(() => click.mockRestore());
  URL.createObjectURL = vi.fn(() => 'blob:csv');
  URL.revokeObjectURL = vi.fn();
  return started;
}

describe('DownloadCsv', () => {
  it('is busy, keeping the focus, from the press until the download starts, and reads once', async () => {
    const started = watchDownloads();
    let answer: (csv: string) => void = () => {};
    const read = vi.fn(() => new Promise<string>((resolve) => (answer = resolve)));
    render(<DownloadCsv read={read} />);
    const button = screen.getByRole('button', { name: 'Download CSV' });
    // Precondition: at rest it is idle.
    expect(button).not.toHaveAttribute('aria-busy');

    button.focus();
    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveAttribute('aria-busy', 'true');
    // A disabled button drops the focus it holds.
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(read).toHaveBeenCalledOnce();
    expect(started).toEqual([]);

    await act(async () => answer('name,email\n'));

    await waitFor(() => expect(started).toEqual(['card-sign-ups.csv']));
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).toHaveAccessibleName('Download CSV');
  });
});
