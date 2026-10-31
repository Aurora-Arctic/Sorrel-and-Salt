import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '@/app/error';
import GlobalError from '@/app/global-error';
import NotFound from '@/app/not-found';

vi.mock('next/navigation', () => ({ usePathname: () => '/gone' }));

// The screens a failure lands on. Each must offer a way onward and a way to report it, and
// must not print the error's message or stack, whatever it holds.

const failure = Object.assign(new Error('relation "secret_table" does not exist'), {
  digest: 'd1g3st',
});
failure.stack = 'Error: boom\n    at /srv/app/secret-file.ts:1:1';

const home = () => screen.getByRole('link', { name: /Back to/ });
const report = () => screen.getByRole('link', { name: 'Report This' });

describe('the error boundary', () => {
  it('offers to retry, a way home and a report, and prints no message or stack', () => {
    const retry = vi.fn();
    const { container } = render(<ErrorBoundary error={failure} retry={retry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(home()).toHaveAttribute('href', '/');
    expect(report()).toHaveAttribute('href', '/support?support=bug&error=500&from=%2Fgone');
    expect(container.textContent).toContain('d1g3st');
    expect(container.textContent).not.toMatch(/secret_table|secret-file/);
  });
});

describe('the global error boundary', () => {
  it('offers a way home and a report, and prints no message or stack', () => {
    // It renders <html>, which cannot sit inside the test's <div>, so React
    // takes the document itself as the root.
    const { container } = render(<GlobalError error={failure} />, { container: document });

    expect(home()).toHaveAttribute('href', '/');
    expect(report()).toHaveAttribute('href', '/support?support=bug&error=500&from=%2Fgone');
    expect(container.textContent).not.toMatch(/secret_table|secret-file/);
  });
});

describe('the not-found page', () => {
  it('offers a way home and a report', () => {
    render(<NotFound />);

    expect(home()).toHaveAttribute('href', '/');
    expect(report()).toHaveAttribute('href', '/support?support=bug&error=404&from=%2Fgone');
  });
});
