import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';

// The accept panel's page reads where the visitor stands. A signed-out visitor holding a link
// has nothing of it read or written; a signed-in one refused gets the recorder.

const getSession = vi.fn<() => Promise<Session | null>>();
vi.mock('@/lib/request-session', () => ({ getSession }));

const invitationStanding = vi.fn();
const recordCardAttempt = vi.fn();
vi.mock('@/modules/identity', () => ({ invitationStanding, recordCardAttempt }));

const recorded: string[] = [];
const landings: string[] = [];
const startCovenHrefs: (string | undefined)[] = [];
vi.mock('@/components/InvitationAcceptance', () => ({
  default: (props: {
    status: string;
    token?: string;
    startCovenHref?: string;
    landing?: string;
  }) => {
    if (props.token) recorded.push(props.token);
    if (props.landing) landings.push(props.landing);
    if (props.status === 'refused') startCovenHrefs.push(props.startCovenHref);
    return <p>{props.status}</p>;
  },
}));

const { default: InvitationPanel } = await import('@/app/invite/[token]/invitation-panel');

beforeEach(() => {
  getSession.mockReset();
  invitationStanding.mockReset();
  recordCardAttempt.mockReset();
  recorded.length = 0;
  startCovenHrefs.length = 0;
  landings.length = 0;
});

describe('the invitation panel page', () => {
  it('reads and writes nothing for a signed-out visitor', async () => {
    getSession.mockResolvedValue(null);

    render(await InvitationPanel({ token: 'abc', here: '/i/abc' }));

    expect(screen.getByText('signed-out')).toBeInTheDocument();
    expect(invitationStanding).not.toHaveBeenCalled();
    expect(recordCardAttempt).not.toHaveBeenCalled();
    expect(recorded).toEqual([]);
  });

  it('hands a refused signed-in visitor the token to record, and writes nothing itself', async () => {
    getSession.mockResolvedValue({ userId: 'u', role: 'user' });
    invitationStanding.mockResolvedValue({
      acceptable: false,
      reason: 'revoked',
      message: 'Revoked.',
    });

    render(await InvitationPanel({ token: 'abc', here: '/i/abc' }));

    expect(screen.getByText('refused')).toBeInTheDocument();
    expect(recorded).toEqual(['abc']);
    expect(recordCardAttempt).not.toHaveBeenCalled();
  });

  it('points the account that already used a card at starting a coven, and no other refusal', async () => {
    getSession.mockResolvedValue({ userId: 'u', role: 'user' });
    invitationStanding.mockResolvedValue({
      acceptable: false,
      reason: 'used-by-you',
      message: 'Used.',
    });
    render(await InvitationPanel({ token: 'abc', here: '/i/abc' }));
    invitationStanding.mockResolvedValue({ acceptable: false, reason: 'accepted', message: 'x' });
    render(await InvitationPanel({ token: 'abc', here: '/i/abc' }));

    expect(startCovenHrefs).toEqual(['/coven/new', undefined]);
  });

  it('lands an accepted card on the coven page with the marker that says what it gave', async () => {
    getSession.mockResolvedValue({ userId: 'u', role: 'user' });
    invitationStanding.mockResolvedValue({ acceptable: true, tier: 'card' });

    render(await InvitationPanel({ token: 'abc', here: '/i/abc' }));

    expect(landings).toEqual(['/coven/new?card=accepted']);
  });
});
