# HelpArticleView

`src/components/HelpArticleView/` is one article: the title, the rendered Markdown and, when there are any, a nav of its sub pages. The shared rules, addresses and ids are in [`help-pages.md`](help-pages.md). A public article passes `framed`, as the help header ([`help-front.md`](help-front.md)) holds its heading and box; a staff article draws its own.

Story: `Pages / Help / ArticleView` in `index.stories.tsx`. Test: `tests/components/HelpArticleView/index.test.tsx`.
