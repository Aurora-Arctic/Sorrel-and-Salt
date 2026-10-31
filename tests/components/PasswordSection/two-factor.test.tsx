import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TwoFactorSettings, {
  PASSWORD_SIGN_IN_PAUSED_MESSAGE,
  STALE_SESSION,
  WRONG_PASSWORD,
} from '@/components/PasswordSection/two-factor';
import { WRONG_CODE } from '@/components/SignInPanel/two-factor-step';
import { makeQueryClient } from '@/lib/graphql-client';

// Story 75's switch on the account page. Better Auth's client is mocked at the three calls it makes;
// tests/db/two-factor.test.ts proves what the server does with each.
const enable = vi.fn();
const disable = vi.fn();
const verifyTotp = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  twoFactor: {
    enable: (...args: unknown[]) => enable(...args),
    disable: (...args: unknown[]) => disable(...args),
    verifyTotp: (...args: unknown[]) => verifyTotp(...args),
  },
}));

const PASSWORD = 'Testwort hums along the hedge';
const SECRET = 'JBSWY3DPEHPK3PXP';
const TOTP_URI = `otpauth://totp/Sorrel%20%26%20Salt:someone%40two-factor.test?secret=${SECRET}&issuer=Sorrel%20%26%20Salt&digits=6&period=30`;
const BACKUP_CODES = ['aaaaa-11111', 'bbbbb-22222', 'ccccc-33333'];

// The account page wraps the switch in its own section and heading; this is that frame.
function renderSection(twoFactorEnabled: boolean) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <section aria-labelledby="two-factor-heading">
        <h2 id="two-factor-heading">Two-Factor Sign-In</h2>
        <TwoFactorSettings enabled={twoFactorEnabled} />
      </section>
    </QueryClientProvider>,
  );
}

const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

const twoFactorRegion = () => screen.getByRole('region', { name: 'Two-Factor Sign-In' });
const field = (label: string) =>
  within(twoFactorRegion()).getByLabelText(new RegExp(`^${label}`), { selector: 'input' });
const type = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } });
const button = (name: string) => within(twoFactorRegion()).getByRole('button', { name });
// Which way the switch stands, read from the one action it offers.
const isOn = () =>
  within(twoFactorRegion()).queryByRole('button', { name: 'Turn Off Two-Factor' }) !== null;
const isOff = () =>
  within(twoFactorRegion()).queryByRole('button', { name: 'Turn On Two-Factor' }) !== null;

async function startEnrolment() {
  enable.mockResolvedValue({ data: { totpURI: TOTP_URI, backupCodes: BACKUP_CODES }, error: null });
  renderSection(false);
  type('Confirm Your Password', PASSWORD);
  await press(button('Turn On Two-Factor'));
}

describe('TwoFactorSettings', () => {
  afterEach(() => {
    enable.mockReset();
    disable.mockReset();
    verifyTotp.mockReset();
  });

  it('asks for the password before turning on, and keeps the button disabled until it is typed', async () => {
    renderSection(false);

    expect(button('Turn On Two-Factor')).toBeDisabled();
    type('Confirm Your Password', PASSWORD);
    expect(button('Turn On Two-Factor')).toBeEnabled();
  });

  it('shows the QR code, the key and the backup codes, and is not on until a code is confirmed', async () => {
    await startEnrolment();

    expect(enable).toHaveBeenCalledWith({ password: PASSWORD });
    expect(within(twoFactorRegion()).getByRole('img', { name: /QR code/ })).toBeInTheDocument();
    expect(within(twoFactorRegion()).getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    const codes = within(twoFactorRegion()).getByRole('list', { name: 'Backup Codes' });
    expect(
      within(codes)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(BACKUP_CODES);
    expect(verifyTotp).not.toHaveBeenCalled();
    expect(isOn()).toBe(false);
  });

  it('turns on with a code from the app, and no longer shows the codes', async () => {
    verifyTotp.mockResolvedValue({ data: {}, error: null });
    await startEnrolment();

    type('Code From Your App', '123 456');
    await press(button('Confirm and Turn On'));

    expect(verifyTotp).toHaveBeenCalledWith({ code: '123456' });
    expect(isOn()).toBe(true);
    expect(within(twoFactorRegion()).queryByText('JBSW Y3DP EHPK 3PXP')).not.toBeInTheDocument();
    expect(
      within(twoFactorRegion()).queryByRole('list', { name: 'Backup Codes' }),
    ).not.toBeInTheDocument();
  });

  it('says a wrong code with the field and stays off', async () => {
    verifyTotp.mockResolvedValue({ data: null, error: { status: 401, code: 'INVALID_CODE' } });
    await startEnrolment();

    type('Code From Your App', '000000');
    await press(button('Confirm and Turn On'));

    expect(field('Code From Your App')).toHaveAccessibleDescription(
      expect.stringContaining(WRONG_CODE),
    );
    expect(isOn()).toBe(false);
  });

  it('says a wrong password with the field when turning on', async () => {
    enable.mockResolvedValue({ data: null, error: { status: 400, code: 'INVALID_PASSWORD' } });
    renderSection(false);

    type('Confirm Your Password', 'Testwort guesses wrongly');
    await press(button('Turn On Two-Factor'));

    expect(field('Confirm Your Password')).toHaveAccessibleDescription(
      expect.stringContaining(WRONG_PASSWORD),
    );
  });

  it.each([
    ['turning on', false, enable, 'Turn On Two-Factor'],
    ['turning off', true, disable, 'Turn Off Two-Factor'],
  ] as const)(
    'says password sign-in is paused, not that the password is wrong, when %s during a lock',
    async (_name, startsOn, call, action) => {
      call.mockResolvedValue({
        data: null,
        error: { status: 400, code: 'PASSWORD_SIGN_IN_PAUSED' },
      });
      renderSection(startsOn);

      type('Confirm Your Password', PASSWORD);
      await press(button(action));

      expect(call).toHaveBeenCalledWith({ password: PASSWORD });
      const described = (field('Confirm Your Password').getAttribute('aria-describedby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ');
      const alert = within(twoFactorRegion()).queryByRole('alert')?.textContent ?? '';
      expect(described + alert).toContain(PASSWORD_SIGN_IN_PAUSED_MESSAGE);
      expect(described + alert).not.toContain(WRONG_PASSWORD);
    },
  );

  describe('saving the backup codes', () => {
    const EXPECTED = BACKUP_CODES.join('\n');

    it('copies the codes one per line', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      await startEnrolment();

      await press(button('Copy'));

      expect(writeText).toHaveBeenCalledWith(EXPECTED);
    });

    it('downloads the codes one per line as a text file', async () => {
      const blobs: Blob[] = [];
      URL.createObjectURL = vi.fn((blob: Blob) => (blobs.push(blob), 'blob:codes'));
      URL.revokeObjectURL = vi.fn();
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      await startEnrolment();

      await press(button('Download'));

      expect(click).toHaveBeenCalledOnce();
      expect(blobs).toHaveLength(1);
      expect(await blobs[0].text()).toBe(EXPECTED);
      click.mockRestore();
    });

    it('prints the codes one per line', async () => {
      const print = vi.fn();
      const page = document.implementation.createHTMLDocument('');
      const open = vi.spyOn(window, 'open').mockReturnValue({
        document: page,
        print,
        focus: vi.fn(),
        close: vi.fn(),
      } as unknown as Window);
      await startEnrolment();

      await press(button('Print'));

      expect(print).toHaveBeenCalledOnce();
      expect(page.body.textContent).toBe(EXPECTED);
      open.mockRestore();
    });
  });

  it('turns off with the password', async () => {
    disable.mockResolvedValue({ data: { status: true }, error: null });
    renderSection(true);
    expect(isOn()).toBe(true);

    type('Confirm Your Password', PASSWORD);
    await press(button('Turn Off Two-Factor'));

    expect(disable).toHaveBeenCalledWith({ password: PASSWORD });
    expect(isOff()).toBe(true);
  });

  it('stays on when the password to turn it off is wrong', async () => {
    disable.mockResolvedValue({ data: null, error: { status: 400, code: 'INVALID_PASSWORD' } });
    renderSection(true);

    type('Confirm Your Password', 'Testwort guesses wrongly');
    await press(button('Turn Off Two-Factor'));

    expect(field('Confirm Your Password')).toHaveAccessibleDescription(
      expect.stringContaining(WRONG_PASSWORD),
    );
    expect(isOn()).toBe(true);
  });

  it('says turning off needs a recent sign-in when the session is too old, and stays on', async () => {
    disable.mockResolvedValue({ data: null, error: { status: 403, code: 'SESSION_NOT_FRESH' } });
    renderSection(true);

    type('Confirm Your Password', PASSWORD);
    await press(button('Turn Off Two-Factor'));

    expect(within(twoFactorRegion()).getByRole('alert')).toHaveTextContent(STALE_SESSION);
    expect(isOn()).toBe(true);
  });
});
