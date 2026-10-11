import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminNav from '@/components/AdminNav';

// The nav the `/admin` layout carries (M5.4): one entry per admin-curated
// resource, and nothing else (claude-docs/components/admin-nav.md).

describe('AdminNav', () => {
  it('links the compendium, categories and their groups, forms and theirs, planets, zodiac signs, deities and their traditions, users, and the privilege ledger, in that order', () => {
    render(<AdminNav />);

    const links = within(screen.getByRole('navigation', { name: 'Admin' })).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/compendium',
      '/admin/categories',
      '/admin/category-groups',
      '/admin/forms',
      '/admin/form-groups',
      '/admin/planets',
      '/admin/zodiac-signs',
      '/admin/deities',
      '/admin/deity-traditions',
      '/admin/users',
      '/admin/privilege-changes',
    ]);
  });
});
