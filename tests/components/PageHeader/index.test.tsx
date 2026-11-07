import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageHeader from '@/components/PageHeader';

describe('PageHeader', () => {
  it('names the page by its title', () => {
    render(<PageHeader title="Compendium" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Compendium' })).toBeInTheDocument();
  });

  it('draws a placeholder in the heading box, named Loading, while the title is pending', () => {
    const { container } = render(
      <PageHeader pendingTitle action={<button type="button">Add</button>} />,
    );
    // Preconditions: the head still draws its action beside the heading.
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    // The page keeps its one level-one heading while the title is on its way.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Loading' })).toBeInTheDocument();
    expect(container.querySelector('h1')).not.toHaveAttribute('aria-hidden');
  });
});
