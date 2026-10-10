/**
 * The warning before vouching for an unverified address (MB.205): an admin's
 * approval or grant vouches for whoever holds it, and the ledger row it
 * writes keeps the account from MB.67's sweep (MB.204). A warning rather than
 * a refusal, since M2.9 leaves confirming who someone is to the admin. `verb`
 * is the act's own, "Approving" or "Granting".
 */
export function unverifiedWarning(verb: string): string {
  return `This email address has not been verified, so nobody has proved who holds it. ${verb} keeps the account rather than letting it lapse.`;
}
