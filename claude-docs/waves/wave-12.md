# Wave 12 — Ingredient UI

M8's UI half, on M4's schema, M5's services and M3's GraphQL, with M9's beside it. One concern has one owner:

- M8.13 owns form and element filters, plus the URL-state mechanism every other chip plugs into
- M9.7 owns source (local vs compendium) and in-stock-only, both of which need M9 data
- M9.8 owns all stock badging
- M8.13a owns safety presentation project-wide; M8.14, M8.19 and M10.18 consume it unmodified
- M8.14 is reduced to the card shell composing the above

Hence the order M8.13, M8.13a, M9.7, M9.8, M8.14: M8.13a lands before its three consumers, and every one of M8.14's dependencies lands before it. M8.16's and M8.17's "reachable from the main nav on any page" is the place MB.7's AppShell leaves for them in Wave 9.

**MB.83 precedes M8.18**, which composes its public frame, proxy entries and signed-in island. **MB.155 follows M8.19**, minted during MB.127: it renders an entry's references beneath its substitutes and above the slot v2's notes take, on the page M8.19 builds and in the Chicago form MB.153's API renders, so it lands once the page exists and before MB.84 indexes it. **MB.84 follows M8.19**, since both compendium pages must exist before they can carry metadata and appear in the sitemap. **MB.106 follows MB.84** for the same reason, since its New and Updated markers sit on M8.18's cards and M8.19's entry page. M5.4's design reviews each follow the last task of their section: **MB.120 follows MB.106** and **MB.121 follows M9.12**, with **M12.1 after M9.12 and before MB.121**: M12.1 puts the promote control on the ingredient form once every other change to that form has landed, so MB.121's review covers it. The Wave 11 review minted it on 2026-10-13 as the UI half of M8.3a. The nav's own review, MB.122, was folded into MB.7 in Wave 9 and retired ([wave-09.md](wave-09.md)). **MB.85 closes the wave**, once every page story 63 walks has landed ([`design-decisions/mb.80-public-compendium.md`](../design-decisions/mb.80-public-compendium.md)). MW.12 is retired (MB.31).

**M6.18 follows M9.9**, moved here from Wave 9 on 2026-10-12, the owner's call. It shows who last edited a row, but the rows it annotates are built here: the card (M8.14) and the ingredients page (M9.6), over the stock list query M9.4 lands in Wave 11. A compendium entry reaches a coven only as a stock row the coven owns, so the editor to show is that row's, a member of the coven, and never the compendium entry's own, which an admin last edited. A local entry with no stock row shows the local ingredient's editor.
