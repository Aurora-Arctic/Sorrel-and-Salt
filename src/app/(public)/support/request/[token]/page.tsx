import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import LocalTime from '../../../../../components/LocalTime';
import PageHeader from '../../../../../components/PageHeader';
import SupportViewReplyForm from '../../../../../components/SupportViewReplyForm';
import { NotFound } from '../../../../../lib/errors';
import { getSupportRequestByViewToken } from '../../../../../modules/support';

// The page a signed-out sender's mails link to: one request and its public replies, opened by the token in the path with no
// session. Never indexed or cached, and the headers in src/lib/security-headers.ts send no referrer from it, since the
// address holds the token.
export const metadata: Metadata = {
  title: 'Your Request',
  robots: { index: false, follow: false },
};

export default async function SupportRequestByLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const request = await getSupportRequestByViewToken(token).catch((error: unknown) => {
    if (error instanceof NotFound) notFound();
    throw error;
  });
  return (
    <div className="page-with-nav">
      <PageHeader eyebrow="Support" title={request.subject} lede={request.message} />
      <ol>
        {request.replies.map((reply) => (
          <li key={reply.id}>
            <p>
              {reply.authorRole === 'sender' ? 'You' : 'Support'},{' '}
              <LocalTime at={reply.createdAt} long />
            </p>
            <p>{reply.body}</p>
          </li>
        ))}
      </ol>
      {request.status === 'closed' ? (
        <p>This request is closed. To write again, send a new request from the Support page.</p>
      ) : (
        <SupportViewReplyForm token={token} />
      )}
    </div>
  );
}
