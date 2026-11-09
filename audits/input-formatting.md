# Input Formatting Audit

This audit lists every place a Keeper, Curator, Steward or Practitioner types text into a form, says what each input accepts, and recommends how each input should check and tidy what is typed. Nothing in the code was changed.

**What the owner needs to do:** read the findings and choose which become tasks. Findings 4 (length limits) and 13 (unused fields) each end with a decision only the owner can make; they are marked "Owner decision".

## Scope

**In scope.** Every typed-text input and every choice input on forms used by Keepers, Curators, Stewards and Practitioners:

- the spell builder and the record-a-working form;
- vocabulary and Compendium forms (groups, grouped values, chip colours);
- the Cupboard entry form;
- coven create, rename and leave;
- invitations (coven and Keeper) and printed invitation cards;
- business cards;
- Keeper user management and support-request review;
- documents and help articles;
- the ingredient form, variants and references;
- stock.

**Out of scope.** Sign-in, account and two-factor forms; support forms used by Observers and signed-out visitors; filter, search and sort boxes; tools that store nothing. The full list with reasons is in [Out of Scope](#out-of-scope).

## Method

1. Searched `src/components` and `src/app` for `<input`, `<textarea`, `TextField`, `SelectField`, `Combobox`, `DateField`, `type=` and `register(`, and accounted for every hit as either an inventory row or an out-of-scope entry.
2. Read each form's component, its zod schema (client check) and the service or validation file that receives it (server check).
3. Checked each rule against published guidance: GOV.UK Design System pages, W3C WCAG 2.2 Understanding documents, MDN Web Docs, Nielsen Norman Group, Baymard Institute and other sources listed in [Sources](#sources). A label such as [S8] points to that list; the numbers are labels, not a count.

Unless stated otherwise, file paths are under `src/components/`, `src/modules/` or `src/lib/` as written, and line numbers were checked against the code in this worktree.

## What Field Offers and Lacks

The shared Field set (`src/components/Field/`) gives every form a label, a hint, an error line and a `FieldShell` wrapper. `TextField` accepts the types `text`, `date`, `url` and `number`, an `inputMode` of `numeric` only, an `autoComplete` of `off` only, and an optional `format` function that tidies the text when the person leaves the field (`Field/text-field.tsx:34-55`). Only the reference panel passes `format` (`IngredientForm/reference-panel.tsx:607`), and its formatters in `modules/ingredients/validation/reference-format.ts` are also fed to the server schema, so the form and the server agree. That is the model the rest of the app should follow. Field lacks `type="email"` and `type="tel"`, `maxLength` or a limit prop, `min`, `max`, `step`, `pattern`, `spellCheck`, `autoCapitalize`, `enterKeyHint`, and a decimal `inputMode`. It has a soft `CharacterCount` (`Field/character-count.tsx`), but no in-scope form uses it. Its error line (`Field/shell.tsx:10-17`) is a plain paragraph with no live region, and no form shows an error summary on Save. All forms are `noValidate`, so every refusal comes from the zod schema or the server. Many inputs bypass Field and use raw `<input>` or `<textarea>` elements (finding 8 lists them), so they miss all of this.

## Findings

Fifteen findings: 2 High, 7 Medium, 6 Low.

### 1. Amount Fields Use `type="number"` and Have No Shared Rule

**Severity:** High. A person can type a value the database refuses (more than three decimal places, a negative, an `e`) and learn only on Save, and the rule is written twice.

**Where:**

- `SpellBuilder/steps/step-row.tsx:220` (Quantity); the value is read with `Number()` at `SpellBuilder/steps/values.ts:183`.
- `StockFields/index.tsx:22` (Quantity, `type` at 25) and `StockFields/index.tsx:40` (Low Stock At, `type` at 43).
- `AdminCards/mint-form.tsx:177` (Number of Sheets) is a whole-number field with its own live check and is the one number field that behaves well. It is the pattern to copy for whole numbers, not a defect.
- The rule is written separately in `modules/grimoire/validation/spell-step.ts` and `modules/ingredients/validation/stock.ts` (both against `MAX_QUANTITY` in `lib/validation.ts`).

**Why it matters:** Browsers with `type="number"` accept `e` and `-`, handle a comma as the decimal mark differently from browser to browser, and may show a phone keyboard without a decimal mark [S27][S28][S29]. A person who writes "2,5" may have it dropped or refused without a clear message. The client schema does not check decimal places or the maximum; the person finds out when the server answers.

**Recommended fix:**

- **Format rule:** a non-negative decimal with up to three decimal places and at most `MAX_QUANTITY`. Accept a comma or a point as the decimal mark and ignore surrounding spaces. Refuse two marks or any letter with one message, for example "Enter an amount as a number, like 2.5" [S15][S27][S28][S29].
- **Formats as you type:** no. It normalises on blur: trim, turn a comma into a point, and redisplay the canonical number [S8][S9][S10].
- **How to build it:** change these fields to `type="text"` with `inputMode="decimal"` (a new value in Field's `inputMode` union). Write one `quantity` function in `lib/validation.ts` that both server schemas and the client schema use, and pass it through Field's `format` prop. Keep `type="number"` only where a whole number is wanted with a stepper, as the sheets field does. If a field may ever be negative, drop `inputMode` so the minus sign is available on a phone keyboard [S28].

**Follow-up task:** Replace Amount Number Inputs with One Shared Decimal Quantity Field.

### 2. Errors Are Not Announced, and Save Shows No Summary

**Severity:** High. A person using a screen reader may never hear that Save failed, and a person with a long form (ingredient, spell, reference panel) has to scroll to find which field refused.

**Status:** Fixed — FieldError is announced with a hidden "Error:" prefix, and FormErrorSummary lists and links every error on a failed Save.

**Where:**

- `Field/shell.tsx:10-17`: `FieldError` is a bare `<p class="field__error">` with no live region and no hidden "Error:" prefix.
- `Field/description.ts:30-31`: `aria-invalid` and `aria-describedby` are wired correctly and set only after a failed check, which matches the guidance [S22]. The gap is the announcement, not the wiring.
- No error summary exists anywhere in the app. Focus moves to the first invalid field only in `IngredientForm/index.tsx` and `IngredientForm/reference-panel.tsx`, through `useFocusFirstInvalid` in `IngredientForm/on-submit.ts`, and both turn react-hook-form's own focus off (`shouldFocusError: false`). `SpellBuilder/status-field.tsx:66` focuses the title only.

**Why it matters:** WCAG 3.3.1 requires an error to be identified in text, and the W3C and GOV.UK guidance is to announce it and to give a summary on submit that links to each field and moves focus to it [S5][S7][S17][S21]. A person who cannot see the page, or who is zoomed in, otherwise gets no sign that anything failed. Data is not lost, because forms keep what was typed, so the cost is time and confusion.

**Recommended fix:**

- **Format rule:** each error is text, worded from the label ("Enter the formal name"), prefixed with visually hidden "Error:", and placed in a polite live region; the same words appear in a summary [S5][S19][S21].
- **Formats as you type:** not applicable. Timing: check on blur; once a field has shown an error, re-check on each keystroke and clear the error the moment it is fixed; flag empty required fields only on Save [S1][S2][S3][S7].
- **How to build it:** in `Field/shell.tsx`, give `FieldError` the live region and hidden prefix. Add one `FormErrorSummary` component to `src/components/Field/` that takes the react-hook-form error list, links each message to its field, prefixes the page title with "Error:" and takes focus on a failed Save. Generalise `useFocusFirstInvalid` into the summary's behaviour and use it in every react-hook-form form. Forms on plain `useState` (see finding 8) feed the same summary.

**Follow-up task:** Add Live-Region Errors and a Linked Error Summary to Field.

### 3. No Shared Blur Normalisation Beyond the Reference Panel

**Severity:** Medium. Rules such as trimming, collapsing spaces and adding a missing prefix are asked of the person instead of done for them, and the reference panel's good mechanism is not reused.

**Status:** Fixed — `tidy` (src/lib/formats.ts) is the blur default of every single-line text field, and the schema helpers run the same function.

**Where:** every text input outside `IngredientForm/reference-panel.tsx:607`. `IngredientForm/references.tsx:429-440` (Locator) copies the same blur logic by hand with its own `onBlur`. Examples that would gain: Formal Name (`IngredientForm/index.tsx:931-933`), Form on spell steps (`SpellBuilder/steps/step-row.tsx:207`), Seal Wax (`SpellBuilder/index.tsx:672`), Moon Phase and Day (`SpellBuilder/index.tsx:697,704`), Folk Names and the other list fields.

**Why it matters:** An ingredient's formal name is its unique identity, so a stray space at the end of a name may produce an entry that looks identical but does not match. The research is consistent that tidying belongs on blur, not while typing, because masks that rewrite text as it is typed break paste, move the caret and confuse people; in Baymard's testing, 89% of test subjects entered data in a different format from the example the site showed, so the form has to tolerate varied input rather than rely on instructions [S8][S9][S10]. Baymard's article gives no participant count.

**Recommended fix:**

- **Format rule:** trim the ends and collapse runs of spaces on every single-line text input. Other formats (hex colour, email, address, quantity) are separate functions, covered in findings 1, 5, 6 and 7.
- **Formats as you type:** no. Normalise on blur, then re-validate only if the field was already showing an error. This is what `text-field.tsx:34-55` already does.
- **How to build it:** make `tidy` the default `format` of `TextField` so every Field input trims on blur unless a field passes its own. Move the shared formatters out of `reference-format.ts` into `src/lib/formats.ts`, and have `optionalText(format)` and `requiredText(format)` in `lib/validation.ts` use them so the server stores exactly what the form showed. Replace the hand copy in Locator with `format`. Do not add an as-you-type formatter.

**Follow-up task:** Make Blur Tidying the Default in Field and Share Formatters with the Server Schemas.

### 4. Length Limits Are Uneven and Written Several Times (Owner Decision)

**Severity:** Medium. Text is kept when a limit is exceeded and the server messages are clear, so nothing is lost. The cost is a late surprise on Save and constants that can drift apart.

**Status:** Fixed (coven, invitation, keeper, support, document and help forms) — soft limits through Field, each exported once from its owning module, with a server rule of 500 for the reason note.

**Where:**

- Coven name, 80 characters: the server says "Keep the name to 80 characters" in `modules/identity/services/workspace-creation.ts:19` and again in `modules/identity/services/workspace-rename.ts:19`. The inputs have no `maxLength` (`CreateWorkspaceForm/index.tsx:79`, `RenameWorkspaceForm/index.tsx:83`), so the person learns only on Save.
- Pause note and pause message, 500: hard `maxLength` on both inputs (`UserDetail/access-pause-parts.tsx:117,123` and `136,142`) and again in `modules/coven/services/member-pause.ts:22` and `modules/support/services/timeouts.ts:20`. Four copies of one number.
- Printed card note, 500: hard `maxLength` at `AdminCards/mint-form.tsx:207,211`, a limit constant in `lib/invitation-cards/limits.ts` and a database CHECK on `char_length`.
- Keeper reply, 4000: server only (`SupportRequests/reply-form.tsx:118`, `modules/support/validation/support.ts`). The Observer support forms show a count; the Keeper reply does not.
- No limit anywhere, client or server: spell title, intent, notes and steps; ingredient and variant descriptions and safety notes; group and value names and descriptions; help title, summary and search terms; mailing summary (`DocumentMailingPanel/index.tsx:131`); working note (`RecordWorking/form.tsx:297`); the reason on role, access and invitation changes (`Field/reason-field.tsx:21`, `UserList/role-control.tsx:90`, `UserList/creation-control.tsx:64,83`, `AdminInvitations/invite-form.tsx:115`). The reason is stored as `note: text('note')` in `modules/identity/schema/user-privilege-changes.ts:34` with no database check, and `adminDeclaration` in `modules/identity/services/admin-changes.ts:28-29` only trims it.

**Why it matters:** the person finds out a limit exists only after pressing Save, and a hard `maxLength` silently cuts a pasted paragraph. Fields with no limit can hold text far larger than any list or email can show.

**Recommended fix:**

- **Recommendation:** use the GOV.UK character-count behaviour: typing past the limit is allowed, a count appears below the field when the person nears it and is announced on a pause, and Save shows an error [S36]. Add a limit only where a database column or a real need demands one. That means: keep the four existing limits, show them softly, and replace the hard `maxLength` on the pause fields and the card note with the soft count.
- **Owner decision 1:** whether the ledger reason (`note`) and the mailing summary get a limit. The recommendation is 500 for the reason, matching the other note fields, and no limit for the mailing summary until an email size problem appears.
- **Owner decision 2:** whether long free-text columns (spell and ingredient descriptions) get any limit. The recommendation is none for now: nothing in the code shows a need.
- **Formats as you type:** no formatting; the count updates as the person types.
- **How to build it:** add a `limit` prop to `TextField` that renders the existing `CharacterCount` (`Field/character-count.tsx`) with a count that appears after 75% of the limit. Export each limit once from the module that owns the schema (for example `COVEN_NAME_LIMIT`) and import it both in the schema and the form. Delete the duplicate constants.

**Follow-up task:** Add a Shared Soft Character Limit to Field and Replace Duplicate Limit Constants.

### 5. Email Addresses Follow Three Different Rules

**Severity:** Medium. The same address can be accepted in one form and refused in another, and one form has no check until the server answers.

**Status:** Fixed — one shared `EmailAddress` schema, tidied on blur, with `type="email"` and the new message.

**Where:**

- `InviteDialog/index.tsx:99` (type at 102): checks with `validateEmailAddress(normaliseEmail(address))` from `lib/email-address.ts`; messages "Enter an email address", "That doesn't look like an email address" and "That email address can't receive mail".
- `AdminInvitations/invite-form.tsx:89-93`: `type="email"`, no client check; the server checks.
- `BusinessCards/index.tsx:81`: uses `z.email` with its own wording ending in a full stop; no `type="email"`.
- `autoComplete="off"` on the invitation inputs: added when the invite forms were built, with no reason recorded in `claude-docs/`. Field's own comment says `off` exists so Chrome does not fill a person's name field, and `claude-docs/components/create-workspace-form.md:59-60` explains it for the coven name only. For an invitee's address `off` is defensible: WCAG 1.3.5 covers information about the person, and an invitee's address is not [S23][S26]. So this is a default nobody decided, not a decision.

**Why it matters:** an address that the invite dialog accepts after trimming may be refused or stored differently elsewhere.

**Recommended fix:**

- **Format rule:** trim; check shape on blur ("Enter an email address in the correct format, like name@example.com"); lower-case the domain on blur; allow rare but valid addresses [S24][S32]. One zod `EmailAddress` exported from `lib/email-address.ts` uses `validateEmailAddress`, and all three forms import it.
- **Formats as you type:** no. Normalises on blur.
- **How to build it:** widen `TextField`'s `type` to include `email` and `tel`, add `autoCapitalize`, `spellCheck` and an `autoComplete` union that includes `email`. Set `autocapitalize="none"` and `spellcheck="false"` on every email input [S39][S40][S41]. Keep `autoComplete="off"` on invitee fields and say why in a comment; use `autoComplete="email"` only where the input is the person's own address. If the owner wants the business-card wording kept, make it an override message on the shared rule.

**Follow-up task:** Share One Email Address Rule and Input Type across Invitations and Business Cards.

### 6. Chip Colour Hex Inputs Refuse Natural Input

**Severity:** Medium. A Curator who types `4E8BC2` or pastes ` #4e8bc2` gets a refusal for a value that is obviously a colour.

**Status:** Fixed — `hexColour` (src/lib/contrast.ts) tidies any loose hex to `#rrggbb` on blur and in the server schema, and expands `#abc`.

**Where:** `ChipColorField/index.tsx:240` (light and dark inputs share the code; `spellCheck` is off at 245). The rule is `/^#[0-9a-f]{6}$/i` at `lib/contrast.ts:14`; the message is "Choose a colour, as a hex like #4e8bc2". Lower-casing happens on the server after the check.

**Why it matters:** hex codes are copied from other tools with or without `#`, with stray spaces, in capitals. The refusal makes the person do work the form could do.

**Recommended fix:**

- **Format rule:** `#` followed by six hex digits, shown in lower case. Accept without `#`, with spaces, and in upper case [S3][S10].
- **Formats as you type:** no. Normalises on blur: trim, add `#` if missing, lower-case. Shorthand `#abc` stays refused unless the owner wants three-digit input expanded.
- **How to build it:** write `hexColour` in `src/lib/formats.ts` (see finding 3), pass it as `format`, and use the same function in the zod transform so the server stores what the form showed. Move the input onto `TextField` (finding 8).

**Follow-up task:** Tidy Hex Colour Input on Blur and Share the Rule with the Server.

### 7. Link Address in the Editor Disagrees with the Reference Address

**Severity:** Medium. `example.com` is refused in the editor's link dialog and accepted, with `https://` added, in the reference panel.

**Status:** Fixed — the link dialog adds `https://`, upgrades `http://`, and shares one rule with the page renderer and the link plugin.

**Where:**

- `RichTextEditor/link-dialog.tsx:31`: a hand-built `type="url"` input. If `upsertLink` returns false, the dialog shows "Enter a full web address, such as https://example.com." in an alert. No placeholder, `autoCapitalize` or `spellCheck`.
- `IngredientForm/reference-panel.tsx:217` uses `withScheme` and `addressProblem` from `modules/ingredients/validation/reference-format.ts` (lines 32 and 97).
- The renderer keeps a link only when its address starts with `/`, `#`, `?`, `https:` or `mailto:` (`DocumentPage/markdown.tsx:20`, applied at `:332`); any other link renders as its text alone. `tests/components/DocumentPage/index.test.tsx:276` covers a `javascript:` link. So link safety is already in place. But the editor's link plugin uses its default allowed schemes (`http`, `https`, `mailto`, `tel`, in `@platejs/link`), so an `http://` or `tel:` address the dialog accepts is saved and then shown as plain text, with no message.

**Why it matters:** the same kind of value behaves differently in two places. The failure message arrives only after the person presses Add, and an `http://` link is accepted and then silently lost on the page.

**Recommended fix:**

- **Format rule:** in the editor, an address the renderer opens: `https://`, `mailto:` or a site path starting with `/`. A value with a dot and no scheme gets `https://` added, and `http://` is changed to `https://`, with the result shown. Anything the URL parser cannot read is refused [S30][S31].
- **Formats as you type:** no. Normalises on blur, showing the result, as the reference panel does.
- **How to build it:** the dialog uses the shared `TextField` with `type="url"`, `inputMode="url"`, `autoCapitalize="none"` and `spellCheck={false}`, and passes `withScheme` as `format`, with `addressProblem` for the message. Move both helpers from the ingredients module into `src/lib/formats.ts` so the editor does not import ingredients code. The dialog's accepted schemes and the renderer's `OPENABLE_ADDRESS` come from one shared constant, so the two cannot drift.

**Follow-up task:** Reuse the Reference Address Rule in the Editor Link Dialog and Match It to the Links the Page Renders.

### 8. Many Inputs Bypass Field

**Severity:** Medium. Each raw input has to rebuild error, hint, tidying and limit behaviour, and most did not.

**Status:** Fixed — PlainTextField gives a plain-state form the same shell, tidying, limit and attributes as TextField.

**Where:**

- `RecordWorking/form.tsx:297` (Note); the whole form uses `useState` with a hand-rolled date test (`DAY.test`) at 241-242 rather than the shared `CalendarDay`.
- `IngredientForm/references.tsx:429` (Locator).
- `ChipColorField/index.tsx:240`.
- `RichTextEditor/link-dialog.tsx:31`.
- `DocumentMailingPanel/index.tsx:131`.
- `CupboardEntryForm/index.tsx:291-304` (Label, Description, Safety Notes).
- `CreateWorkspaceForm/index.tsx:79`, `RenameWorkspaceForm/index.tsx:83`.
- `Field/reason-field.tsx:21` (used by `ConfirmedAction/index.tsx:118`, `AdminInvitations/invite-form.tsx:115`, `UserList/role-control.tsx:90`, `UserList/creation-control.tsx:64,83`).
- `UserDetail/access-pause-parts.tsx:117,136`.
- `SupportRequests/issue-panel.tsx:99`, `SupportRequests/reply-form.tsx:118`.
- `InviteDialog/index.tsx:99`, `AdminInvitations/invite-form.tsx:90`.
- `BusinessCards/index.tsx:80-82`.
- `AdminCards/mint-form.tsx:207` (textarea).

**Why it matters:** the person sees different error placement, different timing and no count, depending on which screen they are on. Findings 1 to 7 cannot take effect on these inputs until they use Field.

**Recommended fix:**

- **Format rule:** none of its own; this finding carries the mechanism.
- **Formats as you type:** follows the shared `format` prop (blur).
- **How to build it:** move react-hook-form forms to `TextField`. For forms that use plain state (`RecordWorking`, `ConfirmedAction`, `ReasonField`, the pause and issue panels) add a `PlainTextField` that shares `FieldShell` and takes the same props (`format`, `limit`, `type`, `inputMode`, `spellCheck`, `autoCapitalize`), so there is one mechanism and not per-form code. Convert one form at a time inside the tasks for findings 1 to 7; this finding is the umbrella and builds only `PlainTextField`.

**Follow-up task:** Add PlainTextField and Move Raw Inputs onto the Shared Field Set.

### 9. Mobile Keyboard and Browser Attributes Are Missing

**Severity:** Medium. Fields show the wrong phone keyboard, capitalise identifiers and underline names as typos.

**Status:** Fixed — both text fields take type, inputMode, autoComplete, spellCheck, autoCapitalize and enterKeyHint, with identifier-safe defaults.

**Where:** Field's type list (`Field/types.ts:49-69`) allows none of `enterKeyHint`, `autoCapitalize`, `spellCheck` or `autoComplete` tokens other than `off`; only `PasswordField`, `ChipColorField` and the two-factor inputs set any of them. Examples: Phone (`BusinessCards/index.tsx:82`, no `type="tel"`), Email (line 81), Locator (`IngredientForm/references.tsx:429`), Address (`IngredientForm/reference-panel.tsx:217`), Formal Name (`IngredientForm/index.tsx:931-933`). No form sets `enterKeyHint`.

**Why it matters:** phone keyboards use these attributes to show the right keys, capitalise sensibly and skip spell-check. WCAG 1.3.5 also asks for autocomplete tokens where an input holds information about the person filling in the form [S23][S26].

**Recommended fix:**

- **Format rule:** `spellcheck="false"` on names that are not prose (Formal Name, folk names, addresses, hex); `"true"` on prose (descriptions, notes); `autocapitalize="none"` on email, address and code fields; `autocomplete` tokens (`name`, `email`, `tel`) only on an input that holds the signed-in person's own details; `enterkeyhint="next"` between fields and `"done"` or `"send"` on the last [S39][S40][S41][S26].
- **Formats as you type:** no.
- **How to build it:** add `spellCheck`, `autoCapitalize`, `enterKeyHint` and `autoComplete` (the full token list) props to `TextField` and `PlainTextField`, and pass them through to the element. Defaults: `spellCheck` on for multiline, off for single-line identifiers. Do the pass for each form as part of the tasks for findings 1 to 7, and use this finding to add the props and the defaults.

**Follow-up task:** Add Keyboard and Browser Attribute Props to Field with Sensible Defaults.

### 10. Placeholders Carry Hints and Examples

**Severity:** Low. A placeholder disappears once the person starts typing, so the guidance goes missing at the moment it is needed [S42].

**Status:** Fixed — a placeholder is now a one- or two-word sample, and the rules it carried are hints or were dropped.

**Where:** the reference panel specs (`IngredientForm/reference-panel.tsx:150-274`: for example "Shelley, Mary", "2nd ed.", "Vol. 2", "112–30", "Perseus Digital Library"); "Add a colour" on Seal Wax (`SpellBuilder/index.tsx:672`); "Add an amount" on stock quantity (`StockFields/index.tsx:22`); "Add a reason" in `Field/reason-field.tsx`. The reference panel is partly deliberate: a comment at `reference-panel.tsx:150` says a field whose format matters shows an example as its placeholder.

**Why it matters:** an example in a placeholder is not kept after typing and does not tell the person the rule. The research recommends a visible hint stating the rule, linked to the input with `aria-describedby` (Field already does this), and an empty or short-sample placeholder [S15][S18][S42]. One study also reports that format specifications help in fields with format restrictions; only its abstract was read for this audit, so no figure is quoted [S43].

**Recommended fix:**

- **Format rule:** a one-sentence hint stating the rule where a format matters ("Write the page range, like 112–30"); the placeholder empty or a two-word sample.
- **Formats as you type:** not applicable.
- **How to build it:** audit placeholders against hints once the shared mechanism lands; move rule text into `hint`, keep a short sample only where the owner agrees. No new component.

**Follow-up task:** Move Format Guidance from Placeholders into Field Hints.

### 11. The Same Rule Is Written Twice, or Worded Two Ways

**Severity:** Low. Behaviour matches today, but wording and constants drift apart.

**Status:** Fixed (coven, invitation, keeper, support, document and help forms) — the help form uses the server schema, and validation messages lose their trailing full stops.

**Where:**

- Help article title: "Give it a title" in `HelpArticleForm/form.tsx:399-401` and "Give the article a title" in `modules/help/validation/help.ts`; the body has two wordings the same way (form.tsx:432).
- Working date: a regex in `RecordWorking/form.tsx:241` and `CalendarDay` on the server.
- Coven-name limit (80) in two services; pause limit (500) in four places; see finding 4.
- Quantity rule in two schemas; see finding 1.
- Messages end with a full stop in `BusinessCards/` and `distinctSteps`, but not in most of the app.

**Why it matters:** wording that changes in one place and not the other leaves the person seeing a different message depending on where the check ran.

**Recommended fix:**

- **Format rule:** one rule and one message per requirement, imported by both sides.
- **Formats as you type:** not applicable.
- **How to build it:** use the shared server schema on the client in the help form (`zodResolver`); use `CalendarDay` in `RecordWorking`; a lint-style test that fails when two schemas declare the same limit literal is optional. Choose one message style (no final full stop) and fix the outliers.

**Follow-up task:** Remove Duplicate Validation Rules and Messages across Client and Server.

### 12. Suggest-Only Fields Accept Any Text

**Severity:** Low. Data fragments (for example "Waxing Crescent", "waxing crescent", "Waxing crescent moon") but nothing breaks.

**Where:** Moon Phase and Day (`SpellBuilder/index.tsx:697,704`, via `SpellBuilder/suggest-field.tsx`; the server uses `optionalText` with no list); Form on spell steps (`SpellBuilder/steps/step-row.tsx:207`) and variants (`IngredientForm/variants.tsx:254`); Seal Wax (`SpellBuilder/index.tsx:672`); Search Terms (`HelpArticleForm/form.tsx:418-420`).

**Why it matters:** the suggestion list tells the person there are standard values, but a mistyped value is stored without a word. Searches and filters then miss it.

**Recommended fix:**

- **Format rule:** decide per field whether it is a list or free text. For free text, tidy on blur (finding 3); for a list, say in the hint that other values are allowed. Search Terms is free text a Keeper writes to hold words a reader may use that the article does not (`claude-docs/DESIGN.md:484`); it feeds a weighted search vector (`modules/help/schema/help-articles.ts:35,44`), where separators do not matter, so it needs only the default tidy and a hint with an example such as "poisonous".
- **Formats as you type:** no.
- **How to build it:** no new mechanism; reuse the default `tidy` and add hints.

**Follow-up task:** Settle Free-Text or List for Suggest-Only Fields and Tidy Their Values.

### 13. Server Rules for Fields No Form Sends (Owner Decision)

**Severity:** Low. Nothing is shown to a person, so no one is hurt today; the cost is rules that can never be reached from the app and so can rot unnoticed.

**Where:**

- `StockInput.source` and `StockInput.acquiredDate` (`modules/ingredients/validation/stock.ts:28-29`, GraphQL in `graphql/stock.ts:79-87`, `services/stock.ts:410`, column in `schema/inventory-items.ts:64`). No component or app file sends either.
- `DocumentInput` title and lede: the editor sends only the body (`DocumentEditor/editor.tsx:21-36`, title and lede read-only at 179-180). The `updateDocument` mutation exists (`modules/documents/graphql/documents.ts:140-148`, `modules/documents/services/editing.ts:140-147`), but no component calls it.

**Why it matters:** an untested path is not harmless; it is unused until someone builds on it, and then it has never been exercised through a browser.

**Recommended fix:**

- **Owner decision:** build a form for these fields, or remove them in the usual two-step. This audit recommends building none until a story calls for one. If they are built, they must follow the rules in findings 3, 4 and 9.
- **Follow-up task:** Decide Whether to Build or Remove Stock Source, Acquired Date and Document Title Editing.

### 14. The Support Issue Address Is Tidied Only on Save

**Severity:** Low. The person sees the rewritten address only after submitting, and the field is `type="url"` for a value that can also be a board link.

**Status:** Fixed — the support issue address is tidied on blur by the same `normaliseIssueLink` the server applies.

**Where:** `SupportRequests/issue-panel.tsx:99`; the normaliser is `normaliseIssueLink` in `lib/support-path.ts`, which accepts a GitHub issue address or a board link with `issue=owner|repo|n`, with `ISSUE_LINK_EXPECTED` as the refusal.

**Why it matters:** the form changes the person's input after Save, so the person never sees the tidied form of what they typed; tidying on blur shows it while they can still correct it [S3][S10].

**Recommended fix:**

- **Format rule:** unchanged.
- **Formats as you type:** no. Normalises on blur: pass `normaliseIssueLink` as `format` so the person sees the result before Save.
- **How to build it:** part of moving the field onto Field (finding 8).

**Follow-up task:** Normalise the Support Issue Address on Blur.

### 15. Reference Dates Use the Browser's Date Input and Have No `max`

**Severity:** Low. The rest of the app uses `DateField`; here the browser's date control appears, and a future date is refused only on Save.

**Status:** Fixed — the reference days use `DateField` with `max` from `latestDay()`, and the server check stays.

**Where:** `IngredientForm/reference-panel.tsx:222` (Last Modified) and `:225` (Accessed): `type: 'date'` only, no `max`. `latestDay` in `modules/ingredients/validation/reference-format.ts:119` is used only by `modules/ingredients/validation/reference.ts` ("That day is in the future").

**Why it matters:** the date control's look and keyboard behaviour differ by browser, and the person can pick a future date that the server then refuses.

**Recommended fix:**

- **Format rule:** a calendar day, not in the future, and (for Last Modified) not after the day it was read.
- **Formats as you type:** no.
- **How to build it:** use `DateField` with its existing `min` and a new `max` prop set from `latestDay()`; or add `max` to `TextField` for the `date` type. Keep the server check.

**Follow-up task:** Use DateField with a Maximum Day for Reference Dates.

## Inventory

Users: **S** Steward, **P** Practitioner, **K** Keeper, **C** Curator. Paths are under `src/components/` unless they start with `modules/` or `lib/`. A row whose input ends in "(choice)" is a pick from a fixed set: the person cannot enter free characters. All other rows are typed-text inputs: the person can enter free characters (text, text area, number, address, email, hex, or a box that accepts typed text). "When" says when the client check runs; "blur" means on leaving the field, "change" means on each keystroke after the first check. "Formats as you type" is "No" everywhere except where stated, because no input in the app reformats while typing. "Would gain" lists the findings that apply.

### Spell Builder

| Input                    | file:line                               | Users | Expected format                             | Client check                                         | Server check                                                                | When              | Message shown                                                                  | Formats as you type | Would gain |
| ------------------------ | --------------------------------------- | ----- | ------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ | ------------------- | ---------- |
| Title                    | SpellBuilder/index.tsx:643              | S, P  | Free text                                   | Zod `SpellInput`                                     | `modules/grimoire/validation/spell.ts` (required only when marked complete) | Blur, then change | "Give the spell a title before marking it complete"                            | No                  | 3, 4, 9    |
| Intent                   | SpellBuilder/index.tsx:649              | S, P  | Free text                                   | None                                                 | `optionalText`                                                              | Not checked       | None                                                                           | No                  | 3, 4, 9    |
| Jar Description          | SpellBuilder/index.tsx:664              | S, P  | Free text                                   | None                                                 | `optionalText`                                                              | Not checked       | None                                                                           | No                  | 3, 4, 9    |
| Seal Wax                 | SpellBuilder/index.tsx:672              | S, P  | Free text (placeholder suggests a colour)   | None                                                 | `optionalText`                                                              | Not checked       | None                                                                           | No                  | 3, 10, 12  |
| Moon Phase               | SpellBuilder/index.tsx:697              | S, P  | Suggested value or typed text               | None                                                 | `optionalText`, no list                                                     | Not checked       | None                                                                           | No                  | 3, 12      |
| Day                      | SpellBuilder/index.tsx:704              | S, P  | Suggested value or typed text               | None                                                 | `optionalText`, no list                                                     | Not checked       | None                                                                           | No                  | 3, 12      |
| Note                     | SpellBuilder/index.tsx:715              | S, P  | Free text                                   | None                                                 | `optionalText`                                                              | Not checked       | None                                                                           | No                  | 3, 4, 9    |
| Instruction              | SpellBuilder/steps/step-row.tsx:110     | S, P  | Free text                                   | Zod, step                                            | `modules/grimoire/validation/spell-step.ts`                                 | Blur, then change | "Write the instruction, or remove it"                                          | No                  | 3, 4, 9    |
| Ingredient Name          | SpellBuilder/steps/step-row.tsx:196     | S, P  | Free text or a chosen ingredient            | Zod, step                                            | `spell-step.ts`                                                             | Blur, then change | "Give the ingredient a name"; "Choose an ingredient or write a name, not both" | No                  | 3, 9       |
| Form                     | SpellBuilder/steps/step-row.tsx:207     | S, P  | Free text                                   | Zod, step                                            | `spell-step.ts`                                                             | Blur, then change | "Give the form a name, or remove it"                                           | No                  | 3, 12      |
| Quantity                 | SpellBuilder/steps/step-row.tsx:220     | S, P  | Decimal, 0 or more, 3 places, up to the max | `type="number"`; zod on `Number()` (`values.ts:183`) | `spell-step.ts`                                                             | Blur, then change | "Quantity must be a number"; "Quantity cannot be negative"; "...too large..."  | No                  | 1, 9       |
| Unit (choice)            | SpellBuilder/steps/step-row.tsx:230     | S, P  | One of the listed units                     | Zod                                                  | `spell-step.ts`                                                             | Change            | "Choose a unit from the list"                                                  | n/a                 | None       |
| Category Picker (choice) | SpellBuilder/index.tsx (CategoryPicker) | S, P  | One of the categories                       | None                                                 | Service                                                                     | Save              | "No such category"                                                             | n/a                 | None       |

### Record a Working

| Input         | file:line                      | Users | Expected format          | Client check                     | Server check                               | When | Message shown                                                 | Formats as you type | Would gain |
| ------------- | ------------------------------ | ----- | ------------------------ | -------------------------------- | ------------------------------------------ | ---- | ------------------------------------------------------------- | ------------------- | ---------- |
| Date (choice) | RecordWorking/form.tsx:241-242 | S, P  | A calendar day           | Hand-written `DAY.test`, not zod | `CalendarDay` in `WorkingInput`            | Save | Per-field server message                                      | n/a                 | 11         |
| Participants  | RecordWorking/form.tsx:258     | S, P  | A member or a typed name | Trims and removes repeats        | `requiredText`; one mention each; not both | Save | "Write a name, or remove it"; "Each person can be named once" | No                  | 3, 8       |
| Note          | RecordWorking/form.tsx:296-297 | S, P  | Free text                | Trimmed on submit                | `optionalText`                             | Save | None                                                          | No                  | 3, 4, 8, 9 |

### Vocabulary (Keeper, Curator)

| Input                       | file:line                      | Users | Expected format          | Client check               | Server check                            | When              | Message shown                                                       | Formats as you type | Would gain |
| --------------------------- | ------------------------------ | ----- | ------------------------ | -------------------------- | --------------------------------------- | ----------------- | ------------------------------------------------------------------- | ------------------- | ---------- |
| Group Name                  | GroupForm/index.tsx:460        | K, C  | Free text                | Zod                        | `curatedValueInput`                     | Blur, then change | "Give the {noun} a name"                                            | No                  | 3, 4       |
| Group Description           | GroupForm/index.tsx:467        | K, C  | Free text                | Zod                        | `curatedValueInput`                     | Blur, then change | "Describe the {noun}"                                               | No                  | 3, 4       |
| Icon (choice)               | GroupForm/index.tsx            | K, C  | One of six icons or none | Zod                        | Enum                                    | Change            | "Choose one of the six icons, or none"                              | n/a                 | None       |
| Chip Colour, Light (hex)    | ChipColorField/index.tsx:240   | K, C  | `#` and six hex digits   | Zod (`lib/contrast.ts:14`) | Same, plus contrast and hue-pair checks | Blur, then change | "Choose a colour, as a hex like #4e8bc2"; "...needs at least 4.5:1" | No                  | 6, 8       |
| Chip Colour, Dark (hex)     | ChipColorField/index.tsx:240   | K, C  | `#` and six hex digits   | Zod                        | Same                                    | Blur, then change | Same                                                                | No                  | 6, 8       |
| Value Name                  | GroupedValueForm/index.tsx:428 | K, C  | Free text                | Zod                        | `curatedValueInput`                     | Blur, then change | "Give the {noun} a name"                                            | No                  | 3, 4       |
| Other Names                 | GroupedValueForm/index.tsx:435 | K, C  | List of text             | Zod, repeats               | Same                                    | Blur, then change | "{value} already has this other name"                               | No                  | 3          |
| Value Description           | GroupedValueForm/index.tsx:444 | K, C  | Free text                | Zod                        | `curatedValueInput`                     | Blur, then change | "Describe the {noun}"                                               | No                  | 3, 4       |
| Group or Tradition (choice) | GroupedValueForm/index.tsx     | K, C  | A chosen group           | Zod                        | Row id                                  | Change            | "Choose a group"; "Choose a tradition"                              | n/a                 | None       |

### Cupboard Entry

| Input                     | file:line                       | Users | Expected format      | Client check | Server check                      | When | Message shown                                                        | Formats as you type | Would gain |
| ------------------------- | ------------------------------- | ----- | -------------------- | ------------ | --------------------------------- | ---- | -------------------------------------------------------------------- | ------------------- | ---------- |
| Label                     | CupboardEntryForm/index.tsx:304 | S, P  | Free text            | None         | `optionalText`                    | Save | None                                                                 | No                  | 3, 4, 8    |
| Description               | CupboardEntryForm/index.tsx:302 | S, P  | Free text            | None         | `optionalText`                    | Save | None                                                                 | No                  | 3, 4, 8, 9 |
| Safety Notes              | CupboardEntryForm/index.tsx:291 | S, P  | Free text            | None         | `optionalText`                    | Save | None                                                                 | No                  | 3, 4, 8, 9 |
| Colours                   | CupboardEntryForm/index.tsx:359 | S, P  | List of colour words | None         | `textList` trims and drops blanks | Save | None                                                                 | No                  | 3, 10      |
| Elements (choice)         | CupboardEntryForm/index.tsx:331 | S, P  | Chosen from five     | None         | Server enum                       | Save | "Choose one of the five elements"; "Each element can be chosen once" | n/a                 | None       |
| Celestial Bodies (choice) | CupboardEntryForm/index.tsx:337 | S, P  | Chosen from the list | None         | Server                            | Save | Server message                                                       | n/a                 | None       |
| Zodiac Signs (choice)     | CupboardEntryForm/index.tsx:348 | S, P  | Chosen from the list | None         | Server                            | Save | Server message                                                       | n/a                 | None       |

### Coven

| Input                | file:line                                   | Users | Expected format          | Client check                         | Server check               | When | Message shown                    | Formats as you type | Would gain |
| -------------------- | ------------------------------------------- | ----- | ------------------------ | ------------------------------------ | -------------------------- | ---- | -------------------------------- | ------------------- | ---------- |
| Coven Name (create)  | CreateWorkspaceForm/index.tsx:79            | K     | Text up to 80 characters | Button disabled when empty; no limit | `workspace-creation.ts:19` | Save | "Keep the name to 80 characters" | No                  | 3, 4, 8    |
| Coven Name (rename)  | RenameWorkspaceForm/index.tsx:83            | S     | Text up to 80 characters | Button disabled when empty; no limit | `workspace-rename.ts:19`   | Save | "Keep the name to 80 characters" | No                  | 3, 4, 8    |
| New Steward (choice) | LeaveWorkspaceButton/owner-exit.tsx:171-175 | S     | A chosen member          | Required                             | Server                     | Save | Server message                   | n/a                 | None       |

### Invitations and Printed Cards

| Input                  | file:line                            | Users | Expected format           | Client check                                | Server check                                  | When               | Message shown                                                       | Formats as you type | Would gain |
| ---------------------- | ------------------------------------ | ----- | ------------------------- | ------------------------------------------- | --------------------------------------------- | ------------------ | ------------------------------------------------------------------- | ------------------- | ---------- |
| Email Address (coven)  | InviteDialog/index.tsx:99            | S     | One email address         | `validateEmailAddress(normaliseEmail(...))` | `modules/coven/services/invitations.ts:73-78` | Save               | "Enter an email address"; "That doesn't look like an email address" | No                  | 5, 8, 9    |
| Role (choice)          | InviteDialog/index.tsx               | S     | Observer or Practitioner  | None                                        | Database CHECK                                | Save               | Server message                                                      | n/a                 | None       |
| Email Address (Keeper) | AdminInvitations/invite-form.tsx:90  | K     | One email address         | None                                        | Server                                        | Save               | Server message                                                      | No                  | 5, 8, 9    |
| Role (Keeper, choice)  | AdminInvitations/invite-form.tsx:103 | K     | Chosen role               | None                                        | Server                                        | Save               | Server message                                                      | n/a                 | None       |
| Reason                 | AdminInvitations/invite-form.tsx:115 | K     | Free text                 | None                                        | `adminDeclaration` trims; no limit            | Save               | None                                                                | No                  | 3, 4, 8    |
| Number of Sheets       | AdminCards/mint-form.tsx:177         | K     | Whole number 1 to 50      | `min`, `max`, live `sheetsRefusal`          | `invitation-cards.ts:86-99`                   | Change             | "A batch is from 1 to 50 sheets"                                    | No                  | 8          |
| Expiry Date (choice)   | AdminCards/mint-form.tsx:195         | K     | A day, not before today   | `min`                                       | Server                                        | Change             | Server message                                                      | n/a                 | None       |
| Note                   | AdminCards/mint-form.tsx:207-211     | K     | Text up to 500 characters | Hard `maxLength`                            | Service; database CHECK                       | Typing (hard stop) | "A note is at most 500 characters"                                  | No (cuts at limit)  | 4, 8       |
| Print Backs (choice)   | AdminCards/mint-form.tsx             | K     | On or off                 | None                                        | None                                          | n/a                | None                                                                | n/a                 | None       |
| Beta Testers (choice)  | AdminCards/mint-form.tsx             | K     | On or off                 | None                                        | None                                          | n/a                | None                                                                | n/a                 | None       |

### Business Cards

| Input                  | file:line                  | Users | Expected format | Client check | Server check | When   | Message shown                                       | Formats as you type | Would gain |
| ---------------------- | -------------------------- | ----- | --------------- | ------------ | ------------ | ------ | --------------------------------------------------- | ------------------- | ---------- |
| Name                   | BusinessCards/index.tsx:80 | K     | Free text       | Zod          | None         | Submit | "Enter the name to print."                          | No                  | 8, 9, 11   |
| Email                  | BusinessCards/index.tsx:81 | K     | Email address   | `z.email`    | None         | Submit | "Enter an email address, such as name@example.com." | No                  | 5, 8, 9    |
| Phone                  | BusinessCards/index.tsx:82 | K     | Any text        | Not empty    | None         | Submit | "Enter the phone number to print."                  | No                  | 8, 9       |
| Include Backs (choice) | BusinessCards/index.tsx:84 | K     | On or off       | None         | None         | n/a    | None                                                | n/a                 | None       |

### Keeper User Management

| Input                    | file:line                                 | Users | Expected format           | Client check     | Server check                                | When               | Message shown                        | Formats as you type | Would gain |
| ------------------------ | ----------------------------------------- | ----- | ------------------------- | ---------------- | ------------------------------------------- | ------------------ | ------------------------------------ | ------------------- | ---------- |
| Pause Length (choice)    | UserDetail/access-pause-parts.tsx         | K     | One of the listed lengths | None             | Server                                      | Change             | Server message                       | n/a                 | None       |
| Pause Until (choice)     | UserDetail/access-pause-parts.tsx:106     | K     | A day, not before today   | `min`            | Server                                      | Change             | Server message                       | n/a                 | None       |
| Pause Note               | UserDetail/access-pause-parts.tsx:117-123 | K     | Text up to 500 characters | Hard `maxLength` | `modules/coven/services/member-pause.ts:22` | Typing (hard stop) | "Keep the note to 500 characters"    | No (cuts at limit)  | 4, 8       |
| Pause Message            | UserDetail/access-pause-parts.tsx:136-142 | K     | Text up to 500 characters | Hard `maxLength` | `modules/support/services/timeouts.ts:20`   | Typing (hard stop) | "Keep the message to 500 characters" | No (cuts at limit)  | 4, 8       |
| Reason (role change)     | UserList/role-control.tsx:90              | K     | Free text                 | None             | No limit                                    | Save               | None                                 | No                  | 3, 4, 8    |
| Reason (grant creation)  | UserList/creation-control.tsx:64          | K     | Free text                 | None             | No limit                                    | Save               | None                                 | No                  | 3, 4, 8    |
| Reason (revoke creation) | UserList/creation-control.tsx:83          | K     | Free text                 | None             | No limit                                    | Save               | None                                 | No                  | 3, 4, 8    |

### Support-Request Review

| Input         | file:line                          | Users | Expected format                              | Client check                   | Server check                            | When   | Message shown                         | Formats as you type | Would gain |
| ------------- | ---------------------------------- | ----- | -------------------------------------------- | ------------------------------ | --------------------------------------- | ------ | ------------------------------------- | ------------------- | ---------- |
| Issue Address | SupportRequests/issue-panel.tsx:99 | K     | Issue address or board link with an issue id | `normaliseIssueLink` on submit | Receives the normalised link            | Submit | `ISSUE_LINK_EXPECTED`                 | No                  | 14, 8, 9   |
| Reply         | SupportRequests/reply-form.tsx:118 | K     | Text up to 4000 characters                   | None, no count                 | `modules/support/validation/support.ts` | Save   | "Keep the message to 4000 characters" | No                  | 4, 8       |

### Documents

| Input                 | file:line                                  | Users | Expected format  | Client check                       | Server check                                           | When     | Message shown                                            | Formats as you type | Would gain |
| --------------------- | ------------------------------------------ | ----- | ---------------- | ---------------------------------- | ------------------------------------------------------ | -------- | -------------------------------------------------------- | ------------------- | ---------- |
| Document Text         | DocumentEditor/editor.tsx (RichTextEditor) | K, C  | Markdown         | Autosave with revision check       | `DocumentInput`                                        | Autosave | Conflict message                                         | No                  | 7          |
| Link Address          | RichTextEditor/link-dialog.tsx:31          | K, C  | Full web address | `upsertLink` result                | None found for links                                   | Add      | "Enter a full web address, such as https://example.com." | No                  | 7, 8, 9    |
| Summary of the Change | DocumentMailingPanel/index.tsx:131         | K     | Free text        | Send disabled until written; trims | `modules/documents/services/document-mailing.ts:42-43` | Send     | "Write what changed"                                     | No                  | 3, 4, 8, 9 |

### Help Articles

| Input              | file:line                                    | Users | Expected format        | Client check          | Server check                      | When              | Message shown                                          | Formats as you type | Would gain |
| ------------------ | -------------------------------------------- | ----- | ---------------------- | --------------------- | --------------------------------- | ----------------- | ------------------------------------------------------ | ------------------- | ---------- |
| Title              | HelpArticleForm/form.tsx:399-401             | K, C  | Text                   | Local `z.looseObject` | `modules/help/validation/help.ts` | Blur, then change | "Give it a title" (server: "Give the article a title") | No                  | 3, 4, 11   |
| Summary            | HelpArticleForm/form.tsx:416                 | K, C  | Text                   | None                  | `optionalText`                    | Save              | None                                                   | No                  | 3, 4       |
| Search Terms       | HelpArticleForm/form.tsx:418-420             | K, C  | Words a reader may use | None                  | `optionalText`                    | Save              | None                                                   | No                  | 12         |
| Body               | HelpArticleForm/form.tsx:432                 | K, C  | Markdown               | Local check           | `help.ts`                         | Blur, then change | "Give it a body" (server: "Give the article a body")   | No                  | 7, 11      |
| Shown (choice)     | HelpArticleForm/form.tsx:477                 | K, C  | On or off              | None                  | None                              | n/a               | None                                                   | n/a                 | None       |
| Parent (choice)    | HelpArticleForm/form.tsx:484                 | K, C  | A chosen article       | None                  | Server                            | Change            | Server message                                         | n/a                 | None       |
| Audience (choice)  | HelpArticleForm/form.tsx                     | K, C  | A chosen audience      | None                  | Server                            | Change            | Server message                                         | n/a                 | None       |
| Sub Pages (choice) | HelpArticleForm/form.tsx (HelpSubPagesField) | K, C  | Chosen articles        | None                  | Server                            | Change            | Server message                                         | n/a                 | None       |

Position is derived by the form (`Number(typed)` at `HelpArticleForm/form.tsx:198`); it is not a separate input.

### Ingredient Form

| Input                     | file:line                             | Users      | Expected format      | Client check                 | Server check                                   | When              | Message shown          | Formats as you type | Would gain |
| ------------------------- | ------------------------------------- | ---------- | -------------------- | ---------------------------- | ---------------------------------------------- | ----------------- | ---------------------- | ------------------- | ---------- |
| Name (duplicate lookup)   | IngredientForm/duplicates.tsx:827-828 | K, C, S, P | Free text            | Zod; duplicate warning       | `modules/ingredients/validation/ingredient.ts` | Blur, then change | Duplicate warning      | No                  | 3, 9       |
| Formal Name               | IngredientForm/index.tsx:931-933      | K, C, S, P | Unique identifier    | Zod                          | Same; no format rule                           | Blur, then change | Required-field message | No                  | 3, 9       |
| Folk Names                | IngredientForm/index.tsx:948          | K, C, S, P | List of text         | Repeat hidden in suggestions | Server removes repeats                         | Change            | None                   | No                  | 3          |
| Description               | IngredientForm/index.tsx:973-975      | K, C, S, P | Free text            | None                         | No limit                                       | Not checked       | None                   | No                  | 3, 4, 9    |
| Safety Notes              | IngredientForm/index.tsx:980-982      | K, C, S, P | Free text            | None                         | No limit                                       | Not checked       | None                   | No                  | 3, 4, 9    |
| Colours                   | IngredientForm/index.tsx:1025-1026    | K, C, S, P | List of colour words | None                         | Server                                         | Not checked       | None                   | No                  | 3, 10      |
| Classification (choice)   | IngredientForm/index.tsx:919-921      | K, C, S, P | Chosen from list     | Zod                          | Server                                         | Change            | Server message         | n/a                 | None       |
| Toxic (choice)            | IngredientForm/index.tsx:987          | K, C, S, P | Yes or no            | None                         | None                                           | n/a               | None                   | n/a                 | None       |
| Element (choice)          | IngredientForm/index.tsx:998          | K, C, S, P | One of five          | None                         | Server                                         | Change            | Server message         | n/a                 | None       |
| Celestial Bodies (choice) | IngredientForm/index.tsx:1005-1011    | K, C, S, P | Chosen from list     | None                         | Server                                         | Change            | Server message         | n/a                 | None       |
| Zodiac Signs (choice)     | IngredientForm/index.tsx:1013-1019    | K, C, S, P | Chosen from list     | None                         | Server                                         | Change            | Server message         | n/a                 | None       |
| Deities (choice)          | IngredientForm/index.tsx:1033-1037    | K, C, S, P | Chosen from list     | None                         | Server                                         | Change            | Server message         | n/a                 | None       |

### Variants

| Input                             | file:line                           | Users      | Expected format                   | Client check             | Server check | When              | Message shown              | Formats as you type | Would gain |
| --------------------------------- | ----------------------------------- | ---------- | --------------------------------- | ------------------------ | ------------ | ----------------- | -------------------------- | ------------------- | ---------- |
| New Form                          | IngredientForm/variants.tsx:254     | K, C, S, P | Pick (Compendium) or type (coven) | "Pick ... from the list" | Form is text | Blur, then change | "Pick "..." from the list" | No                  | 3, 12      |
| Variant Description               | IngredientForm/variants.tsx:469-471 | K, C, S, P | Free text                         | None                     | No limit     | Not checked       | None                       | No                  | 3, 4, 9    |
| Variant Safety Notes              | IngredientForm/variants.tsx:477-479 | K, C, S, P | Free text                         | None                     | No limit     | Not checked       | None                       | No                  | 3, 4, 9    |
| Variant Colours                   | IngredientForm/variants.tsx:526     | K, C, S, P | List of colour words              | None                     | Server       | Not checked       | None                       | No                  | 3, 10      |
| Variant Toxic (choice)            | IngredientForm/variants.tsx:485     | K, C, S, P | Yes or no                         | None                     | None         | n/a               | None                       | n/a                 | None       |
| Variant Element (choice)          | IngredientForm/variants.tsx:495     | K, C, S, P | One of five                       | None                     | Server       | Change            | Server message             | n/a                 | None       |
| Variant Celestial Bodies (choice) | IngredientForm/variants.tsx:500     | K, C, S, P | Chosen from list                  | None                     | Server       | Change            | Server message             | n/a                 | None       |
| Variant Zodiac Signs (choice)     | IngredientForm/variants.tsx:513     | K, C, S, P | Chosen from list                  | None                     | Server       | Change            | Server message             | n/a                 | None       |
| Variant Deities (choice)          | IngredientForm/variants.tsx:552     | K, C, S, P | Chosen from list                  | None                     | Server       | Change            | Server message             | n/a                 | None       |
| Substitute Form (choice)          | IngredientForm/substitute-forms.tsx | K, C, S, P | Chosen form                       | None                     | Server       | Change            | Server message             | n/a                 | None       |

### References

| Input                         | file:line                              | Users      | Expected format                         | Client check                        | Server check              | When | Message shown                                                                           | Formats as you type | Would gain |
| ----------------------------- | -------------------------------------- | ---------- | --------------------------------------- | ----------------------------------- | ------------------------- | ---- | --------------------------------------------------------------------------------------- | ------------------- | ---------- |
| Title                         | IngredientForm/reference-panel.tsx:152 | K, C, S, P | Chicago-style title                     | `format` plus zod                   | `validation/reference.ts` | Blur | Messages in `reference.ts:38-112`                                                       | No                  | 10         |
| Container (journal and so on) | IngredientForm/reference-panel.tsx:158 | K, C, S, P | Chicago-style name                      | `format` plus zod                   | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Authors                       | IngredientForm/reference-panel.tsx:166 | K, C, S, P | "Surname, Forename"                     | `format` plus zod                   | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Contributors                  | IngredientForm/reference-panel.tsx:171 | K, C, S, P | Names                                   | `format` plus zod                   | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Edition                       | IngredientForm/reference-panel.tsx:176 | K, C, S, P | Chicago edition                         | `chicagoEdition`                    | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Volume                        | IngredientForm/reference-panel.tsx:181 | K, C, S, P | Number list                             | `isNumberList`                      | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Series                        | IngredientForm/reference-panel.tsx:186 | K, C, S, P | Text                                    | `format` plus zod                   | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Place                         | IngredientForm/reference-panel.tsx:191 | K, C, S, P | Text                                    | `format` plus zod                   | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Publisher                     | IngredientForm/reference-panel.tsx:196 | K, C, S, P | Text                                    | `format` plus zod                   | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Published                     | IngredientForm/reference-panel.tsx:201 | K, C, S, P | A year                                  | `holdsYear`                         | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Pages                         | IngredientForm/reference-panel.tsx:207 | K, C, S, P | Page range                              | `dashRanges`                        | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Read Through                  | IngredientForm/reference-panel.tsx:212 | K, C, S, P | Text                                    | `format` plus zod                   | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Address                       | IngredientForm/reference-panel.tsx:217 | K, C, S, P | Web address starting with http or https | `withScheme`; `addressProblem`      | `reference.ts`            | Blur | "Give the full address, starting http:// or https://"; "That is not a web address: ..." | No (blur)           | 9          |
| Note                          | IngredientForm/reference-panel.tsx:231 | K, C, S, P | Free text                               | `format` plus zod                   | `reference.ts`            | Blur | Same                                                                                    | No                  | 4          |
| Article Volume                | IngredientForm/reference-panel.tsx:273 | K, C, S, P | Number list                             | `isNumberList`                      | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Article Issue                 | IngredientForm/reference-panel.tsx:274 | K, C, S, P | Number list                             | `isNumberList`                      | `reference.ts`            | Blur | Same                                                                                    | No                  | 10         |
| Locator                       | IngredientForm/references.tsx:429      | K, C, S, P | Page range                              | Own copy of `formatLocator` on blur | `reference.ts`            | Blur | Same                                                                                    | No                  | 3, 8, 9    |
| Last Modified (choice)        | IngredientForm/reference-panel.tsx:222 | K, C, S, P | A day, not in the future                | Native date input, no `max`         | `reference.ts`            | Save | "That day is in the future"                                                             | n/a                 | 15         |
| Accessed (choice)             | IngredientForm/reference-panel.tsx:225 | K, C, S, P | A day, not in the future                | Native date input, no `max`         | `reference.ts`            | Save | "It cannot have been modified after the day it was read"                                | n/a                 | 15         |
| Kind (choice)                 | IngredientForm/reference-panel.tsx:147 | K, C, S, P | One of the source kinds                 | None                                | Enum                      | Save | "Choose what kind of source this is"                                                    | n/a                 | None       |

### Stock

| Input             | file:line                | Users | Expected format                             | Client check                | Server check                              | When              | Message shown                                                          | Formats as you type | Would gain |
| ----------------- | ------------------------ | ----- | ------------------------------------------- | --------------------------- | ----------------------------------------- | ----------------- | ---------------------------------------------------------------------- | ------------------- | ---------- |
| Quantity          | StockFields/index.tsx:22 | S, P  | Decimal, 0 or more, 3 places, up to the max | `type="number"`; `amountOf` | `modules/ingredients/validation/stock.ts` | Blur, then change | "{label} must be a number"; "...cannot be negative"; "...too large..." | No                  | 1, 9, 10   |
| Unit (choice)     | StockFields/index.tsx:31 | S, P  | One of the listed units                     | None                        | Enum                                      | Change            | Server message                                                         | n/a                 | None       |
| Low Stock At      | StockFields/index.tsx:40 | S, P  | Same as Quantity                            | `type="number"`             | Same                                      | Blur, then change | Same                                                                   | No                  | 1, 9       |
| Add Form (choice) | StockDialog/form.tsx:314 | S, P  | A chosen form                               | None                        | Server                                    | Change            | Server message                                                         | n/a                 | None       |

### Count of Inputs

The inventory has **115 inputs** in all, of which **78 are typed-text inputs** and 37 are choices. Each input counts once per form it appears in; a shared input (for example the chip colour field, with a light and a dark value) counts once per value. Counts come from the table rows above.

| Form                          | All inputs | Typed text | Choice |
| ----------------------------- | ---------- | ---------- | ------ |
| Spell Builder                 | 13         | 11         | 2      |
| Record a Working              | 3          | 2          | 1      |
| Vocabulary (Keeper, Curator)  | 9          | 7          | 2      |
| Cupboard Entry                | 7          | 4          | 3      |
| Coven                         | 3          | 2          | 1      |
| Invitations and Printed Cards | 10         | 6          | 4      |
| Business Cards                | 4          | 3          | 1      |
| Keeper User Management        | 7          | 5          | 2      |
| Support-Request Review        | 2          | 2          | 0      |
| Documents                     | 3          | 3          | 0      |
| Help Articles                 | 8          | 4          | 4      |
| Ingredient Form               | 12         | 6          | 6      |
| Variants                      | 10         | 4          | 6      |
| References                    | 20         | 17         | 3      |
| Stock                         | 4          | 2          | 2      |
| **Total**                     | **115**    | **78**     | **37** |

## UX Rules Applied

These are the rules used to write the recommended fixes. They are condensed from the research; a label such as [S3] points to the Sources list.

1. **Check on blur, not on each keystroke at first.** Once a field has shown an error, re-check on each keystroke and clear the error at once when it is fixed. Flag empty required fields only on Save [S1][S2][S3][S7].
2. **Keep what the person typed.** On a failed Save, keep every entry. Show a summary linked to each field, prefix the page title with "Error:" and move focus to the summary [S7][S21].
3. **Identify errors in text and suggest a fix.** Name the field and say how to correct it. Worded from the label, with no "please", "sorry" or "valid" [S17][S19][S21].
4. **Wire the error to the field.** `aria-invalid` is set only after a failed check; the hint and the error are linked by `aria-describedby`; the error is in a live region with a hidden "Error:" prefix [S5][S22].
5. **Labels and instructions.** A visible label above every input; a short hint that states the rule, not only an example [S15][S18].
6. **Placeholders are not hints.** Leave them empty or give a short sample [S42].
7. **No masks.** Do not reformat while typing, never auto-advance focus, never block characters silently, never disable paste. Format on blur and accept varied input [S8][S9][S10][S3][S12]. Baymard found 89% of test subjects entered data in a different format from the example shown [S8].
8. **Amounts.** Use `type="text"` with `inputMode="decimal"`, not `type="number"`. Accept a comma or a point; show the unit next to the field [S15][S27][S28][S29].
9. **Web addresses.** `type="url"`, `inputMode="url"`, `autocapitalize="none"`, `spellcheck="false"`. Accept an address with no scheme and add `https://`. Verify on the server [S30][S31].
10. **Email.** `type="email"`, `autocapitalize="none"`, `spellcheck="false"`; trim; check on blur [S24][S32].
11. **Dates.** One text field for a year; for a full date, three fields day, month, year with numeric keyboards; offer a calendar only as an extra [S12][S16]. This audit finds no typed full-date field in scope, so the rule is recorded and not used in a finding.
12. **Names.** Allow every character; limit length only to the column; use `autocomplete="name"` on a person's own name only; `spellcheck="false"` on non-prose names [S25][S37][S40].
13. **Slugs are not inputs.** Derived from the name and shown read-only [S38]. The help article form already does this.
14. **Length.** A limit only where a column or need demands one; the GOV.UK character-count behaviour [S36].
15. **Mobile.** `enterkeyhint` between fields and `"done"` or `"send"` on the last; `autocapitalize` and `spellcheck` set per field [S39][S40][S41].
16. **Autocomplete tokens** on inputs about the person themselves, to satisfy WCAG 1.3.5 [S23][S26].
17. **Edits that change data** must allow correction before they apply, and destructive actions need confirmation or undo (WCAG 3.3.4) [S20].

## Out of Scope

The audit excluded these hits.

- **Sign-in, account and support forms for Observers and signed-out visitors** (excluded by the brief): `NameForm`, `EmailForm`, `PasswordField`, `PasswordSection`, `Passkeys/rename-fields.tsx`, `SignInPanel/*`, `ForgotPasswordForm`, `SignedOutSupportForm`, `SupportForm`, `SupportSenderRequest/reply-box.tsx`, `SupportViewReplyForm`.
- **Filter, search and sort boxes**, which select rows and store nothing: `AdminCards/filter.tsx`, `AdminCards/arrivals-filter.tsx`, `AdminInvitations/filter.tsx`, `GroupList/filter.tsx`, `GroupedValueList/filter.tsx`, `HelpOutline/filter.tsx`, `HelpOutline/guide-select.tsx`, `HelpSearchForm`, `IngredientSearch/*`, `FacetCombobox/*`, `FacetPanel/*`, `PrivilegeLedger/filter.tsx`, `SupportRequests/filter.tsx`, `UserList/filter.tsx`, `DataTable/sort-select.tsx`, `WorkspaceSwitcher`, `Field/search-field.tsx`, `Field/filter-select-field.tsx`.
- **The Add to Jar picker** (`SpellBuilder/steps/picker.tsx:237`): a search over existing ingredients, not a stored value.
- **Tools that store nothing:** `HelpWidget/refusal-finder.tsx` and `HelpWidget/unit-converter.tsx`.
- **Primitives and wrappers**, counted at their callers: `Combobox/*`, `DateField/calendar.tsx`, `ShownSwitch`, `ConfirmedAction` (its reason field is counted at each caller), `IngredientEntry/coven-choice.tsx` (a choice with no typed text), and the `Field/*` set itself.
- **Story files:** every `*.stories.tsx` hit.
- **ISBN and DOI rules.** The reference panel (`IngredientForm/reference-panel.tsx:166-274`) has no ISBN or DOI input, so no finding about those identifiers applies. A reading of those lines, not a search of the whole app, supports this.

## Sources

- [S1] Wroblewski, Luke. "Inline Validation in Web Forms." _A List Apart_, 1 September 2009. https://alistapart.com/article/inline-validation-in-web-forms/
- [S2] Scott, Edward. "Usability Testing of Inline Form Validation: 31% Don't Have It, 4% Get It Wrong." _Baymard Institute_, 9 January 2024. https://baymard.com/blog/inline-form-validation
- [S3] Friedman, Vitaly. "A Complete Guide To Live Validation UX." _Smashing Magazine_, 21 September 2022. https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/
- [S5] W3C Web Accessibility Initiative. "User Notifications." _Forms Tutorial_, W3C WAI. https://www.w3.org/WAI/tutorials/forms/notifications/
- [S7] GOV.UK Design System. "Validation." _GOV.UK Design System_. https://design-system.service.gov.uk/patterns/validation/
- [S8] Scott, Edward. "Form Field Usability: Avoid Input Masking Mistakes (64% of Sites Get It Wrong)." _Baymard Institute_, 28 November 2017. https://baymard.com/blog/input-masking-form-field
- [S9] Silver, Adam. "The Problem with Input Masks and What to Do Instead." _adamsilver.io_, 25 June 2023. https://adamsilver.io/blog/the-problem-with-input-masks-and-what-to-do-instead/
- [S10] Leatherman, Zach, and Todd Parker. "Politespace, an Unobtrusive Alternative to Input Masks." _Filament Group_, 22 April 2014. https://www.filamentgroup.com/lab/politespace
- [S12] GOV.UK Design System. "Date Input." _GOV.UK Design System_. https://design-system.service.gov.uk/components/date-input/
- [S15] GOV.UK Design System. "Text Input." _GOV.UK Design System_. https://design-system.service.gov.uk/components/text-input/
- [S16] Li, Angie. "Date-Input Form Fields: UX Design Guidelines." _Nielsen Norman Group_, 22 January 2017. https://www.nngroup.com/articles/date-input/
- [S17] W3C. "Understanding Success Criterion 3.3.1: Error Identification." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- [S18] W3C. "Understanding Success Criterion 3.3.2: Labels or Instructions." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html
- [S19] W3C. "Understanding Success Criterion 3.3.3: Error Suggestion." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html
- [S20] W3C. "Understanding Success Criterion 3.3.4: Error Prevention (Legal, Financial, Data)." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html
- [S21] GOV.UK Design System. "Error Message." _GOV.UK Design System_. https://design-system.service.gov.uk/components/error-message/
- [S22] W3C. "ARIA21: Using Aria-Invalid to Indicate An Error Field." _WCAG 2.2 Techniques_. https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA21
- [S23] W3C. "Understanding Success Criterion 1.3.5: Identify Input Purpose." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html
- [S24] GOV.UK Design System. "Email Addresses." _GOV.UK Design System_. https://design-system.service.gov.uk/patterns/email-addresses/
- [S25] GOV.UK Design System. "Names." _GOV.UK Design System_. https://design-system.service.gov.uk/patterns/names/
- [S26] MDN Web Docs. "HTML Attribute: autocomplete." _Mozilla_. https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
- [S27] MDN Web Docs. "<input type=\"number\">." _Mozilla_. https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number
- [S28] MDN Web Docs. "inputmode." _Mozilla_. https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode
- [S29] Wikipedia. "Decimal Separator." _Wikipedia_. https://en.wikipedia.org/wiki/Decimal_separator
- [S30] MDN Web Docs. "<input type=\"url\">." _Mozilla_. https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/url
- [S31] Parecki, Aaron. "Improving the HTML type=\"url\" Field." _aaronparecki.com_, 3 June 2018. https://aaronparecki.com/2018/06/03/4/url-form-field
- [S32] MDN Web Docs. "<input type=\"email\">." _Mozilla_. https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email
- [S36] GOV.UK Design System. "Character Count." _GOV.UK Design System_. https://design-system.service.gov.uk/components/character-count/
- [S37] McKenzie, Patrick. "Falsehoods Programmers Believe About Names." _Kalzumeus Software_, 17 June 2010. https://www.kalzumeus.com/2010/06/17/falsehoods-programmers-believe-about-names/
- [S38] Wikipedia. "Clean URL" (section "Slug"). _Wikipedia_. https://en.wikipedia.org/wiki/Clean_URL
- [S39] MDN Web Docs. "enterkeyhint." _Mozilla_. https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/enterkeyhint
- [S40] MDN Web Docs. "autocapitalize." _Mozilla_. https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autocapitalize
- [S41] MDN Web Docs. "spellcheck." _Mozilla_. https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/spellcheck
- [S42] Sherwin, Katie. "Placeholders in Form Fields Are Harmful." _Nielsen Norman Group_, 11 May 2014. https://www.nngroup.com/articles/form-design-placeholders/
- [S43] Bargas-Avila, Javier A., Sébastien Orsini, Hannah Piosczyk, Dominic Urwyler, and Klaus Opwis. "Enhancing Online Forms: Use Format Specifications for Fields with Format Restrictions to Help Respondents." _Interacting with Computers_ 23, no. 1 (2011): 33–39. https://doi.org/10.1016/j.intcom.2010.08.001 (abstract only, as indexed by the search engine; full text not opened)
