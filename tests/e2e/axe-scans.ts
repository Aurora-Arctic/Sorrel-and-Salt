// The accessibility sweep's scan list: every route and modal, each with the people it is scanned as.
// tests/e2e/axe.spec.ts scans it; tests/guards/axe-scans.test.ts fails on a page, a §9 route (design/routes.md) or a
// modal file with no entry. Plain data, with no Playwright import, so the Vitest guard can read it.

/** Who a scan signs in as. Coven roles are the schema's; `user` holds no coven seat. */
export type Persona =
  | 'signedOut'
  | 'user'
  | 'invitee'
  | 'unverified'
  | 'unagreed'
  | 'pausedAccount'
  | 'pausedMember'
  | 'observer'
  | 'practitioner'
  | 'steward'
  | 'curator'
  | 'keeper';

export interface RouteScan {
  /** The address pattern, as §9 (claude-docs/design/routes.md) writes it: route groups and parallel-route slots left out. */
  route: string;
  /** Everyone the page is scanned as; empty only for a route §9 names that has no page yet. */
  as: readonly Persona[];
  /** In §9 but with no `page.tsx`: listed so the guard sees it, and scanned once it is built. */
  unbuilt?: true;
  /** The status the page answers with when it is not a success: the page for an address nothing else answers is a 404. */
  status?: 404;
}

export interface ModalScan {
  /** What the spec calls the scan; one source file may draw several modals. */
  id: string;
  /** The file under src/ whose `<Modal>`, `<RouteModal>`, `<ModalButton>`, `<dialog>` or `role="dialog"` it opens. */
  source: string;
  as: Persona;
}

export const ROUTE_SCANS = [
  // Open to everyone.
  { route: '/', as: ['signedOut'] },
  { route: '/[...missing]', as: ['signedOut'], status: 404 },
  { route: '/compendium', as: ['signedOut'] },
  { route: '/compendium/ingredients/[slug]', as: ['signedOut'] },
  { route: '/privacy', as: ['signedOut'] },
  { route: '/privacy/versions/[number]', as: ['signedOut'] },
  { route: '/disclaimer', as: ['signedOut'] },
  { route: '/disclaimer/versions/[number]', as: ['signedOut'] },
  { route: '/code-of-ethics', as: ['signedOut'] },
  { route: '/code-of-ethics/versions/[number]', as: ['signedOut'] },
  { route: '/terms', as: ['signedOut'] },
  { route: '/terms/versions/[number]', as: ['signedOut'] },
  { route: '/support', as: ['signedOut', 'user'] },
  { route: '/support/request', as: ['signedOut'] },
  { route: '/sign-in', as: ['signedOut'] },
  { route: '/forgot-password', as: ['signedOut'] },
  { route: '/reset-password', as: ['signedOut'] },
  { route: '/help', as: ['signedOut', 'user'] },
  { route: '/help/glossary', as: ['signedOut'] },
  { route: '/help/search', as: ['signedOut'] },
  { route: '/help/[slug]', as: ['signedOut'] },
  { route: '/help/[slug]/[child]', as: ['signedOut'] },

  // An account with no coven seat, or one held back by the gates.
  { route: '/coven', as: ['user'] },
  { route: '/coven/new', as: ['user', 'keeper'] },
  { route: '/invite/[token]', as: ['invitee'] },
  { route: '/i/[token]', as: ['user'] },
  { route: '/account', as: ['user'] },
  { route: '/account/sign-in', as: ['user'] },
  { route: '/account/support', as: ['user'] },
  { route: '/account/email', as: ['unverified'] },
  { route: '/account/terms', as: ['unagreed'] },
  { route: '/access-paused', as: ['pausedAccount'] },
  { route: '/coven-paused/[slug]', as: ['pausedMember'] },

  // A coven, as each of its roles.
  { route: '/coven/[slug]', as: ['observer', 'practitioner', 'steward'] },
  { route: '/coven/[slug]/members', as: ['practitioner', 'steward'] },
  { route: '/coven/[slug]/invitations', as: ['steward'] },
  { route: '/coven/[slug]/ingredients', as: ['observer', 'practitioner', 'steward'] },
  { route: '/coven/[slug]/ingredients/[id]', as: ['observer', 'practitioner', 'steward'] },
  { route: '/coven/[slug]/grimoire', as: ['observer', 'practitioner', 'steward'] },
  { route: '/coven/[slug]/grimoire/drafts', as: ['practitioner', 'steward'] },
  { route: '/coven/[slug]/grimoire/[id]', as: ['observer', 'practitioner', 'steward'] },

  // Curation.
  { route: '/curator', as: ['curator'] },
  { route: '/curator/compendium', as: ['curator'] },
  { route: '/curator/categories', as: ['curator'] },
  { route: '/curator/category-groups', as: ['curator'] },
  { route: '/curator/forms', as: ['curator'] },
  { route: '/curator/form-groups', as: ['curator'] },
  { route: '/curator/celestial-bodies', as: ['curator'] },
  { route: '/curator/zodiac-signs', as: ['curator'] },
  { route: '/curator/deities', as: ['curator'] },
  { route: '/curator/deity-traditions', as: ['curator'] },

  // The keepers' pages; a curator reaches the index and Support.
  { route: '/keepers', as: ['curator', 'keeper'] },
  { route: '/keepers/support', as: ['curator', 'keeper'] },
  { route: '/keepers/users', as: ['keeper'] },
  { route: '/keepers/privilege-changes', as: ['keeper'] },
  { route: '/keepers/invitations', as: ['keeper'] },
  { route: '/keepers/invitation-cards', as: ['keeper'] },
  { route: '/keepers/card-sign-ups', as: ['keeper'] },
  { route: '/keepers/business-cards', as: ['keeper'] },
  { route: '/keepers/documents', as: ['keeper'] },
  { route: '/keepers/documents/[key]', as: ['keeper'] },
  { route: '/keepers/help', as: ['keeper'] },

  // Staff help, which curators and keepers read.
  { route: '/help/staff', as: ['curator', 'keeper'] },
  { route: '/help/staff/[slug]', as: ['curator', 'keeper'] },
  { route: '/help/staff/[slug]/[child]', as: ['curator', 'keeper'] },
] as const satisfies readonly RouteScan[];

export const MODAL_SCANS = [
  // The shell, on any page.
  { id: 'support', source: 'src/components/SupportDialog/index.tsx', as: 'user' },
  { id: 'discard', source: 'src/components/Modal/discard.tsx', as: 'user' },
  {
    id: 'add-ingredient',
    source: 'src/components/AppShell/add-ingredient-button.tsx',
    as: 'steward',
  },

  // The account.
  { id: 'unlink-provider', source: 'src/components/SignInMethods/provider-row.tsx', as: 'user' },
  { id: 'passkey', source: 'src/components/Passkeys/passkey-row.tsx', as: 'user' },
  { id: 'two-factor-warning', source: 'src/components/PasswordSection/two-factor.tsx', as: 'user' },
  { id: 'my-request', source: 'src/components/SupportList/index.tsx', as: 'user' },

  // A coven's people.
  {
    id: 'member',
    source: 'src/app/(shell)/coven/[slug]/(people)/members/member-dialog.tsx',
    as: 'steward',
  },
  { id: 'invite', source: 'src/components/InviteDialog/index.tsx', as: 'steward' },
  { id: 'leave', source: 'src/components/LeaveWorkspaceButton/owner-exit.tsx', as: 'steward' },

  // A coven's ingredients.
  { id: 'filters', source: 'src/components/FacetPanel/shell.tsx', as: 'steward' },
  { id: 'stock', source: 'src/components/StockDialog/index.tsx', as: 'steward' },
  { id: 'quick-look', source: 'src/components/IngredientForm/quick-look.tsx', as: 'steward' },
  { id: 'entry-edit', source: 'src/components/IngredientEntry/entry-dialog.tsx', as: 'steward' },
  {
    id: 'entry-details',
    source: 'src/components/IngredientEntry/details-dialog.tsx',
    as: 'steward',
  },
  {
    id: 'entry-annotate',
    source: 'src/components/IngredientEntry/annotate-dialog.tsx',
    as: 'steward',
  },
  {
    id: 'annotate-picker',
    source: 'src/components/IngredientEntry/annotate-picker.tsx',
    as: 'steward',
  },
  {
    id: 'make-it-ours',
    source: 'src/components/IngredientEntry/cupboard-writes.tsx',
    as: 'steward',
  },
  {
    id: 'remove-from-cupboard',
    source: 'src/components/IngredientEntry/cupboard-writes.tsx',
    as: 'steward',
  },
  { id: 'edit-stock', source: 'src/components/IngredientEntry/edit-stock.tsx', as: 'steward' },
  { id: 'delete-entry', source: 'src/components/IngredientEntry/delete-entry.tsx', as: 'steward' },
  { id: 'entry-summary', source: 'src/components/Combobox/entry.tsx', as: 'steward' },

  // A coven's grimoire.
  { id: 'spell-builder', source: 'src/components/SpellBuilder/spell-dialog.tsx', as: 'steward' },
  { id: 'spell-look', source: 'src/components/SpellRecipe/look-dialog.tsx', as: 'steward' },
  { id: 'spell-preview', source: 'src/components/SpellPreview/index.tsx', as: 'steward' },
  { id: 'delete-spell', source: 'src/components/SpellRecipe/delete-spell.tsx', as: 'steward' },
  {
    id: 'record-working-card',
    source: 'src/components/SpellCard/record-working.tsx',
    as: 'steward',
  },
  { id: 'record-working', source: 'src/components/RecordWorking/dialog.tsx', as: 'steward' },
  {
    id: 'complete-working',
    source: 'src/components/RecordWorking/complete-action.tsx',
    as: 'steward',
  },
  { id: 'date-field', source: 'src/components/DateField/index.tsx', as: 'steward' },

  // Curation.
  {
    id: 'compendium-entry',
    source: 'src/app/(shell)/curator/compendium/compendium-dialog.tsx',
    as: 'curator',
  },
  { id: 'vocabulary-value', source: 'src/app/(shell)/curator/value-dialog.tsx', as: 'curator' },
  { id: 'vocabulary-group', source: 'src/app/(shell)/curator/group-dialog.tsx', as: 'curator' },

  // The keepers' pages.
  { id: 'support-request', source: 'src/components/SupportRequests/index.tsx', as: 'keeper' },
  { id: 'user', source: 'src/app/(shell)/keepers/(people)/users/user-dialog.tsx', as: 'keeper' },
  { id: 'user-confirm', source: 'src/components/ConfirmedAction/index.tsx', as: 'keeper' },
  { id: 'keeper-invite', source: 'src/components/AdminInvitations/invite-form.tsx', as: 'keeper' },
  { id: 'mint-cards', source: 'src/components/AdminCards/mint-form.tsx', as: 'keeper' },
  { id: 'card-attempts', source: 'src/components/AdminCards/attempts.tsx', as: 'keeper' },
  { id: 'date-range-field', source: 'src/components/DateRangeField/index.tsx', as: 'keeper' },
  { id: 'document-link', source: 'src/components/RichTextEditor/link-dialog.tsx', as: 'keeper' },
  { id: 'help-article', source: 'src/app/(shell)/keepers/help/dialog.tsx', as: 'keeper' },
] as const satisfies readonly ModalScan[];

export type ScannedRoute = (typeof ROUTE_SCANS)[number]['route'];
export type ScannedModal = (typeof MODAL_SCANS)[number]['id'];
