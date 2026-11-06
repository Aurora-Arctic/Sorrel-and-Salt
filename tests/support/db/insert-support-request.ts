import type postgres from 'postgres';

// The one raw way a test seeds a support request and its replies, without the send or reply services, so setup writes no
// audit and starts no mail (claude-docs/testing/fixture-factories.md, "Fixture factories").

/** A request as a sender left it. */
export interface SupportRequestFixture {
  /** The account that sent it; it stamps both audit columns. */
  createdBy: string;
  /** The address a signed-out sender gave; null for a signed-in sender. */
  senderEmail?: string | null;
  subject?: string;
  status?: 'open' | 'resolved' | 'closed';
}

/** Writes the request and returns its id. */
export async function insertSupportRequest(
  sql: postgres.Sql,
  {
    createdBy,
    senderEmail = null,
    subject = 'The Testwort jar will not open',
    status = 'open',
  }: SupportRequestFixture,
): Promise<string> {
  const [row] = await sql`
    insert into support_requests (about, subject, message, path, status, sender_email, created_by, updated_by)
    values ('account', ${subject}, 'It sticks at the lid.', '/support', ${status}, ${senderEmail},
      ${createdBy}, ${createdBy})
    returning id`;
  return row!.id as string;
}

/** A reply as its author left it. */
export interface SupportReplyFixture {
  role: 'sender' | 'staff';
  createdBy: string;
  body: string;
  visibility?: 'public' | 'internal';
}

/** Writes one reply on `requestId` and returns its id. */
export async function insertSupportReply(
  sql: postgres.Sql,
  requestId: string,
  { role, createdBy, body, visibility = 'public' }: SupportReplyFixture,
): Promise<string> {
  const [row] = await sql`
    insert into support_replies (request_id, body, author_role, visibility, created_by, updated_by)
    values (${requestId}, ${body}, ${role}, ${visibility}, ${createdBy}, ${createdBy})
    returning id`;
  return row!.id as string;
}
