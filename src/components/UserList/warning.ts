/**
 * The warning before vouching for an unverified address: an admin's
 * approval or grant vouches for whoever holds it, and the ledger row it
 * writes keeps the account from the sweep of lapsed unverified accounts. A warning rather than
 * a refusal, since confirming who someone is is left to the admin. `verb`
 * is the act's own, "Approving" or "Promoting".
 */
export function unverifiedWarning(verb: string): string {
  return `Nobody has confirmed this email address yet. ${verb} also keeps the account from lapsing.`;
}
