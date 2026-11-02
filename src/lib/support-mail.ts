import type { SupportNotifier } from '@/modules/support';
import { requestOrigin } from './request-origin';

// The origin the support mails link from. It is Better Auth's, resolved against its allowed hosts, so a forged Host cannot point
// the link at another site. Handed to the service by the GraphQL context; the mails themselves are rendered by their jobs' steps
// (src/lib/support-job-mail.ts).

export function supportNotifier(request: Request): SupportNotifier {
  return { origin: () => requestOrigin(request, '/') };
}
