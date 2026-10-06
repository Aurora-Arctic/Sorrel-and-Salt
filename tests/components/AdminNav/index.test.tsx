import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminNav from '@/components/AdminNav';

// The nav the `/admin` layout carries (M5.4): one entry per admin-curated
// resource, and nothing else (claude-docs/components/admin-nav.md).

describe('AdminNav', () => {
  it('is a navigation landmark named for the admin area', () => {
    render(<AdminNav />);

    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeInTheDocument();
  });

  it('lists the compendium, categories, forms, planets, zodiac signs and users, in that order', () => {
    render(<AdminNav />);

    const links = within(screen.getByRole('navigation', { name: 'Admin' })).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Compendium', '/admin/compendium'],
      ['Categories', '/admin/categories'],
      ['Forms', '/admin/forms'],
      ['Planets', '/admin/planets'],
      ['Zodiac signs', '/admin/zodiac-signs'],
      ['Users', '/admin/users'],
    ]);
  });
});
