import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Spinner from '@/components/Spinner';

// Decorative: the control that holds it carries `aria-busy` and the label.
describe('Spinner', () => {
  it('is hidden from the accessibility tree', () => {
    const { container } = render(<Spinner />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
