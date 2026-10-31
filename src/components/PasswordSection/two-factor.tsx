'use client';

import { QrCode } from '@ark-ui/react/qr-code';
import { type FormEvent, type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { twoFactor, useSession } from '../../lib/auth-client';
import { useLeaveGuard } from '../../lib/navigation';
import { SITE_NAME } from '../../lib/site';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import { CopyIcon, DownloadIcon, PrintIcon } from '../IconTip';
import IconTip from '../IconTip';
import InfoTip from '../InfoTip';
import Modal from '../Modal';
import Notice from '../Notice';
import PasswordField from '../PasswordField';
import { TOO_MANY_ATTEMPTS } from '../SignInPanel/password-form';
import { WRONG_CODE } from '../SignInPanel/two-factor-step';
import type { TwoFactorSettingsProps } from './types';

// Turning two-factor on and off, inside its own section of the account page. Turning on takes the password, then
// shows the app's QR code and the backup codes once, and is on only when a code from the app is
// confirmed; turning off takes the password (claude-docs/components/password-section.md, "Two-factor").

export const WRONG_PASSWORD = "That isn't your password.";
export const GENERIC_TWO_FACTOR_ERROR = "We couldn't change two-factor. Please try again.";
// A lock on password sign-in holds the right password here too; the owner is told the lock is why.
export const PASSWORD_SIGN_IN_PAUSED_MESSAGE =
  'Password sign-in is paused for this account after too many wrong passwords. Please wait a few minutes, then try again.';
// Turning off wants a session younger than Better Auth's `freshAge`, a day, as removing a sign-in method does.
export const STALE_SESSION =
  'Turning two-factor off needs a recent sign-in. Sign out and sign back in, then turn it off.';

interface Enrolment {
  totpURI: string;
  backupCodes: string[];
}

interface Failure {
  status?: number;
  code?: string;
}

interface Refusal {
  alert?: string;
  password?: string;
  code?: string;
}

function refusal(failure: Failure): Refusal {
  if (failure.code === 'PASSWORD_SIGN_IN_PAUSED') return { alert: PASSWORD_SIGN_IN_PAUSED_MESSAGE };
  if (failure.code === 'INVALID_PASSWORD') return { password: WRONG_PASSWORD };
  if (failure.code === 'INVALID_CODE') return { code: WRONG_CODE };
  if (failure.code === 'SESSION_NOT_FRESH') return { alert: STALE_SESSION };
  if (failure.status === 429) return { alert: TOO_MANY_ATTEMPTS };
  return { alert: GENERIC_TWO_FACTOR_ERROR };
}

/** The key the app is given, for typing in when the QR code cannot be scanned. */
function keyOf(totpURI: string): string {
  return new URL(totpURI).searchParams.get('secret') ?? '';
}

const codesText = ({ backupCodes }: Enrolment): string => backupCodes.join('\n');

/** The key in groups of four, as an authenticator app shows it, for reading off and typing in. */
function groupedKey(key: string): string {
  return key.replace(/(.{4})(?=.)/g, '$1 ');
}


const CODES_FILE = 'sorrel-and-salt-backup-codes.txt';

/** Hands the codes to the browser as a text file, one per line. */
function downloadCodes(text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = CODES_FILE;
  link.click();
  URL.revokeObjectURL(url);
}

// The print window has none of the app's stylesheets, so the page carries its own: two equal
// columns with each code centred, as on screen.
const PRINT_STYLE = `
  body { font-family: sans-serif; margin: 2rem; }
  h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
  p { margin: 0 0 0.5rem; }
  ul { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem 2rem; margin: 1.5rem 0 0; padding: 0; list-style: none; text-align: center; }
  code { font-family: monospace; font-size: 1.25rem; }
`;

/**
 * Prints the codes alone, from a window of their own, since the account page around them is not for paper.
 * The sheet says what the codes are for, whose they are and when they were printed; the browser does not
 * hand over the moment they were generated, and they are shown once, so the print date stands in for it.
 */
function printCodes(codes: string[], email: string | undefined): void {
  const page = window.open('', '_blank');
  if (!page) return;
  const { document: doc } = page;
  const add = (tag: string, text: string, parent: Element = doc.body): HTMLElement => {
    const element = doc.createElement(tag);
    element.textContent = text;
    parent.append(element);
    return element;
  };
  doc.title = `${SITE_NAME} Backup Codes`;
  add('style', PRINT_STYLE, doc.head);
  add('h1', `${SITE_NAME} Backup Codes`);
  if (email) add('p', email);
  add('p', new Date().toLocaleDateString(undefined, { dateStyle: 'long' }));
  add('p', "Each code signs you in once, if you can't use your authenticator app.");
  const list = add('ul', '');
  for (const backupCode of codes) add('code', backupCode, add('li', '', list));
  page.focus();
  page.print();
  page.close();
}

/** An icon-only button with its tip above; the label names it for a screen reader. */
const CodeAction = ({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactElement;
  onClick: () => void;
}): ReactElement => (
  <IconTip tip={label} placement="above">
    <button type="button" className="icon-tip__edit icon-tip__edit--plain" onClick={onClick}>
      {icon}
      <span className="visually-hidden">{label}</span>
    </button>
  </IconTip>
);

const TwoFactorSettings = ({ enabled }: TwoFactorSettingsProps): ReactElement => {
  const email = useSession().data?.user.email;
  const codeId = useId();
  const tipId = useId();
  const keptId = useId();
  const [on, setOn] = useState(enabled);
  const [enrolment, setEnrolment] = useState<Enrolment>();
  // Whether Copy, Download or Print has been pressed for these codes, after which leaving needs no warning.
  const [kept, setKept] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Refusal>({});
  const [saved, setSaved] = useState<'on' | 'off'>();

  // The codes are shown once: leaving before any is saved asks first (a tab close or reload gets the browser's own question).
  // An in-app navigation is held by a dialog, kept here until Leave or Stay answers it.
  const [leaving, setLeaving] = useState<{ go: () => void }>();
  const stayRef = useRef<HTMLButtonElement>(null);
  useLeaveGuard(enrolment !== undefined && !kept, (proceed) => setLeaving({ go: proceed }));
  // Focus starts on Stay, the safe answer, once the dialog is open.
  useEffect(() => {
    if (leaving) queueMicrotask(() => stayRef.current?.focus());
  }, [leaving]);

  const entered = code.replace(/\s/g, '');

  // Better Auth answers `{ error }` for a refusal and throws for a dropped connection; both arrive here.
  const run = async <T,>(
    call: () => Promise<{ data: T | null; error: Failure | null }>,
  ): Promise<T | undefined> => {
    setPending(true);
    setProblem({});
    setSaved(undefined);
    const { data, error } = await call().catch(() => ({ data: null, error: {} as Failure }));
    setPending(false);
    if (error || !data) {
      setProblem(refusal(error ?? {}));
      return undefined;
    }
    return data;
  };

  const start = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (password === '' || pending) return;
    const data = await run(() => twoFactor.enable({ password }));
    if (!data) return;
    // The emailed-code method is not configured, so the answer always carries the app's details.
    if (!('totpURI' in data)) {
      setProblem({ alert: GENERIC_TWO_FACTOR_ERROR });
      return;
    }
    setPassword('');
    setKept(false);
    setEnrolment({ totpURI: data.totpURI, backupCodes: data.backupCodes });
  };

  const confirm = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (entered === '' || pending) return;
    const data = await run(() => twoFactor.verifyTotp({ code: entered }));
    if (!data) return;
    setCode('');
    setEnrolment(undefined);
    setOn(true);
    setSaved('on');
  };

  const turnOff = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (password === '' || pending) return;
    const data = await run(() => twoFactor.disable({ password }));
    if (!data) return;
    setPassword('');
    setOn(false);
    setSaved('off');
  };

  const cancel = (): void => {
    setEnrolment(undefined);
    setCode('');
    setProblem({});
  };

  const codeField = fieldDescription({ id: codeId, error: problem.code });

  return (
    <div className="two-factor">
      {leaving &&
        createPortal(
          <Modal title="Leave Without Saving Your Codes?" onClose={() => setLeaving(undefined)}>
            {(close) => (
              <>
                <p>Your backup codes won&apos;t be shown again.</p>
                <div className="modal__actions">
                  <button
                    type="button"
                    className="btn btn--destructive"
                    onClick={() => {
                      leaving.go();
                      close();
                    }}
                  >
                    Leave
                  </button>
                  <button ref={stayRef} type="button" className="btn btn--quiet" onClick={close}>
                    Stay
                  </button>
                </div>
              </>
            )}
          </Modal>,
          document.body,
        )}
      {problem.alert && <Notice kind="error">{problem.alert}</Notice>}
      {saved === 'on' && (
        <Notice kind="success">
          Two-factor is on. Signing in with your password now also asks for a code from your app.
        </Notice>
      )}
      {saved === 'off' && <Notice kind="success">Two-factor is off.</Notice>}
      {enrolment ? (
        <>
          <ol className="two-factor__steps">
            <li>
              <p>Scan this QR code with your authenticator app.</p>
              <QrCode.Root value={enrolment.totpURI} className="two-factor__qr">
                <QrCode.Frame role="img" aria-label="QR code for your authenticator app">
                  <QrCode.Pattern />
                </QrCode.Frame>
              </QrCode.Root>
              <p>If you can&apos;t scan it, enter this key in the app instead:</p>
              <p className="two-factor__well">
                <code className="two-factor__key">{groupedKey(keyOf(enrolment.totpURI))}</code>
              </p>
              <div className="two-factor__code-actions">
                <CodeAction
                  label="Copy Key"
                  icon={<CopyIcon />}
                  onClick={() => void navigator.clipboard?.writeText(keyOf(enrolment.totpURI))}
                />
              </div>
            </li>
            <li>
              <p>
                Save these backup codes somewhere safe. Each one signs you in once if you lose your
                app. They won&apos;t be shown again.
              </p>
              <ul className="two-factor__codes two-factor__well" aria-label="Backup Codes">
                {enrolment.backupCodes.map((backupCode) => (
                  <li key={backupCode}>
                    <code>{backupCode}</code>
                  </li>
                ))}
              </ul>
              <div className="two-factor__code-actions">
                <CodeAction
                  label="Copy"
                  icon={<CopyIcon />}
                  onClick={() => {
                    setKept(true);
                    void navigator.clipboard?.writeText(codesText(enrolment));
                  }}
                />
                <CodeAction
                  label="Download"
                  icon={<DownloadIcon />}
                  onClick={() => {
                    setKept(true);
                    downloadCodes(codesText(enrolment));
                  }}
                />
                <CodeAction
                  label="Print"
                  icon={<PrintIcon />}
                  onClick={() => {
                    setKept(true);
                    printCodes(enrolment.backupCodes, email);
                  }}
                />
              </div>
            </li>
            <li>
              <p>Enter the six-digit code the app now shows to turn two-factor on.</p>
            </li>
          </ol>
          {/* `noValidate`: every refusal is the server's, worded and placed like the rest. */}
          <form className="form" onSubmit={(event) => void confirm(event)} noValidate>
            <FieldShell label="Code From Your App" required {...codeField}>
              <input
                id={codeField.controlId}
                className="input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                aria-required
                {...codeField.aria}
              />
            </FieldShell>
            <div className="form__actions">
              <BusyButton
                type="submit"
                className="btn btn--solid"
                disabled={entered === '' || pending || !kept}
                aria-describedby={kept ? undefined : keptId}
                busy={pending}
                busyLabel="Turning On"
              >
                Confirm and Turn On
              </BusyButton>
              <button type="button" className="btn btn--quiet" onClick={cancel}>
                Cancel
              </button>
            </div>
            {!kept && <p id={keptId}>Copy, download or print your backup codes first.</p>}
          </form>
        </>
      ) : (
        <>
          <p className="two-factor__status">
            {on ? 'Two-factor is on.' : 'Two-factor is off.'}
            <InfoTip id={tipId} label="Two-Factor">
              {on
                ? 'Signing in with your password also asks for a code from your authenticator app. Enter your password to turn it off.'
                : 'With it on, signing in with your password also asks for a code from an authenticator app, so a stolen password alone does not open your account.'}
            </InfoTip>
          </p>
          <form
            className="form"
            onSubmit={(event) => void (on ? turnOff(event) : start(event))}
            noValidate
          >
            <PasswordField
              label="Confirm Your Password"
              purpose="current"
              value={password}
              onChange={setPassword}
              error={problem.password}
              required
            />
            <div className="form__actions">
              <BusyButton
                type="submit"
                className={on ? 'btn btn--destructive' : 'btn btn--solid'}
                disabled={password === '' || pending}
                busy={pending}
                busyLabel={on ? 'Turning Off' : 'Turning On'}
              >
                {on ? 'Turn Off Two-Factor' : 'Turn On Two-Factor'}
              </BusyButton>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default TwoFactorSettings;
