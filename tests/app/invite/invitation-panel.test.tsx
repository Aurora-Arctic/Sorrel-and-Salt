import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';

// The accept panel's page reads where the visitor stands. A signed-out visitor holding a link
// has nothing of it read or written; a signed-in one refused gets the recorder.

const getSession = vi.fn<() => Promise<Session | null>>();
vi.mock('@/lib/request-session', () => ({ getSession }));

const invitationStanding = vi.fn();
const recordCardAttempt = vi.fn();
const getMe = vi.fn();
vi.mock('@/modules/identity', () => ({
  invitationStanding,
  recordCardAttempt,
  getMe,
  isPlaceholderEmail: (email: string) => email.endsWith('@placeholder.test'),
}));
vi.mock('@/lib/social-providers-config', () => ({ configuredProviders: () => ['google'] }));

const recorded: string[] = [];
const landings: string[] = [];
const startCovenHrefs: (string | undefined)[] = [];
const shown: Record<string, unknown>[] = [];
vi.mock('@/components/InvitationAcceptance', () => ({
  default: (props: {
    [key: string]: unknown;
    status: string;
    token?: string;
    startCovenHref?: string;
    landing?: string;
  }) => {
    shown.push(props);
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
  shown.length = 0;
  getMe.mockReset();
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

  it('hands a signed-out visitor the link itself to return to, and the providers the server holds', async () => {
    getSession.mockResolvedValue(null);

    render(await InvitationPanel({ token: 'abc', here: '/invite/abc' }));

    expect(shown[0]).toMatchObject({
      status: 'signed-out',
      next: '/invite/abc',
      configured: ['google'],
      card: false,
      lead: 'sign-in',
    });
  });

  // A printed card is handed to someone new, so it leads with Create Account; an address invitation leads with Sign In.
  it('leads a card with Create Account', async () => {
    getSession.mockResolvedValue(null);

    render(await InvitationPanel({ token: 'abc', here: '/i/abc' }));

    expect(shown[0]).toMatchObject({ status: 'signed-out', card: true, lead: 'sign-up' });
  });

  // A site invitation's mailed link carries the marker; the invitation itself is not read signed out.
  it('leads a link marked as a site invitation with Create Account', async () => {
    getSession.mockResolvedValue(null);

    render(await InvitationPanel({ token: 'abc', here: '/invite/abc', marker: 'site' }));

    expect(shown[0]).toMatchObject({ status: 'signed-out', card: false, lead: 'sign-up' });
    expect(invitationStanding).not.toHaveBeenCalled();
  });

  it.each([['coven'], [['site', 'site']], ['SITE']])(
    'leads a link with any other marker, %j, with Sign In',
    async (marker) => {
      getSession.mockResolvedValue(null);

      render(await InvitationPanel({ token: 'abc', here: '/invite/abc', marker }));

      expect(shown[0]).toMatchObject({ status: 'signed-out', lead: 'sign-in' });
    },
  );

  // The address matched before the verification check, so the account is the invitee's, waiting on its message.
  it('tells an unverified account to check its inbox, with the way to the email page back here', async () => {
    getSession.mockResolvedValue({ userId: 'u', role: 'user' });
    invitationStanding.mockResolvedValue({
      acceptable: false,
      reason: 'unverified',
      message: 'Unverified.',
    });
    getMe.mockResolvedValue({ email: 'someone@invitation.test' });

    render(await InvitationPanel({ token: 'abc', here: '/invite/abc' }));

    expect(shown[0]).toEqual({
      status: 'unverified',
      emailHref: '/account/email?next=%2Finvite%2Fabc',
    });
    expect(recorded).toEqual([]);
  });

  // A verification link refused on its way back lands here with ?error=; the page passes only that it failed.
  it('tells the inbox state a verification link failed, and nothing else', async () => {
    getSession.mockResolvedValue({ userId: 'u', role: 'user' });
    invitationStanding.mockResolvedValue({
      acceptable: false,
      reason: 'unverified',
      message: 'Unverified.',
    });
    getMe.mockResolvedValue({ email: 'someone@invitation.test' });

    render(await InvitationPanel({ token: 'abc', here: '/invite/abc', linkFailed: true }));

    expect(shown[0]).toEqual({
      status: 'unverified',
      emailHref: '/account/email?next=%2Finvite%2Fabc',
      linkFailed: true,
    });
  });

  it('tells a signed-out visitor a verification link failed', async () => {
    getSession.mockResolvedValue(null);

    render(await InvitationPanel({ token: 'abc', here: '/invite/abc', linkFailed: true }));

    expect(shown[0]).toMatchObject({ status: 'signed-out', linkFailed: true });
    expect(invitationStanding).not.toHaveBeenCalled();
  });

  // An address stood in for a provider that gave none was never written to, so there is no inbox to check.
  it('keeps the refusal for an unverified account holding a stand-in address', async () => {
    getSession.mockResolvedValue({ userId: 'u', role: 'user' });
    invitationStanding.mockResolvedValue({
      acceptable: false,
      reason: 'unverified',
      message: 'Unverified.',
    });
    getMe.mockResolvedValue({ email: 'discord-1@placeholder.test' });

    render(await InvitationPanel({ token: 'abc', here: '/i/abc' }));

    expect(shown[0]).toMatchObject({
      status: 'refused',
      emailHref: '/account/email?next=%2Fi%2Fabc',
    });
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

  // A site invitation grants the role it names, so its invitee lands where that role signs in to; `user` grants coven creation alone.
  it.each([
    ['user', '/coven/new'],
    ['curator', '/curator'],
    ['admin', '/keepers'],
  ])('lands an accepted site invitation to the %s role on %s', async (siteRole, landing) => {
    getSession.mockResolvedValue({ userId: 'u', role: 'user' });
    invitationStanding.mockResolvedValue({ acceptable: true, tier: 'site', siteRole });

    render(await InvitationPanel({ token: 'abc', here: '/invite/abc' }));

    expect(landings).toEqual([landing]);
  });
});
