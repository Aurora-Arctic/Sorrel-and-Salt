// The addresses of the support screens and the parameters that open the Support dialog. Client-safe.

/** The longest error reference a request keeps; a digest is a short number. */
export const ERROR_REFERENCE_MAX_LENGTH = 100;

/** The page with the request form, for a visitor with no shell round them. */
export const SUPPORT_PATH = '/support';

/** The sender's own requests. */
export const SUPPORT_LIST_PATH = '/account/support';

/** The parameter that opens the Support dialog, holding what the request is about, preselected. */
export const SUPPORT_PARAM = 'support';

/** The parameter carrying the HTTP status of the error page the sender came from. */
export const SUPPORT_ERROR_PARAM = 'error';

/** The parameter carrying the error page's digest, so a request can be matched to the server log. */
export const SUPPORT_REF_PARAM = 'ref';

/** A digest read from a parameter, or `undefined` when it is blank or too long to be one. */
export function errorReferenceOf(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= ERROR_REFERENCE_MAX_LENGTH ? trimmed : undefined;
}

/** The parameter carrying the page a request is about, where the address is not that page. */
export const SUPPORT_FROM_PARAM = 'from';

/** What a request can be about, in the order the form offers them, each with the words the form and the lists show. */
export const SUPPORT_ABOUTS = [
  {
    value: 'accessibility',
    label: 'Accessibility',
    description: 'Something on the site you cannot use or read.',
  },
  {
    value: 'bug',
    label: 'Bug',
    description: 'Something is broken or does not do what it says.',
  },
  {
    value: 'account',
    label: 'Account & Sign-In',
    description: 'Trouble signing in, changing your email, or using an invitation.',
  },
  {
    value: 'compendium',
    label: 'Compendium Entry',
    description: 'An entry looks wrong, or is missing a source.',
  },
  {
    value: 'privacy',
    label: 'Privacy & Data',
    description: 'A question or request about the data we hold on you.',
  },
  {
    value: 'feedback',
    label: 'Feedback',
    description: 'Something you would like to see changed.',
  },
  {
    value: 'question',
    label: 'Question',
    description: 'Anything else you would like to ask us.',
  },
] as const;
export type SupportAboutParam = (typeof SUPPORT_ABOUTS)[number]['value'];

/** The about a value of `?support` names, or `undefined` for a bare, missing or unknown one: nothing is chosen for the sender. */
export function supportAboutOf(value: string | null): SupportAboutParam | undefined {
  return SUPPORT_ABOUTS.find((about) => about.value === value)?.value;
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
  about?: SupportAboutParam,
  errorCode?: number,
): string {
  const rest = new URLSearchParams(params);
  rest.set(SUPPORT_PARAM, about ?? '');
  if (errorCode === undefined) rest.delete(SUPPORT_ERROR_PARAM);
  else rest.set(SUPPORT_ERROR_PARAM, String(errorCode));
  return `${pathname}?${rest}`;
}

/** The address with the Support parameters dropped. */
export function supportClosedHref(pathname: string, params: URLSearchParams): string {
  const rest = new URLSearchParams(params);
  rest.delete(SUPPORT_PARAM);
  rest.delete(SUPPORT_ERROR_PARAM);
  rest.delete(SUPPORT_REF_PARAM);
  const lead = rest.toString();
  return lead ? `${pathname}?${lead}` : pathname;
}
