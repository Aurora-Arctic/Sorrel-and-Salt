import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListFilterFrame } from '@/components/ListFrame/skeleton';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('ListFilterFrame', () => {
  it('draws the filter row with its search disabled', () => {
    render(<ListFilterFrame filter="Filter Users">body</ListFilterFrame>);
    expect(screen.getByLabelText('Search')).toBeDisabled();
  });

  // The frame hands the filter form a function, which a server component cannot pass to a client
  // one ("Functions cannot be passed directly to Client Components"), so it must be a client module.
  it('is a client module', () => {
    const source = readFileSync('src/components/ListFrame/filter-frame.tsx', 'utf8');
    expect(source.startsWith("'use client'")).toBe(true);
  });
});
