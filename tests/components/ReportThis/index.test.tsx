import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.fn<() => string | null>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));

const { default: ReportThis } = await import('@/components/ReportThis');

const browserAt = (path: string) => window.history.replaceState({}, '', path);

const link = () => screen.getByRole('link', { name: 'Report This' });

describe('ReportThis', () => {
  beforeEach(() => browserAt('/'));

  it('opens the support dialog over the same page as a bug, with the error number', () => {
    pathname.mockReturnValue('/coven/x/spells');
    browserAt('/coven/x/spells');
    render(<ReportThis code={404} />);
    expect(link()).toHaveAttribute('href', '/coven/x/spells?support=bug&error=404');
  });

  it('carries the error page digest as the reference', () => {
    pathname.mockReturnValue('/coven/x/spells');
    browserAt('/coven/x/spells');
    render(<ReportThis code={500} reference="abc123" />);
    expect(link()).toHaveAttribute('href', '/coven/x/spells?support=bug&error=500&ref=abc123');
  });

  it("leaves the page out of the server-rendered link when the router gives the framework's route", () => {
    pathname.mockReturnValue('/_not-found');
    expect(renderToString(<ReportThis code={404} />)).toContain(
      'href="?support=bug&amp;error=404"',
    );
  });

  it("carries the address the browser has when the router answers with the framework's not-found route", () => {
    pathname.mockReturnValue('/_not-found');
    browserAt('/coven/x/nothing-here');
    render(<ReportThis code={404} />);
    expect(link()).toHaveAttribute('href', '/coven/x/nothing-here?support=bug&error=404');
  });
});
