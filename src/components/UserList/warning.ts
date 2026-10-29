/**
 * The warning before vouching for an unverified address; a warning, not a refusal, since confirming who someone is is left to the admin. `verb` is "Approving" or "Promoting".
 * An approval or grant also keeps the account from the sweep of lapsed unverified accounts.
 * (claude-docs/components/user-list.md, "The vouching warning").
 */
export function unverifiedWarning(verb: string): string {
  return `Nobody has confirmed this email address yet. ${verb} also keeps the account from lapsing.`;
}
