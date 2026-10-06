# MB.162 — The compendium holds curated values alone

**Decided:** a compendium entry's `form`, `planets`, `zodiacSigns` and
`deities` each name a live curated row — a form under a live group, a deity
under a live tradition — and the compendium services refuse anything else. A
coven's ingredients keep free text. The rule holds after the write as well as
at it: a curated row a live compendium entry holds is not soft-deleted while
it holds it, and a rename carries the new spelling onto those entries. It
narrows DESIGN.md §5's "a value off the list is written as readily as one on
it" for the compendium tier alone, and it is the owner's call, made during
MB.131 and settled in MB.162's scoping.

## Why

MB.131 heads the autofill's two buckets "From Compendium" and "From Coven"
(renamed from "Curated" and "In use", the owner's call), so that a reader
sees where a value comes from. Under §5 as it stood, the second bucket held
in-use values from both tiers: a compendium entry could carry `rhizome`, and
the box would offer it under "From Coven". The headings were true only while
no compendium entry held an uncurated value, and nothing kept that so.

Nothing is lost by making it so. The admin who writes the compendium is the
one who curates the lists, so a value missing from one is added there first,
with the description the vocabularies require, and the entry is written
after. A coven cannot curate, which is why its ingredients stay free text: a
member must be able to write `rhizome` before anyone has curated it (§5,
"`ingredients.form` is `text`").

## The rule

- **The four fields, and only they.** Folk names and colours have no curated
  list and stay free text in both tiers. A compendium substitute already links
  only the compendium (MB.138), and `elements` and `nomenclature` are closed
  enums.
- **A live curated row**, matched as the suggestions fold a value,
  `lower(btrim(value)) = lower(name)`, and only while its group or tradition
  is live, as the autofill reads it ([`db/member-autofill.md`](../db/member-autofill.md)).
  The value is stored in the row's own spelling, so `moon ` is written `Moon`.
- **Refused beside the field**, as a `ValidationError` from
  `createCompendiumEntry` and `updateCompendiumEntry`: `['form']`, or
  `['planets', i]`, `['zodiacSigns', i]` or `['deities', i]` at the entry the
  caller sent, blanks counted. Every refusal at once, so the admin sees the
  whole list to add.
- **The service's, not Zod's or a key's.** The check reads the database, and
  the shared schemas are client-safe, `zod` alone
  ([`validation.md`](../validation.md), "Where the schemas live"). A foreign
  key would refuse a coven's free text too, and MB.35's rule is that a
  vocabulary a member writes is text.
- **The admin pages carry no curation to-do list of values in use.** M5.6a,
  MB.95 and MB.132 were each to list the compendium's in-use values outside
  the vocabulary; under this rule that list could never hold anything, so it
  is dropped from all three. A coven's uncurated values were never on it,
  since an admin reads no workspace's ingredients (M6.6).

## What happens to a held row

A rule checked only at the write would break the moment an admin deleted or
renamed a row an entry holds. The owner chose, for each:

**A delete is refused while a live compendium entry holds the row**, with an
error naming the entries, and the admin edits them first. So is deleting a
form group or deity tradition with such a row under it, since a form under a
deleted group, or a deity under a deleted tradition, is no longer curated.
Weighed:

- _Strip the value from those entries in the same write._ The rule holds, but
  curated data vanishes from entries the admin never opened, unseen.
- _Leave the value on them._ The rule then holds only at the write, an entry
  keeps a value no list has, and MB.131's headings can lie again.

**A rename carries the new spelling onto every live compendium entry holding
the old one, in the same transaction.** Weighed: _refuse a rename while the
row is held._ Simple, but a typo fixed in the vocabulary would first need
every entry holding it edited by hand.

Both apply only while the row is the **last live curated spelling of its
value**: the vocabularies key on the slug, so two live rows may share a name,
"Wax" under _Animal_ and under _Substance_, and an entry holding `Wax` is
curated while either is live. Deleting or renaming one of a pair leaves the
entries curated by the other, so neither blocks nor rewrites them.

**A coven's rows never block a delete and are never rewritten.** They keep
what they wrote; a deleted or renamed value moves into that coven's "From
Coven" bucket. The admin cannot see them anyway.

**A form is identity.** `form` is part of `canonicalKey` and of the slug
(§5; MB.81), so carrying a form's rename onto an entry re-keys it and moves
its address, retiring the old slug as any compendium update does (MB.82). A
rewrite that would make two live entries one identity is refused, naming
both, rather than surfacing the index's error. Planets, signs and deities are
no part of either, so their rewrite touches the list alone.

## What it leaves open

- **The rename's rewrite grows with the compendium.** One rename of `Root`
  may rewrite hundreds of entries, re-keying and re-slugging each, inside one
  admin request. **MB.163** moves it off the request into a background job,
  after launch: the owner's call, unscheduled by design until a rename's
  rewrite nears the function's time limit, so the in-transaction rewrite is
  v1's behaviour.
  Nothing here runs one today: DESIGN.md §14 turned down a scheduled job for
  slug expiry (MB.80), so MB.163 picks the mechanism, and decides how the
  window between the rename and the rewrite keeps the rule.
- **The check is read before the write.** Until MB.148 puts a read inside
  `withAudit` on the write's transaction, the compendium services read the
  curated rows on another connection, so an admin deleting a row at the
  instant another admin writes an entry holding it can see that entry written
  once. Two admins and a few milliseconds; the service says so where it reads.

## What it changed

- DESIGN.md §5 (`form`, the planet and zodiac vocabularies, the deity
  vocabulary, the two readers), §9's admin routes and a §14 row.
- [`db/identity-model.md`](../db/identity-model.md),
  [`validation.md`](../validation.md),
  [`db/compendium-writes.md`](../db/compendium-writes.md),
  [`db/member-autofill.md`](../db/member-autofill.md),
  [`db/astrology-vocabularies.md`](../db/astrology-vocabularies.md),
  [`db/deity-vocabulary.md`](../db/deity-vocabulary.md) and the three seed
  docs.
- M5.6a, M5.6b, MB.95 and MB.132, amended; MB.163, minted, for after launch.
- The `standard` seed's Ginger moves from `rhizome` to the curated `Root`,
  its compendium values take the curated rows' spelling, and `rhizome` moves
  to a coven entry in the `demo` scenario.
