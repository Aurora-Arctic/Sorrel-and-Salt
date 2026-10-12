import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AddAction from '@/app/(shell)/admin/add-action';

describe('AddAction', () => {
  it('is named by its label at every width, the plus hidden from assistive technology', () => {
    const { container } = render(
      <AddAction href="/admin/categories?new" heading={{ title: 'Add Category' }}>
        Add Category
      </AddAction>,
    );

    const link = screen.getByRole('link', { name: 'Add Category' });

    expect(link).toHaveAttribute('href', '/admin/categories?new');
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(link).toContainElement(icon as SVGElement);
  });
});
