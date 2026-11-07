# Coven Home

`src/components/CovenHome/` — a coven's home page: the coven's name, the viewer's role and what that role may do, the jump menu, the Contents list of the coven's pages, and the Your Membership section with Leave Coven (and, for a steward, Delete Coven).

The coven page (`src/app/(shell)/coven/[slug]/page.tsx`) and its skeleton (`skeleton.tsx` beside it) both draw this one component. Sharing it is what keeps the skeleton the same size as the page, so nothing moves when the page arrives.

## Props

`CovenHomeProps` (`types.ts`).

| Prop      | What it is                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `slug`    | The coven's URL segment; the Contents links go to `/coven/<slug>/<page>`                                                                                     |
| `role`    | `owner`, `member` or `viewer`; the page says Steward, Practitioner or Observer                                                                               |
| `access`  | `CovenHomeAccess`: `canDelete`, `canReadMembers` and `canInvite`. The caller reads them from the access statements, because a skeleton in the browser cannot |
| `name`    | Optional: the coven's name. A skeleton that does not know it leaves it out, and the title and the lede become bars                                           |
| `demo`    | Optional: adds the Demo badge beside the title                                                                                                               |
| `pending` | Optional: draws the skeleton (see below)                                                                                                                     |
| `leave`   | Optional: the Leave Coven button. The page passes its dialog button; a skeleton draws a button-shaped label instead                                          |
| `remove`  | Optional: the Delete Coven button, drawn only when `access.canDelete`                                                                                        |

## Contracts

- **`access` decides what is drawn.** The jump menu lists Contents and Your Membership, and Delete Coven when `canDelete`. Contents lists Ingredients and Grimoire, and Members only when `canReadMembers`; its description changes with `canInvite`. The role lede is `You are <Role> of this coven.` followed by the role's access sentence from `MemberList/role-access`.
- **`pending` changes the draw, not the layout.** Every word is wrapped in `SkeletonText` ([`skeleton.md`](skeleton.md)), so each line of text paints its own bar at the width of its words. There are no links, no section ids, no `aria-describedby` and no `aria-labelledby`. The buttons become `btn btn--pending` and `btn btn--destructive btn--pending` spans, the demo badge `badge--pending`, and the root is a `div`, not a `main`, because the layout's body already holds the `main`.
- **An unknown name makes two bars of title and three of lede.** The title uses `pendingTitle={2}`; the lede uses `skeleton-lede` bars.
- **A skeleton uses real words when it has them.** The coven layout supplies the name, the role and the access through [`CovenFacts`](coven-facts.md). When the move ends in that same coven, `CovenHomeSkeleton` passes them in. For any other move it passes no name and a steward's `access`, the longest page a coven shows, so the skeleton is never shorter than the page.
- **It uses `PageHeader`, `PageNav`, `PageWithNav` and `PendingLink`** ([`page-nav.md`](page-nav.md), [`page-with-nav.md`](page-with-nav.md)), so the menu and the page frame are the ones other pages use.

## Styling

`index.scss` is not part of this component: it has none. The page is built from the classes of `PageHeader`, `PageNav`, `PageWithNav`, the `admin-contents` list, `btn` and `badge`, and the `--pending` modifiers each of those owns. Add no styling here before the section's design review.

## Stories and tests

`Coven / Coven Home`: `States`, with a control that chooses As Steward, As Practitioner, As Observer, Demo Coven, Pending Facts Known and Pending Facts Unknown, all inside the coven's shell with invented names.

Tests: none yet. Neither this component nor `CovenFacts` has a test file under `tests/`.
