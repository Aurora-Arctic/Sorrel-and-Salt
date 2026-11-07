# AdminNav

`src/components/AdminNav/` is the nav of the two site areas. `CuratorNav` is the `/curator` layout's, a `<nav>` labelled "Curator" with the one Compendium section. The default export, `AdminNav`, is the `/keepers` layout's, labelled "Keepers", with the one People & Support section, Documents and Help at its end. Each sits in the context row beside its lead link and, on a phone, along the foot of the window. They are thin wrappers: the tabs, the bar and the More button are [`SectionNav`](section-nav.md)'s. The same sections are each area's index table of contents, which this component also draws (`CuratorContents` and `AdminContents`). Every page but the compendium is in tabs, each tab at its own address, and the nav links a page at its first tab ([`tabbed-page.md`](tabbed-page.md)).

| Area    | Page        | Tabs: label and route                                                                                                                                                                   |
| ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Curator | Compendium  | none: `/curator/compendium`                                                                                                                                                             |
|         | Categories  | Categories `/curator/categories` · Groups `/curator/category-groups`                                                                                                                    |
|         | Forms       | Forms `/curator/forms` · Groups `/curator/form-groups`                                                                                                                                  |
|         | Deities     | Deities `/curator/deities` · Traditions `/curator/deity-traditions`                                                                                                                     |
|         | Astrology   | Celestial Bodies `/curator/celestial-bodies` · Zodiac Signs `/curator/zodiac-signs`                                                                                                     |
| Keepers | People      | Users `/keepers/users` · Privilege Changes `/keepers/privilege-changes`                                                                                                                 |
|         | Invitations | Invitations `/keepers/invitations` · Invitation Cards `/keepers/invitation-cards` · Card Sign-Ups `/keepers/card-sign-ups`                                                              |
|         | Support     | none: `/keepers/support`                                                                                                                                                                |
|         | Documents   | Terms of Use `/keepers/documents/terms` · Disclaimer `/keepers/documents/disclaimer` · Code of Ethics `/keepers/documents/code-of-ethics` · Privacy Policy `/keepers/documents/privacy` |
|         | Help        | none: `/keepers/help`                                                                                                                                                                   |

## Contracts

- **`sections.ts` is the one list of pages.** People, Invitations, Documents and Help carry `adminOnly: true`, and `adminSections(managesPeople)` drops them and any section left empty. The nav, the index and each tabbed page's layout all read it, so the three cannot drift. A task that adds an admin page, or a tab, adds it to `sections.ts` and to the table above.
- **A list shares a page with the group list that organises it, a tab each**: Categories with their groups, Forms with theirs, Deities with their traditions ([`ingredients.md`, "The admin group pages: where a deleted group's rows go"](../design-decisions/ingredients.md#the-admin-group-pages-where-a-deleted-groups-rows-go)). Celestial Bodies and Zodiac Signs share Astrology. Users and the privilege ledger (the history of what was done to them) share People. A vocabulary's tab takes its address and label from its kind table (`GroupList/kinds.ts`, `GroupedValueList/kinds.ts`); the other addresses are checked against the built routes (`typedRoutes`). A tab marked `filtered` opens with a filter, which its loading skeleton draws.
- **The Support link's count.** The keepers layout reads `needsStaff` with `countSupportViews`. The layout does not re-run on client navigation, so the count is as fresh as its last render. `AdminNav` and `AdminContents` both take `managesPeople`, so the nav and the index leave the same pages out.
- **A curator sees the Curator nav in full and, under Keepers, Support alone.** `managesPeople` is true for a keeper and false for a curator, whom the People, Invitations, Documents and Help pages are left out for. It is display only: the pages' guards refuse a curator whatever the nav shows ([`auth/admin-guard.md`](../auth/admin-guard.md), "The curator guard").
- **Every section is a `PendingLink`** ([`loading.md`](../loading.md)). A soft navigation does not re-run the layout, so the layout's guard does not run on a click either, which is why every page under `/curator` and `/keepers` runs the guard itself.
- **The nav renders only inside the guarded layouts.** `src/app/(shell)/curator/layout.tsx` and `src/app/(shell)/keepers/layout.tsx` render it above the page after the guard has passed, so only a curator or a keeper sees it. The site bar's Curator and Keepers entries are AppShell's, shown to a verified curator or keeper only. The region identifier of both areas stays `admin` in code.
- **The page you are on is marked.** Its link carries `aria-current="page"` and no other link does. A page is current on any of its tabs, so Categories is current on `/curator/category-groups`, and on any address beneath one (`isAtPath` in `src/lib/at-path.ts`, which does not mark a path that merely begins with another's letters). `/curator` and `/keepers` themselves, the indexes, are in no section and mark none. `usePathname()` reads the address, which is why the links are a client component.
- **Tabs, then More, then a bar**, as [`section-nav.md`](section-nav.md) describes. The widths that decide how many tabs fit are measured in `tests/e2e/shell.spec.ts`.

## The wait for an admin page

`target.ts` holds `adminTarget(href)`, which says what each admin page draws while it is on its way, from one table keyed by the page's first-tab address. `index.tsx` sets it on each section, and `AdminContents` passes the same function for its links. What a target does is [`loading.md`](../loading.md)'s ("Where the pieces are used").

- **Every wait belongs to the `admin` region.** It is the `/keepers` layout's `SectionBody` ([`section-body.md`](section-body.md)): it swaps only the page under the context row, so the row and this nav stay while the wait shows. Links into admin from elsewhere (the site bar, the account menu) keep `main`, since there the whole page changes.
- **The shapes.** `/keepers` draws its own heading, so its target is `page`. The Curator and Keepers leads in the context row name `admin` and `page` directly. The Compendium has one tab and so no tab row, and the index has none.
- **The index is the `contents` shape**, drawn in every route into `/keepers`.

## The index

`AdminContents`, exported beside the nav, is each area's index table of contents: a `section` per section of the area, each with its name as an `h2` and a list of its pages. Each page is a link to its first tab with its one line beneath it, which is the link's `aria-describedby` too.

- `src/app/(shell)/keepers/page.tsx` renders it under the heading and a lede, a `<p class="lede">` saying what the area is for. `tests/e2e/admin.spec.ts` measures that paragraph against the reading measure, so the lede stays a `<p>` in `main`.
- **The page is centred** by `.admin-index` (`src/scss/_primitives.scss`) on the `/keepers` page's `<main>`. Its wait (the `contents` shape of `Skeleton`) carries the same class, so the swap is in place.
- **Its links are in the body ink, followed or not**, because the default link colours would make the admin and coven overviews differ by the browser's history.

## Styling

The directory has no stylesheet of its own. The nav's styling is [`section-nav.md`](section-nav.md), "Styling". The index is the `.admin-contents` primitive in `_primitives.scss`, shared with the coven index, since a route loads a component's stylesheet only when it draws the component. The nav sits in the layout's context row above the page's `.page-column` frame ([`styling.md`](../styling.md), "The page column").

## Not here

Stories: [`index.stories.tsx`](../../src/components/AdminNav/index.stories.tsx), in the admin layout through the workshop's `AdminFrame` ([`workshop.md`](../workshop.md), ".storybook/"). The tablet and More shapes are [`SectionNav`](section-nav.md)'s stories.

Tests:

- `tests/components/AdminNav/index.test.tsx`, with `usePathname` mocked
- `tests/app/(shell)/keepers/layout.test.tsx`: the nav renders only once the curator guard resolves.
- `tests/e2e/admin.spec.ts`
