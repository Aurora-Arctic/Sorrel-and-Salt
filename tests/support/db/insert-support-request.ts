import type postgres from 'postgres';

// The one raw way a test seeds a support request and its replies, without the send or reply services, so setup writes no
// audit and starts no mail (claude-docs/testing/fixture-factories.md, "Fixture factories").

export interface SupportRequestFixture {
  createdBy: string;
  senderEmail?: string | null;
  subject?: string;
  status?: 'open' | 'resolved' | 'closed';
}

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

export interface SupportReplyFixture {
  role: 'sender' | 'staff';
  createdBy: string;
  body: string;
  visibility?: 'public' | 'internal';
}

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
