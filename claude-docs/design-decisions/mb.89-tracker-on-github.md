# Task tracking on GitHub Issues and Projects

**Status:** decided. Live home: `claude-docs/task-tracking.md`.

## Decision

- **Issues live in this public repo**, chosen on the evidence that the comments carry names and narrative but no values, and that everything else about the project is already public. Three conditions hold: a pre-publication scan of the existing comments, a "names, never values" line in every skill step that posts a comment, and the Project's auto-add filter so strangers' issues never reach the board.
- **Waves are milestones.** Sub-issues are reserved for genuine parent and child (`M7.A.*` under `M7.A`, or a task split mid-flight).
- **Old PR-body `Asana task:` links stay.** The Asana workspace is left alive and archived so they keep resolving; nothing in the repo is rewritten.
- **`Task ID` lives in the issue title only.** The title is what `gh issue list` returns and what a PR body cites; a Project text field would only help table views.

## Why

A private tracker would be kept private at the cost of a visible repo; a private code repo would take the public compendium's repo out of view for a tracker's sake.

## Rules out

- A private issue repo or a private code repo.
- A Project text field for the id.
