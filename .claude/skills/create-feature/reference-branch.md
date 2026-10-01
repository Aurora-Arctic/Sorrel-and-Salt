# Branch off the latest base: shared steps

`create-feature` and `create-hotfix` both follow these steps. Their `SKILL.md` passes `<base>` and `<prefix>`; the last two rows below follow from the base. `start-task` cites these steps by number, and `create-release` and `create-main-sync` cite step 1, so keep the numbering.

| Parameter                            | `create-feature`                                           | `create-hotfix`                                                                                 |
| ------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `<base>`                             | `staging`                                                  | `main`                                                                                          |
| `<prefix>`                           | `feature`                                                  | `hotfix`                                                                                        |
| A bare `git push` would hit (step 6) | the protected `staging` branch                             | production                                                                                      |
| `/create-pr` will (step 8)           | propose `staging` as the target when it's ready for review | open PRs into both `main` and `staging`, and offer a third into an in-flight `release/*` branch |

## Steps

1. **Check for a clean working tree.**
   - Run `git status`. If there are uncommitted or unstaged changes, warn the user that they'll carry onto the new branch, and use AskUserQuestion to ask how to proceed: bring the changes along, stash them first (`git stash push -u`), or stop.

2. **Ask what the branch should be called, and which task it's for.**
   - Send a `PushNotification` (status `proactive`) saying input is needed for the new `<prefix>` branch. Then ask in plain chat, as one free-text question with no multiple-choice options, for two things: a name for the new branch, and its `Task ID` (the `M0.1`-style identifier that opens the issue's title on the **Sorrel & Salt** board). Wait for the reply before continuing.
   - If the user has no task ID (the work isn't tracked yet, or they don't know it), accept that and carry on: the branch is still created, and step 7 is skipped.

3. **Slugify the name.**
   - Lowercase it, turn spaces and underscores into hyphens, strip anything outside `[a-z0-9-]`, and collapse repeated hyphens. This becomes `<slug>` in `<prefix>/<slug>`.

4. **Check for collisions.**
   - Run `git rev-parse --verify --quiet refs/heads/<prefix>/<slug>` and `git ls-remote --exit-code --heads origin <prefix>/<slug>`.
   - If either finds an existing branch, tell the user and ask whether to check it out instead or pick a different name.

5. **Fetch the latest `<base>`.**
   - Run `git fetch origin <base>`.

6. **Create and switch to the new branch.**
   - Run `git checkout --no-track -b <prefix>/<slug> origin/<base>`. This branches off the fetched remote ref, not a possibly-stale local `<base>`. `--no-track` matters: without it the new branch's upstream becomes `origin/<base>`, and a later bare `git push` targets that base (the table's bare-push row) instead of this branch (MB.13).

7. **Mark the task `In Progress`.**
   - Skip this step entirely if step 2 produced no task ID.
   - The branch now exists and work is starting, which is the trigger for `In Progress`. Do it now, in this same turn.
   - Run `node scripts/task-board.mjs find <ID>`. It matches the title on `<ID> — ` exactly, prints the issue as JSON, and exits non-zero unless exactly one issue matches.
   - If exactly one issue matches, run `node scripts/task-board.mjs comment <ID> "Branch <prefix>/<slug> created off origin/<base>; work started."`. Then, **only if its `status` is `Not Started`**, run `node scripts/task-board.mjs status <ID> "In Progress"`. An issue that is already `In Progress`, `In Review` or closed keeps its status.
   - If zero issues match, or more than one, don't guess. Tell the user you couldn't uniquely identify the task and that they'll need to move it to `In Progress` themselves.

8. **Report the result.**
   - Confirm the new branch name and that it's based on current `origin/<base>`. If step 7 ran, say the task is now `In Progress`. Say what `/create-pr` will do, from the table's `/create-pr` row.

## Notes

- Step 2 asks in plain chat rather than through `AskUserQuestion`. That tool needs at least two explicit options for the name, which are exactly the suggestions the user has said not to offer. `PushNotification` still gets the user's attention without forcing a choice.
- Never push the new branch. `/create-pr` pushes once there's work to send.
- Never force-push or delete anything. These steps only ever create a branch.
- If `git fetch origin <base>` fails (no network, no remote), stop and report the error rather than branching off a possibly-stale local `<base>`.
