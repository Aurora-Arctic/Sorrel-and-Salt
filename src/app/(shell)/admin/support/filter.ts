import type { SupportRequestFilter } from '@/modules/support';
import type {
  SupportRequestsCursor,
  SupportRequestsFilter,
} from '@/components/SupportRequests/types';
import { DEFAULT_SUPPORT_VIEW, SUPPORT_ABOUTS, SUPPORT_VIEWS } from '@/lib/support-path';
import { oneOf, single, trimmed } from '@/lib/search-params';
import { BETA_ONLY } from '@/components/SupportRequests/href';
import { readListPlace } from '../list-page';
import type { SupportSearchParams } from './types';

const VIEWS = SUPPORT_VIEWS.map((view) => view.value);

/**
 * The page's filter and cursor off its address. A value outside the set is no filter, and an error
 * number is kept only when it is a whole number, so a hand-edited one cannot reach the query.
 */
export function readSupportPlace(params: SupportSearchParams): {
  filter: SupportRequestsFilter;
  cursor: SupportRequestsCursor;
  request: string | undefined;
  user: string | undefined;
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
      view: oneOf(VIEWS, single(params.view)) ?? DEFAULT_SUPPORT_VIEW,
      errorCode: /^\d{1,3}$/.test(code) ? code : '',
      betaOnly: single(params.beta) === BETA_ONLY,
    },
    cursor: { after, before },
    request: single(params.request) || undefined,
    user: single(params.user) || undefined,
  };
}

/** The same filter as the service takes it. */
export function serviceFilter({
  about,
  view,
  errorCode,
  betaOnly,
}: SupportRequestsFilter): SupportRequestFilter {
  return {
    view,
    ...(about && { about }),
    ...(errorCode && { errorCode: Number(errorCode) }),
    ...(betaOnly && { betaTester: true }),
  };
}
