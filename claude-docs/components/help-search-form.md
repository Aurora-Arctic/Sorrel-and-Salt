# HelpSearchForm

`src/components/HelpSearchForm/` is the search box: a GET form to /help/search with one named q field, no suggestions as you type and no text button. As in the compendium's box, the magnifier inside the field is the one submit (its name, Search, is visually hidden), so Enter submits. Unlike the compendium, whose Enter on an empty box applies the empty search, Enter on an empty or whitespace-only box sends no search: a client `onSubmit` stops it, and on `/help` that is all, while on any other help page it goes to `/help` through the site's navigation. Without JavaScript the form reaches `/help/search?q=`, which redirects to `/help`.

A changed `query` is copied into the box by an effect, not by remounting the input with a `key`, so the box the help header holds keeps its spinner through a search ([`help-front.md`](help-front.md)).

With JavaScript, a search with words in the box does not load the page the browser's way, which would leave the old page standing with nothing to show the wait. The form stops that load and goes to `/help/search?q=<words>` through the site's navigation (`usePendingNavigation`, `src/lib/navigation`), with the words trimmed. So the page bar runs, the search page's skeleton covers the old page at once, and the magnifier carries `aria-busy="true"` and turns into the `Spinner` ring in the same space after the usual 100ms, as a chain-icon link does ([`loading.md`](../loading.md), "Control"). The `action` and `method` stay for a reader without JavaScript.

The shared rules, addresses and ids are in [`help-pages.md`](help-pages.md).

Story: `Pages / Help / SearchForm` in `index.stories.tsx`. Test: `tests/components/HelpSearchForm/index.test.tsx`.
