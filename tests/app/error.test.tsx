import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '@/app/error';
import GlobalError from '@/app/global-error';
import NotFound from '@/app/not-found';
import { hrefs } from '../support/links';

vi.mock('next/navigation', async () => ({
  ...(await import('../support/next-navigation')),
  usePathname: () => '/gone',
}));
window.history.replaceState({}, '', '/gone');

// React marks `document` as listening the first time any root mounts, and a later root whose container is
// `document` itself (GlobalError renders a whole `<html>`) then skips attaching its click listener. Clearing the
// mark after each test gives that root its own.
afterEach(() => {
  for (const key of Object.keys(document)) {
    if (key.startsWith('_reactListening'))
      delete (document as unknown as Record<string, unknown>)[key];
  }
});

// The screens a failure lands on. Each must offer a way onward and a way to report it, and
// must not print the error's message or stack, whatever it holds: the name and message ride only
// in the report link, for the bug form to show the sender.

const failure = Object.assign(new Error('relation "secret_table" does not exist'), {
  digest: 'd1g3st',
});
failure.stack = 'Error: boom\n    at /srv/app/secret-file.ts:1:1';

const home = () => screen.getByRole('link', { name: /Back to/ });
const report = () => screen.getByRole('link', { name: 'Report This' });
const reportQuery = () =>
  Object.fromEntries(new URL(report().getAttribute('href') ?? '', 'http://site.test').searchParams);

// Thrown in a client component: no digest, and not always an Error.
const clientFailure = new TypeError('Testwort is not a function');

describe('the error boundary', () => {
  it('offers to retry, a way home and a report, and prints no message or stack', () => {
    const retry = vi.fn();
    const { container } = render(<ErrorBoundary error={failure} retry={retry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(home()).toHaveAttribute('href', '/');
    expect(report().getAttribute('href')).toMatch(/^\/gone\?/);
    expect(reportQuery()).toEqual({
      support: 'bug',
      error: '500',
      ref: 'd1g3st',
      detail: 'Error: relation "secret_table" does not exist',
    });
    expect(container.textContent).toContain('d1g3st');
    expect(container.textContent).not.toMatch(/secret_table|secret-file/);
  });

  it('shows a reference of its own when the error has no digest, and the report carries it and the detail', () => {
    const { container, rerender } = render(<ErrorBoundary error={clientFailure} retry={vi.fn()} />);
    const { ref, detail } = reportQuery();

    expect(ref).toBeTruthy();
    expect(detail).toBe('TypeError: Testwort is not a function');
    expect(container.textContent).toContain(ref);
    rerender(<ErrorBoundary error={clientFailure} retry={vi.fn()} />);
    expect(reportQuery().ref).toBe(ref);
  });

  it('reports a thrown value that is not an Error as text', () => {
    render(<ErrorBoundary error={'Testwort failed' as unknown as Error} retry={vi.fn()} />);
    expect(reportQuery().detail).toBe('Testwort failed');
    expect(reportQuery().ref).toBeTruthy();
  });
});

describe('the global error boundary', () => {
  it('offers to retry, a way home and a report, and prints no message or stack', () => {
    const retry = vi.fn();
    // It renders <html>, which cannot sit inside the test's <div>, so React
    // takes the document itself as the root.
    // The boundary's props as Next passes them: the error and its retry.
    const props = { error: failure, retry };
    render(<GlobalError {...props} />, {
      container: document,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(home()).toHaveAttribute('href', '/');
    expect(report().getAttribute('href')).toMatch(/^\/support\?/);
    expect(reportQuery()).toMatchObject({ support: 'bug', error: '500', ref: 'd1g3st' });
    expect(reportQuery().detail).toBe('Error: relation "secret_table" does not exist');
    expect(document.body.textContent).toContain('d1g3st');
    expect(document.body.textContent).not.toMatch(/secret_table|secret-file/);
  });

  it('shows a reference of its own when the error has no digest, and the report keeps it, the detail and the page', () => {
    render(<GlobalError error={clientFailure} retry={vi.fn()} />, {
      container: document,
    });
    const { ref, detail } = reportQuery();

    expect(ref).toBeTruthy();
    expect(detail).toBe('TypeError: Testwort is not a function');
    expect(document.body.textContent).toContain(ref);
    // jsdom cannot follow a link; the click's handler still runs.
    report().addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(report());
    expect(reportQuery()).toMatchObject({ ref, detail, from: '/gone' });
  });

  it('reaches Report This with a plain anchor and imports neither the router nor the report component', () => {
    const source = readFileSync(resolve(__dirname, '../../src/app/global-error.tsx'), 'utf8');
    expect(source).not.toMatch(/from '(next\/|[^']*ReportThis)/);
  });
});

describe('the not-found page', () => {
  it('offers a way home and a report', () => {
    render(<NotFound />);

    expect(home()).toHaveAttribute('href', '/');
    expect(report()).toHaveAttribute('href', '/gone?support=bug&error=404');
  });

  it('links the help pages', () => {
    render(<NotFound />);

    expect(hrefs(screen.getAllByRole('link'))).toContain('/help');
  });
});
