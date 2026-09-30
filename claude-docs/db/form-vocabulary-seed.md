## The form vocabulary seed (M4.3a)

`src/db/seed/forms.ts` seeds DESIGN.md §5's form vocabulary: six
`ingredient_form_groups` rows — Botanical, Animal, Mineral, Substance, Fluid,
Curio — then the 78 `ingredient_forms` §5's table files under them, including
the twelve MB.28 first wrote and the seventeen the animal-derived and
whole-organism cases added. **It is not a scenario**, for the same reason the category seed is not one, and it lands a
task ahead of M1.22 for the same reason too: M1.22's ingredients carry `form`
values, and those should come from a vocabulary that already exists.
`npm run db:seed:forms` runs it — `scripts/db-seed.ts` with a `forms` argument,
the second target on the same script, because the client import there is one
of the four pinned exemptions below.

Everything structural is the category seed's, and since MB.51 literally so —
both call `seedTwoTierVocabulary` (above) with their own tables and literals:
groups first (`ingredient_forms.group_id` is a NOT NULL foreign key),
idempotency keyed on the slug and **ignoring `deleted_at`**, no update to
anything already present, every slug derived by `slugify(name)` rather than
written down, and the whole run inside one transaction that publishes
`app.current_user_id` and stamps through `applyAudit`. What it does not share is a colour: form groups section
an autofill dropdown rather than tinting a chip, so there is no Sass map to
resolve and no contrast floor to clear (§5, MB.35).

**The groups answer "what are you holding", not "how was it made".** Three
by source — Botanical, Animal, Mineral — for what still has the shape it grew
or was dug in; three by state for what has lost it: Fluid for what pours, Curio
for a made or found object, Substance for what has neither shape nor flow. A
powdered mineral is therefore a `powder`, and the ingredient's name says what it
was. The first cut of this vocabulary grouped by process instead — organism
part, preparation, matter — which named a group after a verb and put 21 of its
29 rows in one section; `forms.test.ts` now asserts no group holds more than
half the list, so that failure cannot come back quietly.

**There is no `Other`.** A value that fits no form is typed as free text —
`ingredients.form` is text, not a foreign key — and surfaces in the autofill's
second bucket and on `/admin/forms` as the curation to-do list. A curated
catch-all would swallow exactly the values that list exists to show, and two
unrelated oddities would collapse onto one key. `curio` is not that: it is the
catch-all _within_ Curio, for an object where the name is all there is to say.
M5.10a carries the other half — the suggestion list ends in an explicit "use
what you typed" row, so the escape hatch is visible rather than discovered.

Where a value could sit in two groups the seed takes one sense and says which:
`wax` is a Substance, rendered and set, so an admin who wants raw comb as an
Animal part adds a second row — and may, because uniqueness is on the slug
alone (§5).

**The descriptions are the criterion, not decoration.** §5's argument for the
non-blank CHECK is that a curated value exists to explain itself. So
`forms.test.ts` asserts more than that the column is filled: the descriptions are
pairwise distinct, so a row copied from the one above it fails rather than
reading fine in review.

**One row per kind of thing, not one per word.** `salve` and `balm` are one
`ointment`, and `tincture`, `infusion` and `hydrosol` are one `concoction` — each
description naming the words it stands in for. The second merge is the sharper
case: those three differ by solvent (spirit, water, distillation), and that
distinction is neither universally held nor reliably known at the moment
someone is labelling a bottle, so three rows asked a question the vocabulary
has no business asking. One genus, and the ingredient name carries the rest. That only works because the
suggestion query reads descriptions as well as names (§5, M4.7a): a reader
types `salve`, the dropdown offers _Ointment_, and the vocabulary stays short
without going missing at the word people reach for. A name match outranks a
description match, so `wax` still offers _Wax_ first. It is also why a
description is worth writing carefully beyond review: it is now search surface,
and `ingredient_forms_trgm` indexes the description beside the name (M4.7a).

**A description defines its own form and stops there.** An earlier draft ended
several of them with a redirect — "Set firm, it is a balm", "Distilled off a
plant it is hydrosol" — and a test asserted 30 such pairs named each other.
Both are gone: a definition that has to enumerate its neighbours is doing the
dropdown's job, the clauses read as instructions rather than descriptions, and
the test pushed toward padding a line to keep it passing. Where two forms are
genuinely close, the group headers and the words themselves carry it.

**The vocabulary is asserted against §5's own table**, parsed out of DESIGN.md
at test time — group by group, so the test checks not merely that a form is
present but that it is filed where §5 files it. The parse is itself checked
(the six group names, the twelve MB.28 originals, the seventeen additions) so a
parse that matched nothing cannot make the comparisons vacuous. That is the
same tactic `categories.test.ts` uses on §6's table, for the same reason: a
transcribed copy is exactly what rots.
