import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListFilterFrame } from '@/components/ListFrame/skeleton';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('ListFilterFrame', () => {
  it('draws the filter row it is given with its search disabled, over the body', () => {
    render(
      <ListFilterFrame filter={<input name="q" aria-label="Search" />}>
        <p>body</p>
      </ListFilterFrame>,
    );
    // Preconditions: the row and the body are both drawn, so a pass is not an empty frame.
    expect(screen.getByText('body')).toBeInTheDocument();
    const search = screen.getByLabelText('Search', { selector: 'input' });
    expect(search).toBeDisabled();
    expect(search.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
