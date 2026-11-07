# HelpArticleForm

`src/components/HelpArticleForm/` is the keepers' form for one help row: an FAQ entry, an article or a glossary term. It opens in the modal of `/keepers/help` (`src/app/(shell)/keepers/help/`), over `HelpList`, a render-only table of the rows.

## Contracts

- **Props:** `{ article?, parents, onDone }`. Without `article` it adds a row. `parents` is the live top-level articles as `{ id, title, audience }`; the page builds it from every row, not only the shown page.
- **Writes** go through `/api/graphql` as `CreateHelpArticle`, `UpdateHelpArticle` and `DeleteHelpArticle`. An update carries no `kind`; the kind is fixed once the row exists. A cleared parent is sent as `parentId: null`. A slug is sent on an update only when it changed.
- **Fields by kind:** a term has no Audience, Parent or Position; an FAQ entry has no Parent. Parent offers No Parent and every other top-level article, never the row itself.
- **Audience:** a child offers its parent's audience and the narrower ones, in the order Public, Staff, Keeper. Choosing a narrower parent raises the audience to the parent's.
- **Refusals:** a server issue on `slug`, `parentId`, `position` or `audience` shows on that field. A delete the service refuses (the row has live children) shows as an alert and leaves the form open.
- **Preview:** the Body, rendered by `renderMarkdown` (`DocumentPage/markdown.tsx`), in a region named "Preview".
- **Address:** `/keepers/help?edit=<id>` opens a row; `?new` opens the add form. The page calls `requireAdminSession()`, as the keepers layout lets a curator through for Support.
