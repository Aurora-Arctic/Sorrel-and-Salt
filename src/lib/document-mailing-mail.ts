import type { DocumentMailingNotifier } from '@/modules/documents';
import { requestOrigin } from './request-origin';

// The origin a document mailing links from. It is Better Auth's, resolved against its allowed hosts, so a forged Host cannot point
// the link at another site. The mailing's run carries it on and renders each mail (src/modules/documents/jobs).

export function documentMailingNotifier(request: Request): DocumentMailingNotifier {
  return { origin: () => requestOrigin(request, '/') };
}
