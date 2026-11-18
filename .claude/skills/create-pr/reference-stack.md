# Stacked PRs: one task as layered pull requests

A stack is a chain of pull requests where each layer targets the one below it, and `gh stack` (the GitHub command-line extension) manages the chain. Offer a stack **only when the owner asks for one**; otherwise `SKILL.md` opens one pull request, as before. Never stack a `hotfix/*` branch: it goes to two targets already ([reference-hotfix.md](reference-hotfix.md)). The reasoning is in `claude-docs/review-poc/stacks.md`.

Steps 1, 2 and 4 of `SKILL.md` (sign-in, preconditions, offer to commit) are unchanged. From step 3 on, apply these differences.

**Who owns a stack.** One session owns a whole stack, and no other session runs `gh stack` on it. `gh stack` creates, rebases and force-pushes the layer branches; this is the one exception to `SKILL.md`'s never-rebase and never-force-push rules (step 5 and the notes). A dirty checkout of a layer makes `gh stack rebase` and `gh stack sync` refuse and change nothing.

**Step 3, target.** The bottom layer targets `staging`; every other layer targets the layer below it, which `gh stack submit` sets. Ask the owner for the layers (a name and a one-line scope each) with AskUserQuestion, bottom first. When the owner has not named a tests-first layer, do not add one.

**Creating the layers.** Run `gh stack init --base staging <bottom branch> <next branch> ...`, naming the layers bottom first. It adopts a branch that exists and creates one that does not, each based on the one before it. Without `--base staging` the stack targets the default branch, `main`, which Gitflow refuses for a feature. To put a layer on top of a stack that already exists, check out its top layer and run `gh stack add <branch>`. `gh stack view` lists the layers.

**Step 5, no merge.** Do not run `git merge origin/<target>` on a layer branch. `gh stack sync` fetches, rebases each layer onto its parent, and pushes every branch with a lease check. If it reports a conflict, stop and tell the owner which layer conflicted.

**Step 6, push.** `gh stack submit --auto` pushes every branch together. Never a bare `git push`.

**Step 7, task.** Identify the task once for the whole stack. Every layer uses the same issue number.

**Step 8, drafting.**

- Each layer's title opens `<ID> — ` and then an imperative phrase, so the progress tally counts the id.
- The **top** layer's body opens with `Closes #<number>`. Every layer below it opens with `Refs #<number>`. The task then closes only when the last layer merges.
- Each body has its own `## Summary` and `## Test plan`, and ends with the same tally block as `SKILL.md` step 8.

**Step 9, creating.**

1. Run `gh stack submit --auto`. It creates the pull requests as drafts, titles each with its commit subject, and writes only a stack footer into the body.
2. Edit every pull request's title and body with `gh pr edit <number> --title "..." --body "$(cat <<'EOF' ... EOF)"`, keeping the footer `gh stack` wrote at the end of the body. If a pull request already exists for a layer, the same `gh pr edit` updates it.
3. Run `node scripts/task-board.mjs link-pr <ID> <PR number>` for the top layer only, the one carrying `Closes`. A `Refs` layer is never linked, because the link is a closing reference.
4. Leave every layer a draft. Mark layers ready (`gh pr ready <number>`) only when the owner says so: `gh stack merge` refuses a draft.
5. Report every pull request URL, bottom first.

**Step 10, the board.** Run once. Post one `node scripts/task-board.mjs comment <ID> "<text>"` that lists every layer's pull request, bottom first, then `node scripts/task-board.mjs status <ID> "In Review"` once. A later layer added to the stack gets one more comment and no status change.

**Merging.** The stack merges whole: `gh stack merge <top PR number> --yes --merge` merges that pull request and every one below it, and none above. Merging a lower layer alone leaves the task open, because `Closes` is on the top layer. The task closes through `.github/workflows/close-task-on-merge.yml` when the top layer merges.
