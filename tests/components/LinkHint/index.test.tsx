import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkHint from '@/components/LinkHint';

let pending = false;

vi.mock('next/link', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/link')>()),
  useLinkStatus: () => ({ pending }),
}));

// The hint is decorative: no role, no text. Its pending class IS the state
// (it is what the stylesheet shows), so the class is read here directly.
describe('LinkHint', () => {
  beforeEach(() => {
    pending = false;
  });

  it('is hidden from the accessibility tree and not pending at rest', () => {
    const { container } = render(
      <a href="/x">
        Name <LinkHint />
      </a>,
    );
    const hint = container.querySelector('.link-hint');
    expect(hint).toHaveAttribute('aria-hidden', 'true');
    expect(hint).not.toHaveClass('is-pending');
    expect(screen.getByRole('link', { name: 'Name' })).toBeInTheDocument();
  });

  it('carries the pending class, still hidden, while the link is pending', () => {
    pending = true;
    const { container } = render(
      <a href="/x">
        Name <LinkHint />
      </a>,
    );
    const hint = container.querySelector('.link-hint');
    expect(hint).toHaveAttribute('aria-hidden', 'true');
    expect(hint).toHaveClass('is-pending');
    expect(screen.getByRole('link', { name: 'Name' })).toBeInTheDocument();
  });
});
