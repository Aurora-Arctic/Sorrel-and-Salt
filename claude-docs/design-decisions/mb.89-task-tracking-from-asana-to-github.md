# Move task tracking from Asana to GitHub Issues and Projects (MB.89)

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Decision 1 — where the issues live: **public issues in this repo (decided)**

The pros and cons that led there are kept for the record. Two real options were weighed. Making the code repo private is a third, but it would take the public compendium's repo out of view for a tracker's sake, so it is not argued here.

## Decision

**(a), the public repo**, chosen on the evidence that the comments carry names and narrative but no values, and that everything else about this project is already public by choice. Three conditions are written into the task: the pre-publication scan of the 395 comments, a "names, never values" line in every skill step that posts a comment, and the Project's auto-add filter so strangers' issues never reach the board.

## Decisions 2 to 4

2. **Waves are milestones** — _decided_. Sub-issues are reserved for genuine parent/child (`M7.A.*` under `M7.A`, or a task split mid-flight).
3. **Old PR-body links.** _Default:_ leave the Asana workspace alive and archived so the ~196 existing `Asana task:` links keep resolving, as MB.56 did. Nothing in the repo is rewritten.
4. **Where `Task ID` lives.** _Default:_ title only. A Project text field is a convenience for table views, but the title is what `gh issue list` returns and what a PR body cites.
