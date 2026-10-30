import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import LastEdit from '@/components/LastEdit';
import { clockTime, relativePhrase } from '@/components/LastEdit/relative';

// The line is compact. Its visible text is the short date on the server and the relative
// phrase once hydrated; the full sentence is the tip, which the button describes.

const AT = '2026-09-01T10:30:00.000Z';

describe('LastEdit', () => {
  it('holds the moment in the time element, inside a button a keyboard can reach', () => {
    const { container } = render(<LastEdit by="Fixture A" at={AT} />);
    expect(container.querySelector('time')).toHaveAttribute('datetime', AT);
    expect(screen.getByRole('button', { name: /^Edited/ })).toBeInTheDocument();
  });

  it('gives a screen reader the full sentence as the description, and opens it on focus', () => {
    render(<LastEdit by="Fixture A" at={AT} />);
    const button = screen.getByRole('button', { name: /^Edited/ });
    expect(button).toHaveAccessibleDescription('Last edited by Fixture A on 1 September 2026');
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip).toHaveAttribute('aria-hidden', 'true');

    fireEvent.focus(button);
    expect(screen.getByRole('tooltip')).toHaveAttribute('aria-hidden', 'false');
  });

  it('opens on hover once the pointer has rested, and closes when it leaves', () => {
    vi.useFakeTimers();
    try {
      render(<LastEdit by="Fixture A" at={AT} />);
      const button = screen.getByRole('button', { name: /^Edited/ });

      fireEvent.mouseEnter(button);
      act(() => vi.advanceTimersByTime(299));
      expect(screen.getByRole('tooltip', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
      act(() => vi.advanceTimersByTime(1));
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        'Last edited by Fixture A on 1 September 2026',
      );

      fireEvent.mouseLeave(button);
      act(() => vi.advanceTimersByTime(200));
      expect(screen.getByRole('tooltip', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the relative phrase once the page has loaded', () => {
    const { container } = render(<LastEdit by="Fixture A" at={AT} />);
    expect(container.querySelector('time')!.textContent).toMatch(/ago$/);
  });

  it('sends only the short date in the server HTML, so the two never disagree', () => {
    const html = renderToString(<LastEdit by="Fixture A" at={AT} />);
    expect(html).toContain('1 Sept 2026');
    expect(html).not.toMatch(/ ago|just now/);
  });

  it('keeps the time when the editor cannot be named, and leaves the name out', () => {
    render(<LastEdit by={null} at={AT} />);
    expect(screen.getByRole('button', { name: /^Edited/ })).toHaveAccessibleDescription(
      'Last edited on 1 September 2026',
    );
  });

  it('draws nothing for a moment that is not a date', () => {
    const { container } = render(<LastEdit by="Fixture A" at="not a date" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('relativePhrase', () => {
  const now = new Date('2026-10-21T12:00:00.000Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;

  it('picks the largest whole unit', () => {
    expect(relativePhrase(ago(5 * MIN), now)).toBe('5 minutes ago');
    expect(relativePhrase(ago(120 * MIN), now)).toBe('2 hours ago');
    expect(relativePhrase(ago(3 * 24 * 60 * MIN), now)).toBe('3 days ago');
    expect(relativePhrase(ago(14 * 24 * 60 * MIN), now)).toBe('2 weeks ago');
    expect(relativePhrase(ago(400 * 24 * 60 * MIN), now)).toBe('1 year ago');
  });

  it('reads just now under a minute and for a moment ahead of the clock', () => {
    expect(relativePhrase(ago(10_000), now)).toBe('just now');
    expect(relativePhrase(new Date(now.getTime() + 5 * MIN), now)).toBe('just now');
  });
});

describe('clockTime', () => {
  it('reads the time of day as hours and minutes on a 12-hour clock, with am or pm', () => {
    expect(clockTime(new Date(2026, 9, 27, 14, 2, 59))).toBe('2:02 pm');
    expect(clockTime(new Date(2026, 9, 27, 9, 5))).toBe('9:05 am');
    expect(clockTime(new Date(2026, 9, 27, 0, 30))).toBe('12:30 am');
  });
});
