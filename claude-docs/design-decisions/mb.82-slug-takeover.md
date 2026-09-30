# MB.82 — A taker ends a retired slug's redirect, once confirmed

**Decided:** a compendium entry's old slug redirects to it for 180 days, as MB.80 set, but it is no longer reserved. Another entry may take the slug, which ends the redirect; the admin is asked to confirm that first, and the page now at the address links to the entry that moved while the old window runs. A coven ingredient's slug follows its name and retires nothing. MB.80's pending claims go, with their columns. This supersedes, in part, [`mb.80-public-compendium.md`](mb.80-public-compendium.md).

## Why the reservation stopped paying

MB.80 reserved a retired slug for its whole window so that a 308 could never come to point at a different ingredient, and gave a rename whose slug was reserved a **pending claim** that took effect when the reservation lapsed. That was designed when the slug was `slugify(name + form)`, where two entries wanting one address was common — the `standard` seed's two _Cat's Claw_ barks. MB.81 then put the formal name in the slug, and that changed who can want a retired one.

A retired slug S belongs to an entry A that moved off it by changing its label, form or formal name. Another entry B wants S only if its label, form and formal name spell what A's used to:

| Case                                                                                      | Can another entry want S?                                                    |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A relabelled, formal name and form kept                                                   | No — B would need A's formal name and form, which the identity index refuses |
| A declares no formal name and is relabelled, and a new entry takes the old label and form | Yes, by a **create**                                                         |
| A's formal name is corrected, and the entry the old name really described is added        | Yes, by a **create**                                                         |
| Another existing entry is renamed into S's text                                           | Yes, by a rename                                                             |

The common case is the first, and every design answers it the same way. Of the rest, two are creates, which the spec's pending claims did not cover: a create has no current slug to keep while it waits, and giving it a temporary one would be a second slug rule. As specified, the admin could not add the correct entry for up to 180 days. And in the correction case the taker is the rightful owner — the URL spells _Artemisia vulgaris_, and B is that plant.

Building the reservation as written would have cost a current-slug expression in every read that shows a slug, and a copy of it in JavaScript for the GraphQL field; lazy promotion of due claims, with backdated retirements; a scope-wide lock, because "is it reserved?" is check-then-write; reclaim logic; and refusals naming who holds a claim and when it lands — about twice the task's estimate, and a name and an address free to disagree for up to 180 days.

## The rule

- **The slug follows the label, the form and the formal name,** in both tiers, recomputed on every update.
- **A compendium entry's old slug is retired as the admin's** — a `retired_ingredient_slugs` row, `retired_at` the write's own instant — and redirects to the entry's current slug until its `expires_at`, midnight UTC of the retirement's date plus 180 days, **while no live entry holds the slug.** An entry holding it is what the address answers.
- **Taking a slug another entry's redirect runs from is refused until the admin confirms it**, as a `ValidationError` on `endRedirect` naming the entry and when its window closes. Confirmed, the write takes the slug. The retirement stays, and the page now at the address names the entry that moved and links to its current address until that window closes. An entry taking back its own old slug needs no confirmation.
- **A coven ingredient's slug retires nothing.** No route reads it — coven ingredients are reached by id — so there is nothing to redirect.
- **Lapsed retirements are hard-deleted on the next compendium write,** as MB.80 had it; nothing runs on a schedule.

## What it costs

The promise MB.80 made — that a 308 never comes to point at a different ingredient inside its window — is given up. A reader who bookmarked A's page for A itself lands on B, whose name is exactly what the URL spells, and the page then links them to A. A search engine sees S go from a 308 to a 200 about a different entry; the ranking A's page had moved to A's new address with the 308, and S's new content starts without history.

The confirmation is read before the write rather than inside it, so two admins saving at the same instant can both pass it. With only admins writing the compendium, that is accepted rather than locked.

## The pending columns

`pending_slug`, `pending_slug_effective_at` and their two partial unique indexes leave the Drizzle schema here and are dropped by **MB.107**, once this has deployed: a column drop is two PRs (CLAUDE.md rule 10), because `migrate.yml` runs before a deploy promotes, and a deploy still declaring a dropped column fails its reads.

## Split out

A "new at this address" notice was considered and widened into a marker every entry carries: **MB.106** marks compendium entries New or Updated for 30 days, whatever their address.

## Tasks

| Task   | What                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ |
| MB.82  | This rule, the confirmation, the address resolution the public route reads, and the docs   |
| MB.107 | Drop the pending-slug columns and indexes, after MB.82 has deployed                        |
| MB.106 | New and Updated markers on compendium entries, in Wave 12                                  |
| M5.5   | The admin form asks for the confirmation and sends the write again with `endRedirect`      |
| M8.19  | The entry page links to the entry that moved off its address; a retired slug answers a 308 |
