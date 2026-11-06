import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import PageHeader from '../../../../../components/PageHeader';
import { SUPPORT_ABOUTS } from '../../../../../lib/support-path';
import { statusBadgeClass } from '../../../../../components/SupportRequests/status-badge';
import SupportSenderRequest from '../../../../../components/SupportSenderRequest';
import { senderStatusLabel } from '../../../../../components/SupportSenderRequest/status';
import SupportViewReplyForm from '../../../../../components/SupportViewReplyForm';
import { NotFound } from '../../../../../lib/errors';
import { getSupportRequestByViewToken } from '../../../../../modules/support';

// The page a signed-out sender's mails link to: one request and its public replies, opened by the token in the path with no
// session. Never indexed or cached, and the headers in src/lib/security-headers.ts send no referrer from it, since the
// address holds the token.
export const metadata: Metadata = {
  title: 'Your Support Request',
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
  const about =
    SUPPORT_ABOUTS.find((option) => option.value === request.about)?.label ?? request.about;
  const staffWroteLast = request.replies[request.replies.length - 1]?.authorRole === 'staff';
  // The request is drawn by the signed-in sender's own view, so the two read alike; only the reply form differs.
  return (
    <div className="page-with-nav">
      <PageHeader eyebrow={`Support · ${about}`} title={request.subject} />
      <div className="badges">
        <span className={statusBadgeClass(request.status)}>
          {senderStatusLabel(request.status, staffWroteLast)}
        </span>
      </div>
      <SupportSenderRequest
        request={{
          id: request.id,
          about: request.about,
          subject: request.subject,
          status: request.status,
          message: request.message,
          createdAt: request.createdAt,
          path: null,
          errorCode: null,
          replies: request.replies.map((reply) => ({
            id: reply.id,
            body: reply.body,
            createdAt: reply.createdAt,
            fromSender: reply.authorRole === 'sender',
          })),
          followUpId: null,
          timedOut: null,
        }}
        reply={<SupportViewReplyForm token={token} />}
      />
    </div>
  );
}
