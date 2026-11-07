import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const liveCardOf = vi.fn();
vi.mock('@/modules/identity', () => ({ liveCardOf }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/i/betatoken',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/invite/[token]/invitation-panel', () => ({
  default: () => <p>accept panel</p>,
}));

const { supportHref } = await import('@/lib/support-path');
const { default: CardPage } = await import('@/app/i/[token]/page');

const renderFor = async (token: string) =>
  render(await CardPage({ params: Promise.resolve({ token }) }));

beforeEach(() => {
  liveCardOf.mockReset();
});

describe('the card landing page', () => {
  it('welcomes the holder of a beta card, and says they are among the first', async () => {
    liveCardOf.mockResolvedValue({ beta: true });

    await renderFor('betatoken');

    expect(liveCardOf).toHaveBeenCalledWith('betatoken');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to Sorrel & Salt' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'You’re Among the First' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      supportHref('/i/betatoken', new URLSearchParams()),
    );
    expect(screen.getByText('accept panel')).toBeInTheDocument();
  });

  it('welcomes the holder of a plain card with no beta section', async () => {
    liveCardOf.mockResolvedValue({ beta: false });

    await renderFor('plaintoken');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to Sorrel & Salt' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'You’re Among the First' })).toBeNull();
  });

  // The service answers null for a revoked, expired, accepted or unknown token (invitation-cards.test.ts).
  it('shows neither section, only the panel, when the token names no live card', async () => {
    liveCardOf.mockResolvedValue(null);

    await renderFor('deadtoken');

    expect(
      screen.queryByRole('heading', { level: 1, name: 'Welcome to Sorrel & Salt' }),
    ).toBeNull();
    expect(screen.queryByRole('heading', { name: 'You’re Among the First' })).toBeNull();
    expect(screen.getByText('accept panel')).toBeInTheDocument();
  });
});
