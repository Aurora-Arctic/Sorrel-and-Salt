---
paths:
  - 'claude-docs/**/*.md'
  - '.claude/**/*.md'
  - 'CLAUDE.md'
  - 'README.md'
  - 'src/db/migrations/*.ack.md'
---

# Writing rules

The long form of `CLAUDE.md`'s plain-language convention. `CLAUDE.md` wins over this file.

## Who is reading

Everything written here is read by developers with very different amounts of experience: a reply in the chat, a doc under `claude-docs/`, a PR body, an issue comment, a commit message. The repo is public, so a reader may know nothing about this project, this stack or this team. Write so that the least experienced developer who might plausibly read it can follow, without dropping a fact the most experienced one needs.

## How to write plainly

- **Say what happened or what to do first, in everyday words.** The detail follows. A reader who stops after the first sentence should still have the point.
- **Describe a thing before naming it.** "The check that confirms someone belongs to the workspace, `assertMembership`" tells everyone what it does; the bare identifier tells only those who already know. Names, paths and commands stay, because they are how a reader finds the code, but each gets a plain sentence around it.
- **Spell out a term the first time it appears in a piece.** Acronyms, and the project's own words for things: a soft delete is a row marked deleted rather than removed; a cursor page is a page of results that resumes from the last row rather than counting rows to skip; a loader batches many small lookups into one query. One clause is enough.
- **Prefer the common word.** "Check" over "assert" outside a test, "list" over "enumerate", "stop" over "abort", "set up" over "bootstrap", "run" over "invoke", "change" over "mutate" outside GraphQL.
- **Give an example where a mechanism is abstract.** One concrete case, with real values, often does more than another sentence of explanation.
- **Keep the sentences short and the structure visible.** One idea per sentence. Steps as a numbered list, options as bullets, several facts of the same shape as a table.
- **Read it back as a developer six months into their career.** Anything that would make that reader open a search engine gets a clause of explanation or a plainer word.

## Where precision still wins

"When possible" means a precise term stays wherever the precise thing is the point, and is explained the first time rather than replaced:

- **The project's three nouns** — Compendium, Ingredients, Grimoire — and `DESIGN.md`'s terms are never swapped for a looser word; they are what keep the code and the conversation consistent (`CLAUDE.md`, Vocabulary).
- **Code, identifiers, commands and error text** are quoted exactly, in code formatting, because a reader has to find or type them.
- **A schema name, a Postgres term in a migration note, a GraphQL type** keeps its proper name, with a plain clause beside it the first time.
- **A test's `describe` and `it` strings** name the behaviour; they follow the Testing rules, not this one.

## What this does not change

- A doc still stands on its own and gives the reason for a constraint in a clause (claude-docs/README.md, "One home per fact").
- A code comment still says what the thing is and why it is not the obvious alternative, and no shorter (claude-docs/README.md, "Comments in code"). Plain language is about the words chosen, never a licence to cut a fact.
- A PR body or issue comment still names and never carries values (`CLAUDE.md`, GitHub task tracking).
