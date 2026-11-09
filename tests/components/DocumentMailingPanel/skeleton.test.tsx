import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocumentMailingSkeleton } from '@/components/DocumentMailingPanel/skeleton';

describe('DocumentMailingSkeleton', () => {
  it('shows the real heading while the counts and the summary field load', () => {
    render(<DocumentMailingSkeleton />);
    expect(screen.getByRole('heading', { name: 'Email Every Account' })).toBeVisible();
  });
});
