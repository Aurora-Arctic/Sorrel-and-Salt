import type { SupportRequestFilter } from '@/modules/support';
import type {
  SupportRequestsCursor,
  SupportRequestsFilter,
} from '@/components/SupportRequests/types';
import { SUPPORT_ABOUTS } from '@/lib/support-path';
import { oneOf, single, trimmed } from '@/lib/search-params';
import { readListPlace } from '../list-page';
import type { SupportSearchParams } from './types';

const STATUSES = ['open', 'resolved'] as const;

/**
 * The page's filter and cursor off its address. A value outside the set is no filter, and an error
 * number is kept only when it is a whole number, so a hand-edited one cannot reach the query.
 */
export function readSupportPlace(params: SupportSearchParams): {
  filter: SupportRequestsFilter;
  cursor: SupportRequestsCursor;
  request: string | undefined;
} {
  const { after, before } = readListPlace(params);
  const code = trimmed(params.error);
  return {
    filter: {
      about:
        oneOf(
          SUPPORT_ABOUTS.map((about) => about.value),
          single(params.about),
        ) ?? '',
      status: oneOf(STATUSES, single(params.status)) ?? '',
      errorCode: /^\d{1,3}$/.test(code) ? code : '',
    },
    cursor: { after, before },
    request: single(params.request) || undefined,
  };
}

/** The same filter as the service takes it. */
export function serviceFilter({
  about,
  status,
  errorCode,
}: SupportRequestsFilter): SupportRequestFilter {
  return {
    ...(about && { about }),
    ...(status && { status }),
    ...(errorCode && { errorCode: Number(errorCode) }),
  };
}
