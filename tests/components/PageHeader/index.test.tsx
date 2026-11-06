import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageHeader from '@/components/PageHeader';

describe('PageHeader', () => {
  it('names the page by its title', () => {
    render(<PageHeader title="Compendium" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Compendium' })).toBeInTheDocument();
  });

  it('draws a placeholder in the heading box, hidden from assistive technology, while the title is pending', () => {
    const { container } = render(
      <PageHeader pendingTitle action={<button type="button">Add</button>} />,
    );
    // Preconditions: the head still draws its action beside the heading.
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    // The heading is not exposed, and says nothing.
    expect(screen.queryByRole('heading')).toBeNull();
    const heading = container.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading).toHaveAttribute('aria-hidden', 'true');
    expect(heading).toHaveTextContent('');
  });
});
