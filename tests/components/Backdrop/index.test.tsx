import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Backdrop from '@/components/Backdrop';

// Decorative only: the test is that it has no presence in the accessibility
// tree, not what it looks like (claude-docs/components/backdrop.md).

describe('Backdrop', () => {
  it('exposes nothing to assistive technology', () => {
    const { container } = render(<Backdrop />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('');
    for (const ornament of container.children) {
      expect(ornament).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('renders only empty elements, one per corner and blend layer', () => {
    const { container } = render(<Backdrop />);

    expect(container.childElementCount).toBeGreaterThan(0);
    for (const ornament of container.children) {
      expect(ornament.childElementCount).toBe(0);
    }
  });
});
