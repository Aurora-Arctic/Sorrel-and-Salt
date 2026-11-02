// Pure helpers for the terms acceptance page, `/account/terms`: the page an account that has not agreed to the current terms
// is sent to from every other protected page, as the email page is for an unverified address.

const TERMS_PAGE = '/account/terms';

/** The acceptance page, carrying where to go once the account agrees, if anywhere. */
export function termsPagePath(
  next: string | undefined,
): '/account/terms' | `/account/terms?next=${string}` {
  if (next === undefined) return TERMS_PAGE;
  return `${TERMS_PAGE}?next=${encodeURIComponent(next)}`;
}

/** Whether a request path (with or without its query) is the acceptance page itself. */
export function isTermsPage(path: string | undefined): boolean {
  return path?.split('?')[0] === TERMS_PAGE;
}
