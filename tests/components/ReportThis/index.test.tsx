import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const pathname = vi.fn<() => string | null>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));

const { default: ReportThis } = await import('@/components/ReportThis');

const link = () => screen.getByRole('link', { name: 'Report This' });

describe('ReportThis', () => {
  it('opens the support dialog over the same page as a bug, with the error number', () => {
    pathname.mockReturnValue('/coven/x/spells');
    render(<ReportThis code={404} inShell />);
    expect(link()).toHaveAttribute('href', '/coven/x/spells?support=bug&error=404');
  });

  it('goes to the support page, naming the page, where there is no shell to open it over', () => {
    pathname.mockReturnValue('/gone');
    render(<ReportThis code={500} />);
    expect(link()).toHaveAttribute('href', '/support?support=bug&error=500&from=%2Fgone');
  });

  it('leaves the page out when it cannot be read', () => {
    pathname.mockReturnValue(null);
    render(<ReportThis code={500} />);
    expect(link()).toHaveAttribute('href', '/support?support=bug&error=500');
  });
});
