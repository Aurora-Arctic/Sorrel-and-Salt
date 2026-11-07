import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListFilterFrame } from '@/components/ListFrame/skeleton';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('ListFilterFrame', () => {
  it('draws the filter row with its search disabled', () => {
    render(<ListFilterFrame filter="Filter Users">body</ListFilterFrame>);
    expect(screen.getByLabelText('Search')).toBeDisabled();
  });
});
