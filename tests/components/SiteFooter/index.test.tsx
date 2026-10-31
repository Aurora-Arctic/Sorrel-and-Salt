import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SiteFooter from '@/components/SiteFooter';

describe('SiteFooter', () => {
  it('carries a Support link to the support page, and nothing else to follow', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
  });
});
