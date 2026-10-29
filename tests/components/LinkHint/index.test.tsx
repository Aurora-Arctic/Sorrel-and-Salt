import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkHint, { LinkIconHint } from '@/components/LinkHint';

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

// A link that wears the chain icon shows no dot: the icon is what turns into
// the loading ring while the link is pending. The
// ring is the shared Spinner, found by its class as it has no role.
describe('LinkIconHint', () => {
  beforeEach(() => {
    pending = false;
  });

  it('draws the chain icon and no ring at rest, and no dot at all', () => {
    const { container } = render(
      <a href="/x">
        Name <LinkIconHint />
      </a>,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('.spinner')).not.toBeInTheDocument();
    expect(container.querySelector('.link-hint')).not.toBeInTheDocument();
  });

  it('swaps the icon for the ring while the link is pending, and back after', () => {
    pending = true;
    const { container, rerender } = render(
      <a href="/x">
        Name <LinkIconHint />
      </a>,
    );
    expect(container.querySelector('.spinner')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.link-icon-hint')).toHaveClass('is-pending');
    expect(screen.getByRole('link', { name: 'Name' })).toBeInTheDocument();

    pending = false;
    rerender(
      <a href="/x">
        Name <LinkIconHint />
      </a>,
    );
    expect(container.querySelector('.spinner')).not.toBeInTheDocument();
    expect(container.querySelector('.link-icon-hint')).not.toHaveClass('is-pending');
  });
});
