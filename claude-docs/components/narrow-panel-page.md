# NarrowPanelPage

`src/components/NarrowPanelPage/` is a narrow page that is one centred panel: an optional band above (the coven switcher's row), a `PageFrame` with `narrow`, and inside the panel a `PageHeader` (class `card-page-header`, heading class `auth-title`) over the content. Create Coven and Access Paused draw it, and so do their skeletons, so a page and its loading state cannot differ. Props: `NarrowPanelPageProps` in `types.ts`. It is server-safe.

- **`as`** is `main` by default and `div` where a layout holds the landmark (skeletons).
- **`contextRow`** is the caller's element, so the skeleton passes `SkeletonContextRow`.
- **`className`** is added to the panel after its own (the Create Coven skeleton's `new-coven-skeleton`).
- A page's title and lede live in a `head.ts` beside it, imported by the page and its skeleton alike.

Story: `Layout / Narrow Panel Page`.
