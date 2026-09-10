# Component docs

One Markdown file per standalone component, lower-kebab-named after the
component directory (`theme-toggle.md` ↔ `src/components/ThemeToggle/`).

Several tasks name a component doc as an acceptance criterion, and the component
workshop discovers components by their `index.stories.tsx`; a component that
ships without its doc is an incomplete task.

A component doc records what someone needs to know before changing the
component that is not obvious from the code:

- contracts it shares with other code (a storage key, an exported helper, an
  attribute another module also writes);
- constraints that would otherwise look arbitrary — a value that must stay
  un-themed, a transition a property is deliberately kept out of;
- styling limits (which tokens and mixins it is allowed to use);
- what its tests cover, and anything not yet verifiable through the repo's own
  runner.

State the decision, not how it was reached. Blow-by-blow history belongs in a
transcript, and the reasoning behind a single contested choice in a decision
record.
