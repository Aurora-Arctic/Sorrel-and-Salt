# HelpArticleForm

`src/components/HelpArticleForm/` is the keepers' form for one help row: an FAQ entry, an article or a glossary term. It fills a page of its own: `/keepers/help/new` adds a row and `/keepers/help/<id>` edits one (`src/app/(shell)/keepers/help/`). Both pages call `requireAdminSession()`, as the keepers layout lets a curator through for Support, and an id no live row holds answers 404. The list they return to is [`HelpOutline`](help-outline.md).

## The page

- **Two columns from tablet width up.** The text (Title, Summary, Body) sits on the left at the measure. A Details card on the right holds Kind, Shown, Parent, Sub Pages, Audience and Position, sticky under the shell bar as the body scrolls. Save and Cancel sit under the text. On a phone the card follows the text and the buttons follow the card. `index.scss` holds the grid.
- **Heading.** An edit's page header is the row's title under the eyebrow `Edit Article`, `Edit FAQ Entry` or `Edit Term` (`helpFormHeading`, `heading.ts`). A new row's `h1` is drawn by the form, `Add Article`, `Add FAQ Entry` or `Add Term`, since it follows the Kind chosen. So the new page loads it through `NewHelpArticleForm`, whose loading face draws the heading too.
- **View.** An edit's page header ends in an eye link, `ViewLink` named and tipped View, to the row's reader page (`HelpViewLink`, `view-link.tsx`, through `helpPath`). It is drawn only for a shown article whose guide, if it has one, is shown too: a hidden row's address is a 404 to a keeper as well, and an FAQ entry or a term is an anchor on a list, not a page. The skeleton draws no place for it.
- **Loading.** `index.tsx` loads `form.tsx` through `next/dynamic`, because the body's editor is large and only these two pages need it. `HelpArticleFormSkeleton` stands in at the form's size, and the `/keepers/help/new` and `/keepers/help/[id]` skeletons in `src/app/skeletons.ts` use it.
- **Back link.** `Help`, to `returnHref`, raised into the page top as on an ingredient page.

## Contracts

- **Props:** `{ article?, guides, candidates, presetParentId?, returnHref }` (`types.ts`). Without `article` it adds a row. `readHelpFormChoices(session)` (`form-choices.ts`) builds both lists from one `listKeeperHelpArticles` read of every article, shown and hidden, in position order:
  - `guides`: every live top-level article in reading order, with its count of live sub pages;
  - `candidates`: every live article holding no sub pages, each guide's sub pages grouped under it in order.
- **`returnHref`** is `helpFormReturn(kind, guideId)`: the outline at the row's guide (itself, for a guide), at the FAQ or at the glossary. Cancel, a save and a delete all go there.
- **`presetParentId`** comes from the outline's Add Sub Page (`/keepers/help/new?parent=<id>`). The new row starts in that guide, at its audience, last among its sub pages.
- **Writes** go through `/api/graphql` as `CreateHelpArticle`, `UpdateHelpArticle`, `DeleteHelpArticle` and `SetHelpArticleShown`. An update carries no `kind`. Nothing writes until Save.
- **The body** is the shared [`RichTextEditor`](rich-text-editor.md), and its Markdown is what is saved. There is no preview: the editor shows the text as it will read.
- **The address.** The Title's description is the address the title makes (`helpPath` over `slugify(title)` and the chosen guide's slug). Every slug comes from the title, so the form has no Slug field.

## The Details card

- **Kind** is a choice chip (Article, FAQ, Term). It is held on an edit, as a row's kind is fixed once it exists, and its tip says so.
- **Shown** is a [`ShownSwitch`](#shownswitch) in form-field mode. A new row is created shown and, when the switch is off, hidden by `SetHelpArticleShown` once it exists. An edit sends `SetHelpArticleShown` only when the switch changed.
- **Fields by kind.** A term has no Audience, Parent, Sub Pages, Position or Summary. An FAQ entry has no Parent, Sub Pages or Summary, and the service refuses a summary on either (`checkSummary`, `help-writes.ts`). An article has all five, with two exceptions, as help is one level deep: a sub page has no Sub Pages, and a guide holding sub pages has its Parent held at No Parent.
- **Parent** offers No Parent and every guide but the row itself.
  - Choosing a guide narrows a wider audience to the guide's and places the row last in it (its sub page count plus one).
  - Choosing its own guide again puts a sub page back at its saved place.
  - Leaving a guide makes the row the last guide (the guide count plus one).
- **Sub Pages** (`sub-pages-field.tsx`) are chips in their order, with an Add Sub Page combobox over `candidates`. It leaves out the pages already chosen and those wider than the row's audience. A pick that sits in another guide says, under the chips, that it leaves that guide and which place it takes here when the form is saved. A save sends `childIds`, the chips in order, and the service moves and releases sub pages in the same transaction (`claude-docs/design-decisions/support.md`, "Showing and hiding, and a parent's children").
- **Audience** is a choice chip offering Public, Staff and Keeper. An option is held when it is wider than the parent's, or narrower than the widest chosen sub page's, as a sub page is as wide as its guide or narrower.
- **Position.**
  - A guide or an FAQ entry has a text field with the numeric keyboard. It takes a whole number, 0 or more; anything else is refused in the form, before a request. Its note says where a guide stands, such as "1 of 3 guides".
  - A sub page has no field, as its place is the guide's to set. It shows "2 of 4 in Guide", with a Reorder in the Guide link to the outline when the guide is its saved one.

## Saving

- **Save** is off on an edit until a value differs from what was opened, and off again when the value is put back. A blank Title or Body is refused in the form.
- **Renaming.** When the title's slug differs from the row's, Save first reads `HelpRenameEffects`: the other rows whose bodies link the old address (or, for a term, mark the old title), and the front page's quick links that read the old slug. When either list holds anything, a confirmation names each one and saves only on Rename; Cancel keeps the form as typed. When both are empty it saves at once. Why: `claude-docs/design-decisions/support.md`, "Renaming a help row".
- **Refusals.** A server issue on `title`, `position` or `audience` shows on that field, not above the form. A delete the service refuses (the guide has live sub pages) shows as an alert and leaves the form open.
- **Leaving.** Cancel with changes asks Keep Editing or Discard Changes through the discard guard. A save or a delete leaves without asking.
- **Delete** is drawn on an edit only, named for the kind (`Delete Article`), and asks first.

`tests/components/HelpArticleForm/index.test.tsx` holds the cases, with the editor mocked as a text box.

## ShownSwitch

`src/components/ShownSwitch/` is the lidded-eye switch that shows or hides a row to readers, shared by the compendium and help. Each caller wraps it with its own mutation and words (`src/components/HelpOutline/shown-switch.tsx` for help).

- **With `save`**, each press is stored as it lands, one save at a time. A press made during a save is sent once that save lands, so the last press is what is stored. A save announces itself in the status region and refreshes the page. A refused one puts the switch back and shows the refusal under it.
- **With `onChange`** (or without `save`), it only reports the press, as a form field does.
- **Its name** is its visible `label` when it has one, and `accessibleName` otherwise. `tip` gives the tip for each position.
