# HelpIndex

`src/components/HelpIndex/` is the front page: guides, a glossary link and the FAQ, each entry anchored by its slug. The shared rules, addresses and ids are in [`help-pages.md`](help-pages.md). Under the help header ([`help-front.md`](help-front.md)), which holds the heading and box, `/help` draws neither (`HelpPageHead` reads the header's `HelpFrame`); the staff index draws its own.

Story: `Pages / Help / Index` in `index.stories.tsx`. Test: `tests/components/HelpIndex/index.test.tsx`.
