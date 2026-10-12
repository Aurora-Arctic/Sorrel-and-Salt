# MB.7 — The navigation shell is a slim bar, a context row and a bottom bar on a phone

**Status:** decided · **Date:** 2026-10-12 (the owner's call, from a rendered mock-up)

**Decided:** every signed-in page sits inside one navigation frame, `AppShell`. It has three parts, called **Option C, the "context header"**:

- **A slim global bar** at the top: the brand link, one Add Ingredient button, the account menu and the theme toggle.
- **A context row** beneath it. On a coven page its left end names the coven and _is_ the coven switcher. On an admin page it reads "Admin" as plain text. The section nav sits beside it as icon tabs, separated by a hairline.
- **A bottom bar on a phone.** At 40rem and narrower the section nav leaves the row and becomes a bar along the bottom of the screen, in the thumb zone.

This also folds MB.122, the design review of the navigation, into MB.7. Once the design is chosen before the build, the review and the build are one piece of work. The scoping plan is [`mb.7-plan.md`](mb.7-plan.md).

## The Problem

Nothing in `src/app` drew a site header, an account menu or an Admin entry. `WorkspaceSwitcher` (M6.9) was mounted nowhere. The theme toggle sat in a fixed corner over page headings at 375px. There was no menu, popover or dropdown piece in the codebase, and no map of which element sits above which (`z-index`).

## What The Navigation Has To Hold

There are four tiers, and the first three are the shell's.

| Tier    | Items                                                                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utility | The brand link, the account menu (Your Account, Sign Out), the theme toggle, and later Report a Bug (MB.176)                                        |
| Primary | The coven switcher (with Create Coven for someone who may create one), Admin for admins, the Compendium once it has a route (MB.80), Add Ingredient |
| Section | The coven's Overview, Ingredients, Grimoire and Members (role-gated); the admin area's Compendium, Categories, Forms, Deities, Astrology and People |
| Tabs    | The admin tabbed pages' segmented control, which belongs to the page and is unchanged in every option                                               |

The shell leaves alone the impersonation banner (above everything), `/`, `/sign-in`, `/invite/[token]` and the public compendium frame.

Constraints every option had to meet: the coven lives in the URL, never the session; `canCreateWorkspace` comes from the user row, never the session; an unverified account reaches only `/account/email`; `/admin` shows a styled not-authorised page to a signed-in non-admin; `/coven/[slug]` is a 404 to a non-member; admin tables keep their 80rem column; tokens only, in both themes; no sideways scroll at 375px; axe clean; operable by keyboard; the current page told by shape and weight as well as colour.

## What The Research Said

- **Visible beats hidden.** In the Nielsen Norman Group's study of hidden (hamburger) navigation, hiding it cost over 20% in discoverability, was 39% slower on desktop and 15% slower on mobile. They advise never hiding top-level navigation on desktop, and on mobile showing up to four links before hiding any. ([Hamburger Menus and Hidden Navigation Hurt UX Metrics](https://www.nngroup.com/articles/hamburger-menus/))
- **Local navigation must read as beneath global navigation.** A horizontal second row suits two or three tiers; breadcrumbs earn their place only past two levels. ([Local Navigation](https://www.nngroup.com/articles/local-navigation/))
- **Utilities belong in the top bar**, not a sidebar. The coven switcher answers "where am I?" and the account menu "who am I?", so they stay separate controls. ([Cloudscape, Service Navigation](https://cloudscape.design/patterns/general/service-navigation/))
- **Disclosure, not `role="menu"`.** The W3C's ARIA Authoring Practices recommend a button with `aria-expanded` and `aria-controls` that opens a list of links for site navigation. The `menu` role promises keyboard behaviour that people do not expect here. Every `nav` landmark on a page needs its own `aria-label`. ([APG, Disclosure Navigation Menu example](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/))
- **A bottom bar suits a phone.** One-thumb use favours the bottom of the screen, and tab bars were found in 86% of cases against 57% for hamburgers. ([Smashing Magazine, 2019, on bottom navigation](https://www.smashingmagazine.com/2019/08/bottom-navigation-pattern-mobile-web-pages/))
- **Priority+ shows what fits and tucks the rest behind More**, which teaches the user what the row is. ([Brad Frost, Priority+ navigation](https://bradfrost.com/blog/post/priority/))
- **GitHub's 2023 redesign** is the closest precedent: a slim global bar, context shown above the page, and local navigation as underline tabs. ([GitHub blog, 15 June 2023, on the redesigned navigation](https://github.blog/changelog/2023-06-15-redesigned-navigation-for-repositories/)) Its component, [Primer's `UnderlineNav`](https://primer.style/components/underline-nav/), is a labelled `nav` with `aria-current` on the current tab.
- **Atlassian** puts site-wide actions (create, switch, utilities) in the top bar and settings under the avatar, and keeps the sidebar for working inside a project. ([Atlassian, navigation](https://atlassian.design/foundations/navigation))

Check an address before relying on it; these pages move.

## The Options Drawn

The owner saw each as a working mock-up in the project's own type and palette, at 1280px and 375px, in both themes.

- **A, stacked bars.** One global bar, then the existing section row under it. The cheapest, and it keeps every built nav component. It spends two rows of height and hides two links on a phone.
- **B, sidebar.** A 16rem left column with the section links. On a 1280px window this leaves the admin tables about 64rem, and the user list scrolls inside its frame again, the complaint MB.115 settled. On a phone it hides the navigation in a drawer.
- **C, context header.** A slim bar, then a context row that names where you are, with the section nav beside it as icon tabs, and a bottom bar on a phone. This is what GitHub's repository header does.
- **D, scope breadcrumb.** One bar whose first crumb merges the switcher with the area links, and a section strip beneath it.

**Why C won.** The owner chose it as "definitely best" after the first round, and it held through the later rounds. The navigation is visible on every screen, on a phone it sits where the thumb is, and the context row states where you are in the largest type on the page, which a bar of links cannot. The admin tables keep their width. The owner said build time was not a factor.

## The Six Risks And What Was Chosen

Option C's risks were each drawn two ways, and the owner picked one for each.

| Risk                                                                  | Choice                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Where the switcher goes                                            | In the context row: the coven's name in the display face with a chevron, inside a hairline border. The bar carries no select. On admin pages the same place reads "Admin" as plain text. |
| 2. Two tab looks stacked on admin pages (section tabs over the pills) | The tabbed pages' pills move onto the page-heading line, 36px tall, with the hit area padded invisibly to 44.5px. The table starts about 78px higher than with a pill row of its own.    |
| 3. Six admin sections on a phone                                      | Priority+: the bottom bar shows four and a More disclosure holds the rest.                                                                                                               |
| 4. The bottom bar against dialogs and the impersonation banner        | The bar hides while a dialog is open or the on-screen keyboard is up. The banner offsets the top bar only.                                                                               |
| 5. More hiding the current page                                       | More takes the current page's name and icon, and its current state, when the current page is one of the hidden ones.                                                                     |
| 6. A long coven name on a phone                                       | Drawn two ways. The owner dropped the quieter borderless version at sign-off: the switcher looks the same on a phone as on desktop, and a long name wraps to two lines.                  |

## The Decisions Every Option Shared

1. **A route group, `src/app/(shell)/`,** wraps `account/`, `coven/` and `admin/`. URLs do not change. The root layout stays free of the session, so public pages stay static. The group's layout checks the session and reads the viewer and their memberships (both cached per request).
2. **The chrome takes plain props** (`viewer`, `workspaces`), with no fetching inside, so MB.83's client island can draw the same chrome from `me`.
3. **An unverified account** gets the brand as plain text, no site links, no Add Ingredient, no switcher, and an account menu with Sign Out only. Every link would only send it back to `/account/email`.
4. **The 403 renders inside the shell.** A signed-in non-admin sees the chrome, without an Admin entry, around the not-authorised page.
5. **The switcher's list can go stale,** since layouts do not re-run on client navigation. After `/coven/new` creates a coven, the form refreshes the router (a sub-hour change to M9.16's form, named in the PR).
6. **The account menu is a disclosure,** not a `role="menu"`: a button with `aria-expanded` and `aria-controls` opening links and the existing Sign Out button. Escape and an outside click close it, and Escape returns focus to the button. The theme toggle moves into the bar on shell pages; the fixed corner stays only on pages outside the shell. This settles MB.116's hand-off.
7. **Landmarks.** A `header` for the bar; each `nav` has its own label: "Site", "Coven", "Admin", and a tabbed page's own title for its pills. A Skip to Content link is the first thing a keyboard reaches.
8. **Tokens.** New size tokens for the bar, the context row and the bottom bar, and a `$layers` map that every `z-index` now reads (`shell`, `banner`, `toggle`, `floating`, `dialog`), replacing raw numbers in the banner and the toggle.
9. **Current page** carries `aria-current="page"` and a heavy accent rule with a quiet fill, never colour alone. Print hides the shell (M10.22).
10. **The brand link** is the home click: `/admin` for an admin (the owner's call), the viewer's coven for everyone else. Not `/`, which for a signed-in user is a prose page with one button.
11. **Copy says Coven** (below).
12. **The account menu names the user once,** on its button; its panel opens on Your Account, then Sign Out.
13. **One section nav component** serves the coven and the admin areas, with an inline stroke icon per section. `AdminNav`'s `<details>` jump menu goes.
14. **The theme toggle keeps its feel:** the knotwork crescent and sun on the accent disc, as a 32px disc in the bar and a labelled row in the account panel on a phone. Never a plain glyph.

## The Sign-Off Adjustments

On 2026-10-12 the owner signed off Option C with three adjustments and no further drawing.

- **The phone shell** is a 52px bar (brand mark, Add Ingredient, avatar) over a 44.5px context row holding the switcher or "Admin", with the section nav as the bottom bar.
- **Add Ingredient is a labelled button at every width,** never a bare plus.
- **The switcher looks the same on a phone** as on desktop: display-face name, chevron, hairline border, a long name wrapping to two lines.
- **Until M2.8 lands,** the shell works out the home link itself (see below).

## DESIGN §9 Is Corrected, And Editing Lives Where An Ingredient Is Shown

§9's `AppShell` paragraph said the shell carries "the global affordances for adding and editing an ingredient from any page". It now says: one global Add Ingredient button whose target follows the area, and editing on the ingredient wherever it is shown, never inside a relational field and never in the shell. For the ingredient tasks this means:

- **M8.16** builds Add Ingredient's modal and enables the shell's button; the button stays disabled until then, as M9.15's disabled buttons did.
- **M8.17** builds Edit Ingredient where an ingredient appears (the ingredient detail page, a list row), not in the bar. A field that links to another ingredient never offers an edit of it.

The shell also gains the account menu, the theme toggle in the bar, and the one section nav, recorded in the same paragraph.

## The Coven Copy

On-screen copy says Coven: "Select Coven", "Create Coven" (M9.16's "Create Workspace" changes), "Your Coven", and the section nav's label "Coven". Code, schema and docs keep saying _workspace_ (CLAUDE.md, Vocabulary). Only the words a person reads change, as the URL already says `/coven/`.

## The M2.8 Dependency

The brand link and Your Coven both point at the `/coven` landing: a page that sends someone into their coven, to the create form, or to the invite-only explanation. `src/app/coven/page.tsx` does not exist; the landing is **M2.8** (issue #270), still open. So MB.7 computes the home link in the shell: an admin goes to `/admin`; anyone else to their first coven by slug, to `/coven/new` if they hold none and may create, and to `/account` otherwise. Your Coven follows the same rule. When M2.8 lands it swaps that href for `/coven`.

## What This Rules Out

- Edit Ingredient in the shell, or an edit button inside a relational field.
- A second navigation metaphor beside the section nav on a phone, such as a drawer.
- A switcher on admin pages. The bar shows Your Coven there.
- A `z-index` number outside `$layers`.
