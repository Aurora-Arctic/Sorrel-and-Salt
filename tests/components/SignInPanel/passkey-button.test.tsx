import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';
import PasskeyButton from '@/components/SignInPanel/passkey-button';
import { installHistory, setQuery } from './search-params';

// The passkey plugin's client runs the browser's WebAuthn prompt, which happy-dom has none of, so `signIn.passkey` is
// mocked and `PublicKeyCredential` stubbed per test; the rest of the module is the real one.
const passkeyMock = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: vi.fn(), passkey: (...args: unknown[]) => passkeyMock(...args) },
}));

vi.mock('next/navigation', async () => ({
  useSearchParams: (await import('./search-params')).useSearchParams,
}));

const assignMock = vi.fn();
const SIGNED_IN = { data: { session: {} }, error: null };
const REFUSED = { data: null, error: { code: 'AUTH_CANCELLED', status: 400 } };
const BUTTON = { name: 'Sign In with a Passkey' };

/** The panel opened on its email view, whose address field is marked for passkey autofill. */
function renderWithField(next?: string) {
  setQuery('method=email');
  return render(<SignInPanel next={next} configured={['google']} />);
}

const stubConditional = (available: boolean) =>
  vi.stubGlobal('PublicKeyCredential', {
    isConditionalMediationAvailable: vi.fn(async () => available),
  });

/** Lets the hook's feature check and the ceremony it starts settle. */
const settle = () => act(async () => {});

beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, assign: assignMock });
  installHistory();
});

afterEach(() => {
  passkeyMock.mockReset();
  assignMock.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setQuery('');
});

describe('Sign In with a Passkey', () => {
  it('signs in with the browser prompt and lands through /sign-in carrying next', async () => {
    passkeyMock.mockResolvedValue(SIGNED_IN);
    render(<SignInPanel next="/coven/hearth" configured={['google']} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', BUTTON));
    });

    expect(passkeyMock).toHaveBeenCalledWith();
    expect(assignMock).toHaveBeenCalledWith('/sign-in?next=%2Fcoven%2Fhearth');
  });

  it('stays on the page and says so under the button when the passkey does not sign in', async () => {
    passkeyMock.mockResolvedValue(REFUSED);
    render(<SignInPanel configured={['google']} />);
    const button = screen.getByRole('button', BUTTON);

    await act(async () => {
      fireEvent.click(button);
    });

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(assignMock).not.toHaveBeenCalled();
    expect(button).not.toHaveAttribute('aria-disabled');
  });
});

describe('passkey autofill', () => {
  it('offers saved passkeys in the field where the browser supports it, and signs in with the one picked', async () => {
    stubConditional(true);
    passkeyMock.mockResolvedValue(SIGNED_IN);
    renderWithField();
    await settle();

    expect(passkeyMock).toHaveBeenCalledWith({ autoFill: true });
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/sign-in'));
  });

  it.each([
    ['answers that it cannot', () => stubConditional(false)],
    ['has no conditional mediation', () => vi.stubGlobal('PublicKeyCredential', {})],
    ['has no WebAuthn at all', () => vi.stubGlobal('PublicKeyCredential', undefined)],
  ])('starts no autofill where the browser %s', async (_, stub) => {
    stub();
    passkeyMock.mockResolvedValue(SIGNED_IN);
    renderWithField();
    await settle();

    expect(passkeyMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Email Address/)).toBeInTheDocument();
  });

  it('starts when the email view opens, and not on the view of buttons', async () => {
    stubConditional(true);
    passkeyMock.mockResolvedValue(REFUSED);
    render(<SignInPanel configured={['google']} />);
    await settle();
    expect(passkeyMock).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue with Email' }));
    });
    await settle();

    expect(passkeyMock).toHaveBeenCalledWith({ autoFill: true });
  });

  it('starts no autofill with no field on the page to offer it in', async () => {
    stubConditional(true);
    render(<PasskeyButton lastUsed={false} />);
    await settle();

    expect(passkeyMock).not.toHaveBeenCalled();
  });

  it('says nothing when the autofill ends unpicked', async () => {
    stubConditional(true);
    passkeyMock.mockResolvedValue(REFUSED);
    renderWithField();
    await settle();

    expect(passkeyMock).toHaveBeenCalledWith({ autoFill: true });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(assignMock).not.toHaveBeenCalled();
  });
});
