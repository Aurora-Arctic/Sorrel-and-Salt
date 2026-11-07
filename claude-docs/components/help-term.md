# HelpTerm

`src/components/HelpTerm/` is a glossary term marked in a help body: a link to the term's anchor on the glossary page that opens a tooltip holding the term's title and definition. `renderMarkdown` draws it; the marks and their rules are in [`help-pages.md`](help-pages.md), "Glossary marks".

It is a client component built on `useTip` (`InfoTip/use-tip.ts`), the hook behind InfoTip, on a link in running text instead of an ⓘ button. A hover opens the bubble after 300ms, focus and a tap open it at once, Escape closes it, and the pointer can move onto the bubble without closing it. The link names the bubble in `aria-describedby`, and a tap still follows the link.

Story: `Pages / Help / HelpTerm` in `index.stories.tsx`. Test: `tests/components/HelpTerm/index.test.tsx`.
