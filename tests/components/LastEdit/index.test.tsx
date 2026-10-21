import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LastEdit from '@/components/LastEdit';
import { relativePhrase } from '@/components/LastEdit/relative';

// M6.18: the date is the server's, the relative phrase the browser's, and the `<time>`
// element holds the moment either way.

const AT = '2026-09-01T10:30:00.000Z';

describe('LastEdit', () => {
  it('holds the moment in the time element and names the editor', () => {
    const { container } = render(<LastEdit by="Fixture A" at={AT} />);
    const time = container.querySelector('time');
    expect(time).toHaveAttribute('datetime', AT);
    expect(container).toHaveTextContent('Fixture A');
  });

  it('shows the relative phrase beside the date once the page has loaded', () => {
    const { container } = render(<LastEdit by="Fixture A" at={AT} />);
    const time = container.querySelector('time')!;
    expect(time.textContent).toMatch(/1 September 2026/);
    expect(time.textContent).toMatch(/ago\)$/);
  });

  it('sends only the absolute date in the server HTML, so the two never disagree', () => {
    const html = renderToString(<LastEdit by="Fixture A" at={AT} />);
    expect(html).toContain('1 September 2026');
    expect(html).not.toMatch(/ago|just now/);
  });

  it('keeps the time when the editor cannot be named, and leaves the name out', () => {
    const { container } = render(<LastEdit by={null} at={AT} />);
    expect(container.querySelector('time')).toHaveAttribute('datetime', AT);
    expect(container).not.toHaveTextContent(/\bby\b/);
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
