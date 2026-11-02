import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { ValidationError } from '@/lib/errors';
import {
  isPlaceholderEmail,
  placeholderEmail,
  setEmail,
  validateEmailAddress,
  type EmailVerificationSender,
} from '@/modules/identity';
import { A, B, asUser } from '../../../support/as-user';
import { asTouch } from '../../../support/db/touch-row';
import type { EmailUserRow } from './types';

// The service half: asking for an address writes nothing to `users.email`, since the address becomes the row's at verification, so an established account never re-enters the provisional sweep (claude-docs/auth/admin-bootstrap.md, "The email page").
// What goes out is the sender's business, which is why it is a fake here.

const DOMAIN = '@email-service.test';
const NEW = `new${DOMAIN}`;

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

const sender: EmailVerificationSender = {
  resend: vi.fn(async () => {}),
  requestChange: vi.fn(async () => {}),
  sessionIsFresh: vi.fn(async () => true),
  notifyChangeRequested: vi.fn(async () => {}),
  // Starts the task at once and leaves it running, as `after` does once the response is out.
  defer: vi.fn((task: () => Promise<void>) => {
    void task();
  }),
};

async function userRow(id: string): Promise<EmailUserRow> {
  const [row] = await sql`
    select id, email, email_verified, updated_by, updated_at, verification_sent_at
    from users where id = ${id}
  `;
  return row as EmailUserRow;
}

/** When the row's last verification mail went out; `null` for never. */
async function setSentAt(id: string, at: string | null): Promise<void> {
  await sql`update users set verification_sent_at = ${at === null ? null : sql`now() - ${at}::interval`} where id = ${id}`;
}

/** Moves the row's last touch back by `by`. The `set_updated_at` trigger overwrites any `updated_at` an UPDATE supplies, so it is switched off for this one statement, as provisional-accounts.test.ts does. Without that, a JS `Date` holds whole milliseconds and "later than before" could compare equal. */
async function backdateTouch(id: string, by: string): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`alter table users disable trigger set_updated_at`;
    await tx`update users set updated_at = now() - ${by}::interval where id = ${id}`;
    await tx`alter table users enable trigger set_updated_at`;
  });
}

/** The seed leaves every fixture unverified; a test says which state it is about. */
async function setVerified(id: string, verified: boolean): Promise<void> {
  await sql`update users set email_verified = ${verified} where id = ${id}`;
}

beforeEach(async () => {
  vi.mocked(sender.resend).mockClear();
  vi.mocked(sender.requestChange).mockClear();
  vi.mocked(sender.notifyChangeRequested).mockClear();
  vi.mocked(sender.sessionIsFresh).mockReset().mockResolvedValue(true);
  // Both start unverified and stamped by someone else, so a stamp of their own id shows as this call's write.
  // A save that changes no column keeps updated_by (migration 0079), so the stamp is written under the touch setting, as writeChildren does.
  await asTouch(
    sql,
    (tx) => tx`update users set email_verified = false, updated_by = ${A.id} where id = ${B.id}`,
  );
  await sql`update users set email_verified = false where id = ${A.id}`;
  await setSentAt(B.id, null);
});

describe('validateEmailAddress', () => {
  // One address per rule: empty, over-long (the shape rule is setEmail's
  // malformed case below), and a reserved domain that receives no mail.
  it.each(['', `${'a'.repeat(250)}@long.test`, 'discord-1@pending.invalid'])(
    'refuses %j on the email field',
    (email) => {
      expect(validateEmailAddress(email)).toEqual({ path: ['email'], message: expect.any(String) });
    },
  );

  it('accepts a plain address', () => {
    expect(validateEmailAddress('someone@example.test')).toBeNull();
  });
});

describe('the placeholder', () => {
  it('is under a reserved domain, lower-cased, and recognised as one', () => {
    const email = placeholderEmail('microsoft', 'ABC-123');

    expect(email).toBe('microsoft-abc-123@pending.invalid');
    expect(isPlaceholderEmail(email)).toBe(true);
    expect(isPlaceholderEmail(B.email)).toBe(false);
  });
});

describe('setEmail', () => {
  it('refuses a change from a session older than the window, with a message that says to sign in again, and sends and writes nothing', async () => {
    // The precondition that the change could otherwise have gone through: the address is free and the caller's row is not cooling down.
    expect(await userRow(B.id)).toMatchObject({ verification_sent_at: null });
    const before = await userRow(B.id);
    vi.mocked(sender.sessionIsFresh).mockResolvedValue(false);

    const refusal = setEmail(asUser(B), NEW, sender);

    await expect(refusal).rejects.toBeInstanceOf(ValidationError);
    await expect(refusal).rejects.toMatchObject({
      issues: [{ path: ['email'], message: expect.stringMatching(/sign in again/i) }],
    });
    expect(sender.requestChange).not.toHaveBeenCalled();
    expect(sender.notifyChangeRequested).not.toHaveBeenCalled();
    expect(await userRow(B.id)).toEqual(before);
  });

  it('takes the same change from a fresh session, and tells the current address once', async () => {
    await setEmail(asUser(B), NEW, sender);

    expect(sender.requestChange).toHaveBeenCalledTimes(1);
    expect(sender.notifyChangeRequested).toHaveBeenCalledTimes(1);
    expect(sender.notifyChangeRequested).toHaveBeenCalledWith(B.email, NEW);
  });

  it.each([
    ['a free address', NEW],
    ['an address a verified account holds', A.email],
  ])('answers %s without waiting for any mail to go out', async (_name, address) => {
    await setVerified(A.id, true);
    const stuck = new Promise<void>(() => {});
    const slow: EmailVerificationSender = {
      ...sender,
      requestChange: vi.fn(() => stuck),
      notifyChangeRequested: vi.fn(() => stuck),
    };
    const timedOut = Symbol('timed out');
    const timeout = new Promise<symbol>((resolve) => setTimeout(() => resolve(timedOut), 1000));

    const outcome = await Promise.race([setEmail(asUser(B), address, slow), timeout]);

    expect(outcome).not.toBe(timedOut);
    // The send was handed over to run after the answer, not dropped.
    expect(slow.notifyChangeRequested).toHaveBeenCalledWith(B.email, address);
  });

  it("does not ask a stale session for freshness when it only asks for the row's own link again", async () => {
    vi.mocked(sender.sessionIsFresh).mockResolvedValue(false);

    await setEmail(asUser(B), B.email, sender);

    expect(sender.resend).toHaveBeenCalledTimes(1);
    expect(sender.notifyChangeRequested).not.toHaveBeenCalled();
  });

  it('refuses a malformed address on the email field, sending nothing and writing nothing', async () => {
    const before = await userRow(B.id);

    const refusal = setEmail(asUser(B), 'not-an-address', sender);

    await expect(refusal).rejects.toBeInstanceOf(ValidationError);
    await expect(refusal).rejects.toMatchObject({ issues: [{ path: ['email'] }] });
    expect(sender.resend).not.toHaveBeenCalled();
    expect(sender.requestChange).not.toHaveBeenCalled();
    expect(await userRow(B.id)).toEqual(before);
  });

  it('answers an address a live verified account holds exactly as it answers a free one, mailing the holder nothing', async () => {
    await setVerified(A.id, true);
    // Why the held address could otherwise be refused: A's row is live and verified.
    expect(await userRow(A.id)).toMatchObject({ email: A.email, email_verified: true });

    const free = await setEmail(asUser(B), NEW, sender);
    const freeMailed = vi.mocked(sender.requestChange).mock.calls.length;
    vi.mocked(sender.requestChange).mockClear();
    await setSentAt(B.id, null);
    const held = await setEmail(asUser(B), A.email, sender);

    const stable = ({ updatedAt: _a, updatedBy: _b, ...rest }: typeof free) => rest;
    expect(stable(held)).toEqual(stable(free));
    // The difference is real: the free address was mailed its link and the held one was not, nor was its holder.
    expect(freeMailed).toBe(1);
    expect(sender.requestChange).not.toHaveBeenCalled();
    expect(sender.resend).not.toHaveBeenCalled();
    // The request still counts: the row is stamped and the address being left told, so the two cases cost the same cooldown.
    expect((await userRow(B.id)).verification_sent_at).not.toBeNull();
    expect(sender.notifyChangeRequested).toHaveBeenLastCalledWith(B.email, A.email);
  });

  it('holds a held address to the same cooldown as a free one, so the wait gives nothing away', async () => {
    await setVerified(A.id, true);
    await setSentAt(B.id, '10 seconds');

    const heldWait = setEmail(asUser(B), A.email, sender);
    const freeWait = setEmail(asUser(B), NEW, sender);

    const [held, free] = await Promise.all([
      heldWait.catch((failure: ValidationError) => failure),
      freeWait.catch((failure: ValidationError) => failure),
    ]);
    expect(held).toBeInstanceOf(ValidationError);
    expect(held).toEqual(free);
  });

  it('accepts a held address the same way once the holder is no longer verified', async () => {
    await expect(setEmail(asUser(B), A.email, sender)).resolves.toMatchObject({ id: B.id });
    expect(sender.requestChange).toHaveBeenCalledWith(B.email, A.email, undefined);
  });

  it("restarts a provisional caller's window, stamped as them, and mails the new address — the row's own stays", async () => {
    // The window can only be seen to restart from a last touch that is not a moment ago.
    await backdateTouch(B.id, '1 hour');
    const before = await userRow(B.id);
    expect(before).toMatchObject({ email_verified: false, updated_by: A.id });

    const result = await setEmail(asUser(B), NEW, sender);

    expect(result.email).toBe(B.email);
    const after = await userRow(B.id);
    expect(after.email).toBe(B.email);
    expect(after.updated_by).toBe(B.id);
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
    expect(after.verification_sent_at).toBeInstanceOf(Date);
    expect(sender.requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW, undefined);
    expect(sender.resend).not.toHaveBeenCalled();
  });

  it("writes only the mail's clock for a verified caller: address and verified state are as they were, and the new address is mailed", async () => {
    await setVerified(B.id, true);
    const before = await userRow(B.id);
    expect(before).toMatchObject({ email_verified: true, verification_sent_at: null });

    await setEmail(asUser(B), NEW, sender);

    const after = await userRow(B.id);
    expect(after).toMatchObject({ email: before.email, email_verified: true, updated_by: B.id });
    expect(after.verification_sent_at).toBeInstanceOf(Date);
    expect(sender.requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW, undefined);
  });

  // One mail a minute per account, whichever path would send it, so the
  // mutation cannot be used to fill an inbox. The form's own cooldown
  // (claude-docs/components/email-form.md) is a courtesy; this is the rule.
  it('refuses another mail within a minute of the last, naming the wait, on both the change and the resend path', async () => {
    await setSentAt(B.id, '10 seconds');
    const before = await userRow(B.id);

    const change = setEmail(asUser(B), NEW, sender);
    await expect(change).rejects.toBeInstanceOf(ValidationError);
    // The seconds left are the data the refusal carries.
    await expect(change).rejects.toMatchObject({
      issues: [{ path: ['email'], message: expect.stringMatching(/\b[45]\d\b/) }],
    });

    await expect(setEmail(asUser(B), B.email, sender)).rejects.toMatchObject({
      issues: [{ path: ['email'] }],
    });

    expect(sender.requestChange).not.toHaveBeenCalled();
    expect(sender.resend).not.toHaveBeenCalled();
    expect(await userRow(B.id)).toEqual(before);
  });

  it('sends again once the minute has passed', async () => {
    await setSentAt(B.id, '61 seconds');

    await expect(setEmail(asUser(B), NEW, sender)).resolves.toMatchObject({ id: B.id });

    expect(sender.requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW, undefined);
  });

  it("mails the row's own address again when it is asked for unchanged and still unverified", async () => {
    await setEmail(asUser(B), B.email, sender);

    expect(sender.resend).toHaveBeenCalledExactlyOnceWith(B.email, undefined);
    expect(sender.requestChange).not.toHaveBeenCalled();
  });

  it("does nothing for the row's own address once verified, and never refuses it for the wait", async () => {
    await setVerified(B.id, true);
    await setSentAt(B.id, '10 seconds');
    const before = await userRow(B.id);

    await expect(setEmail(asUser(B), B.email, sender)).resolves.toMatchObject({ id: B.id });

    expect(sender.resend).not.toHaveBeenCalled();
    expect(sender.requestChange).not.toHaveBeenCalled();
    expect(await userRow(B.id)).toEqual(before);
  });

  it('normalises what was typed before comparing or mailing it', async () => {
    await setEmail(asUser(B), `  New${DOMAIN.toUpperCase()} `, sender);

    expect(sender.requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW, undefined);
  });

  // Where the page was sent from rides on the link's landing; guarding it is
  // the sender's, where the link is built, so the service passes it as given.
  it('hands the sender the return path on both the change and the resend path', async () => {
    await setEmail(asUser(B), NEW, sender, '/admin');

    expect(sender.requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW, '/admin');

    await setSentAt(B.id, null);
    await setEmail(asUser(B), B.email, sender, '/admin');

    expect(sender.resend).toHaveBeenCalledExactlyOnceWith(B.email, '/admin');
  });
});
