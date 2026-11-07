# Wave 13 review — plan

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Owner decisions (decided 2026-10-23: the recommended option on every one, and the hours table accepted)

**D1. Story numbers 65–69 are taken.** MB.176 (bug reports, minted 2026-10-07) holds story 65 and says the v1 count becomes 53; M16.1–M16.6 (minted 2026-10-16) hold 70–75. The workings plan (also 2026-10-16) took 65–69 on top. Stories 67 and 68 have no text anywhere (the plan wrote only 65, 66 part and 69). `tests/support/story-sections.ts` ends at 64 and `tests/guards/story-sections.test.ts` fails on an unmapped story.

- Recommended: renumber the grimoire additions to **76–80** (65→76 record a working, 66→77 step units, 67→78 complete and deduct, 68→79 workings on the recipe page and the count, 69→80 steps), write the one-line text of 78 and 79 into M13.5 and M13.8, and make M13.4 responsible for the §10 list, the `story-sections.ts` rows (`'Coven - Spells - Workings'`) and the count statements in CLAUDE.md, `claude-docs/testing/acceptance.md:29` and `claude-docs/ci/reusable-checks.md:194`. M13.1 does the same for story 80.
- Alternative: move MB.176 to 76 and M16 to 77–82. More edits, in waves this review does not own.

**D2. Editing a saved spell has no task.** M10.12 builds `/grimoire/new` only; §9 (`DESIGN.md:1339-1341`) lists list, `new` and `[id]`, no edit route; §7 (`DESIGN.md:882-883`) has `createSpell` and `setSpellVisibility` but no `updateSpell`, although M10.10 builds one. The steps editor (M13.3) and the `note` field have no screen after creation.

- Recommended: mint **M13.10 — Edit a saved spell** (3h): `/coven/[slug]/grimoire/[id]/edit` reusing the spell builder, an Edit control on the recipe page (practitioners and stewards, never observers), `updateSpell` added to §7 and the route to §9, story 55's flow extended. Placed after MB.6.
- Alternative: extend M10.12 (already 2h; would need +3h and two routes in one PR).

**D3. Deleting a spell has no task.** §5 (`DESIGN.md:492`) says a shared spell can still be deleted and `access-control.ts` grants `spell: ['delete']`, but no entry builds `deleteSpell`, its mutation or a control.

- Recommended: mint **M13.11 — Delete a spell** (2h): service under `spell: ['delete']`, soft delete that carries the spell's steps and workings with it, mutation, a Delete control on the recipe page following M9.10's pattern (`.btn--destructive`, `ConfirmQuestion`), `deleteSpell` in §7. Placed after M13.10, before M10.22.
- Alternative: fold into M13.10 (breaks one task per PR).

**D4. Reopening a completed spell that has workings.** M10.20 says "Marking complete is explicit and reversible"; M13.5 records a working only against a `complete` spell. A working pins the revision it was made from (§13 note in M13.1), so an existing working survives a reopen.

- Recommended: reopening stays allowed; existing workings keep their records and deductions; no new working can be recorded until the spell is complete again, with an explaining error. Written into M10.20 and M13.5.
- Alternative: refuse reopening while any working exists.

**D5. The working permission.** `access-control.ts` has `spell: [read create update delete]` for practitioner and steward and `spell: ['read']` for observer; nothing for workings. A permission is a per-role statement, never a rank.

- Recommended: M13.5 adds a `working` statement (`read create update delete` for practitioner and steward, `read` for observer) to `access-control.ts` and its tests, so observers write nothing and the check reads as what it is.
- Alternative: reuse `spell: ['update']` for recording a working (reads as editing the recipe, which it is not).

## Corrections (no decision needed; applied by the lanes)

Every item below was checked against staging unless marked "lane verifies first".
