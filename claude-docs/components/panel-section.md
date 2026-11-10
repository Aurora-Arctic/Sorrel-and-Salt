# PanelSection

`src/components/PanelSection/` is one titled section of a page of panels: a `section` with the `page-frame__section panel` classes, a heading (`${id}-heading`) with an optional lede beneath, then the section's content. The account tabs draw every section through it, and a page menu links to the section's `id`. Props: `PanelSectionProps` in `types.ts`. It is server-safe.

- **Only `PanelSection`, `NarrowPanelPage` and the panel skeleton write `page-frame__section panel`.** A page does not. Guard: `page-pieces`. The two narrow account skeletons (email and terms) are named in the guard: their pages draw a bare panel whose form owns its heading.
- **A lede is optional.** The Email section leaves it out because the form's own status line says it.

Story: `Layout / Panel Section`.
