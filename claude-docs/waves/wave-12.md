# Wave 12 — Ingredient UI

M8's UI half, on M4's schema, M5's services and M3's GraphQL, with M9's beside it. One concern has one owner:

- M8.13 owns form and element filters, plus the URL-state mechanism every other chip plugs into
- M9.7 owns source (local vs compendium) and in-stock-only, both of which need M9 data
- M9.8 owns all stock badging
- M8.13a owns safety presentation project-wide; M8.14, M8.19 and M10.18 consume it unmodified
- M8.14 is reduced to the card shell composing the above

Hence the order M8.13, M8.13a, M9.7, M9.8, M8.14: M8.13a lands before its three consumers, and every one of M8.14's dependencies lands before it. MB.7's AppShell is what makes M8.16's and M8.17's "reachable from the main nav on any page" true.

**MB.83 precedes M8.18**, which composes its public frame, proxy entries and signed-in island. **MB.155 follows M8.19**, minted during MB.127: it renders an entry's references beneath its substitutes and above the slot v2's notes take, on the page M8.19 builds and in the Chicago form MB.153's API renders, so it lands once the page exists and before MB.84 indexes it. **MB.84 follows M8.19**, since both compendium pages must exist before they can carry metadata and appear in the sitemap. **MB.106 follows MB.84** for the same reason, since its New and Updated markers sit on M8.18's cards and M8.19's entry page. M5.4's design reviews each follow the last task of their section: **MB.120 follows MB.106**, **MB.121 follows M9.12**, and **MB.122 follows MB.7**, reviewing the nav once it exists. **MB.85 closes the wave**, once every page story 63 walks has landed ([`design-decisions/mb.80-public-compendium.md`](../design-decisions/mb.80-public-compendium.md)). MW.12 is retired (MB.31).
