# HelpSearchForm

`src/components/HelpSearchForm/` is the search box: a GET form to /help/search with one named q field, no suggestions as you type and no text button. As in the compendium's box, the magnifier inside the field is the one submit (its name, Search, is visually hidden), so Enter submits. Unlike the compendium, whose Enter on an empty box applies the empty search, Enter on an empty or whitespace-only box is stopped by a client `onSubmit` and does nothing; without JavaScript it reaches the server, which shows no results. The shared rules, addresses and ids are in [`help-pages.md`](help-pages.md).

Story: `Pages / Help / SearchForm` in `index.stories.tsx`. Test: `tests/components/HelpSearchForm/index.test.tsx`.
