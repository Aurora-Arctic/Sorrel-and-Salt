import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkHint, { LinkIconHint } from '@/components/LinkHint';

let pending = false;

vi.mock('next/link', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/link')>()),
  useLinkStatus: () => ({ pending }),
}));

// The hint is decorative: no role and no text, so it is found by its class and adds nothing to the link's name.
describe('LinkHint', () => {
  it.each([false, true])('is hidden from the accessibility tree, pending %s', (isPending) => {
    pending = isPending;
    const { container } = render(
      <a href="/x">
        Name <LinkHint />
      </a>,
    );
    expect(container.querySelector('.link-hint')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link', { name: 'Name' })).toBeInTheDocument();
  });
});

// A link wearing the chain icon shows no dot: the icon turns into the loading ring, the shared Spinner, found by class as it has no role.
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
    expect(screen.getByRole('link', { name: 'Name' })).toBeInTheDocument();

    pending = false;
    rerender(
      <a href="/x">
        Name <LinkIconHint />
      </a>,
    );
    expect(container.querySelector('.spinner')).not.toBeInTheDocument();
  });
});
