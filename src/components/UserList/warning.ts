/**
 * The warning before vouching for an unverified address: a warning, not a refusal. `verb` is "Approving" or
 * "Promoting" (claude-docs/components/user-list.md, "The vouching warning").
 */
export function unverifiedWarning(verb: string): string {
  return `Nobody has confirmed this email address yet. ${verb} also keeps the account from lapsing.`;
}
