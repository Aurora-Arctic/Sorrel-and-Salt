// The addresses of the support screens and the parameters that open the Support dialog. Client-safe.

/** The page with the request form, for a visitor with no shell round them. */
export const SUPPORT_PATH = '/support';

/** The sender's own requests. */
export const SUPPORT_LIST_PATH = '/account/support';

/** The parameter that opens the Support dialog, holding the kind preselected. */
export const SUPPORT_PARAM = 'support';

/** The parameter carrying the HTTP status of the error page the sender came from. */
export const SUPPORT_ERROR_PARAM = 'error';

/** The parameter carrying the page a request is about, where the address is not that page. */
export const SUPPORT_FROM_PARAM = 'from';

const KINDS = ['accessibility', 'bug', 'question'] as const;
export type SupportKindParam = (typeof KINDS)[number];

/** The kind a value of `?support` names; accessibility, the first offered, for a bare or unknown one. */
export function supportKindOf(value: string | null): SupportKindParam {
  return (KINDS as readonly string[]).includes(value ?? '')
    ? (value as SupportKindParam)
    : 'accessibility';
}

/** An HTTP status read from a parameter, or `undefined` when it is not one. */
export function errorCodeOf(value: string | null): number | undefined {
  if (value === null || !/^\d{3}$/.test(value)) return undefined;
  const code = Number(value);
  return code >= 100 && code <= 599 ? code : undefined;
}

/** `pathname` with the Support dialog open over it, as a bug report from an error page when `errorCode` is given. */
export function supportHref(
  pathname: string,
  params: URLSearchParams,
  kind: SupportKindParam,
  errorCode?: number,
): string {
  const rest = new URLSearchParams(params);
  rest.set(SUPPORT_PARAM, kind);
  if (errorCode === undefined) rest.delete(SUPPORT_ERROR_PARAM);
  else rest.set(SUPPORT_ERROR_PARAM, String(errorCode));
  return `${pathname}?${rest}`;
}

/** The address with the Support parameters dropped. */
export function supportClosedHref(pathname: string, params: URLSearchParams): string {
  const rest = new URLSearchParams(params);
  rest.delete(SUPPORT_PARAM);
  rest.delete(SUPPORT_ERROR_PARAM);
  const lead = rest.toString();
  return lead ? `${pathname}?${lead}` : pathname;
}
