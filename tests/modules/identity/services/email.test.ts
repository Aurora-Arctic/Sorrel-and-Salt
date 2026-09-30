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
import type { EmailUserRow } from './types';

// Story 59's service half: asking for an address writes nothing to
// `users.email` — the address becomes the row's at verification — so an
// established account never re-enters the provisional sweep
// (claude-docs/auth.md, "The email page"). What goes out is the sender's
// business, which is why it is a fake here.

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

/** The seed leaves every fixture unverified; a test says which state it is about. */
async function setVerified(id: string, verified: boolean): Promise<void> {
  await sql`update users set email_verified = ${verified} where id = ${id}`;
}

beforeEach(async () => {
  vi.mocked(sender.resend).mockClear();
  vi.mocked(sender.requestChange).mockClear();
  // Both start unverified and stamped by someone else, so a stamp of their own
  // id is visible as this call's write.
  await sql`update users set email_verified = false, updated_by = ${A.id} where id = ${B.id}`;
  await sql`update users set email_verified = false where id = ${A.id}`;
  await setSentAt(B.id, null);
});

describe('validateEmailAddress', () => {
  it.each([
    ['', 'Enter an email address'],
    ['nope', "That doesn't look like an email address"],
    ['two@at@signs.test', "That doesn't look like an email address"],
    ['no-dot@host', "That doesn't look like an email address"],
    [`${'a'.repeat(250)}@long.test`, "That doesn't look like an email address"],
    ['discord-1@pending.invalid', "That address can't receive mail"],
  ])('refuses %j on the email field', (email, message) => {
    expect(validateEmailAddress(email)).toEqual({ path: ['email'], message });
  });

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
  it('refuses a malformed address on the email field, sending nothing and writing nothing', async () => {
    const before = await userRow(B.id);

    const refusal = setEmail(asUser(B), 'not-an-address', sender);

    await expect(refusal).rejects.toBeInstanceOf(ValidationError);
    await expect(refusal).rejects.toMatchObject({
      issues: [{ path: ['email'], message: "That doesn't look like an email address" }],
    });
    expect(sender.resend).not.toHaveBeenCalled();
    expect(sender.requestChange).not.toHaveBeenCalled();
    expect(await userRow(B.id)).toEqual(before);
  });

  it("refuses an address a live verified account holds, and accepts it once that account isn't verified", async () => {
    await setVerified(A.id, true);
    // Why the refusal below could otherwise be explained: A's row is live and verified.
    expect(await userRow(A.id)).toMatchObject({ email: A.email, email_verified: true });

    await expect(setEmail(asUser(B), A.email, sender)).rejects.toMatchObject({
      issues: [{ path: ['email'], message: 'That address is already in use by another account' }],
    });
    expect(sender.requestChange).not.toHaveBeenCalled();

    // The same address held by a provisional row is not refused: that row lapses.
    await setVerified(A.id, false);
    await expect(setEmail(asUser(B), A.email, sender)).resolves.toMatchObject({ id: B.id });
    expect(sender.requestChange).toHaveBeenCalledWith(B.email, A.email);
  });

  it("restarts a provisional caller's window, stamped as them, and mails the new address — the row's own stays", async () => {
    const before = await userRow(B.id);
    expect(before).toMatchObject({ email_verified: false, updated_by: A.id });

    const result = await setEmail(asUser(B), NEW, sender);

    expect(result.email).toBe(B.email);
    const after = await userRow(B.id);
    expect(after.email).toBe(B.email);
    expect(after.updated_by).toBe(B.id);
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
    expect(after.verification_sent_at).toBeInstanceOf(Date);
    expect(sender.requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW);
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
    expect(sender.requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW);
  });

  // One mail a minute per account, whichever path would send it, so the
  // mutation cannot be used to fill an inbox. The form's own cooldown
  // (claude-docs/components/email-form.md) is a courtesy; this is the rule.
  it('refuses another mail within a minute of the last, naming the wait, on both the change and the resend path', async () => {
    await setSentAt(B.id, '10 seconds');
    const before = await userRow(B.id);

    const change = setEmail(asUser(B), NEW, sender);
    await expect(change).rejects.toBeInstanceOf(ValidationError);
    await expect(change).rejects.toMatchObject({
      issues: [
        {
          path: ['email'],
          message: expect.stringMatching(
            /^Wait [45]\d seconds before sending another confirmation$/,
          ),
        },
      ],
    });

    await expect(setEmail(asUser(B), B.email, sender)).rejects.toMatchObject({
      issues: [{ path: ['email'], message: expect.stringMatching(/^Wait \d+ seconds/) }],
    });

    expect(sender.requestChange).not.toHaveBeenCalled();
    expect(sender.resend).not.toHaveBeenCalled();
    expect(await userRow(B.id)).toEqual(before);
  });

  it('sends again once the minute has passed', async () => {
    await setSentAt(B.id, '61 seconds');

    await expect(setEmail(asUser(B), NEW, sender)).resolves.toMatchObject({ id: B.id });

    expect(sender.requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW);
  });

  it("mails the row's own address again when it is asked for unchanged and still unverified", async () => {
    await setEmail(asUser(B), B.email, sender);

    expect(sender.resend).toHaveBeenCalledExactlyOnceWith(B.email);
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

    expect(sender.requestChange).toHaveBeenCalledExactlyOnceWith(B.email, NEW);
  });
});
