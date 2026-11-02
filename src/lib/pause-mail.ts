import type { AccessPauseNotifier } from '@/modules/identity';
import type { MemberPauseNotifier } from '@/modules/coven';
import type { TimeoutNotifier } from '@/modules/support';
import { requestOrigin } from './request-origin';

// Where a time-out or pause learns the origin its mail links from. The origin is Better Auth's, resolved against its allowed
// hosts, so a forged Host cannot point the link at another site. Handed to the service by the GraphQL context; the mail itself is
// built and sent by the service's job.

export function pauseNotifier(
  request: Request,
): TimeoutNotifier & AccessPauseNotifier & MemberPauseNotifier {
  return { origin: () => requestOrigin(request, '/') };
}
