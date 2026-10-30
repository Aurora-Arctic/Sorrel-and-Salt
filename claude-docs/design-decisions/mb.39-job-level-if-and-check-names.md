# MB.39 — A job-level `if:` renames the check only on the job that calls a reusable workflow

**Status:** decided, verified by a probe · **Date:** 2026-10-30

The rule this repo's CI filtering was built on said: a job-level `if:` makes GitHub report a differently named, bare check run, so no job may carry one. It had never been tested here. This record tests it. The result is split. The rule is **true for the job that calls a reusable workflow** and **false for a job inside the reusable workflow**. A matrix job cannot carry such an `if:` at all.

A job-level `if:` is an `if:` key directly under a job, as opposed to under one of its steps.

## Verdict

| Question                                                                                       | Answer                                                                                                                             |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1. An `if:` on the job that **calls** a reusable workflow (`uses:`) that evaluates to false    | **Verified.** One bare check run named after the calling job, `skipped`. No `caller / inner` check runs exist.                     |
| 2a. An `if:` on a plain job **inside** the reusable workflow, false                            | **Not true.** The check keeps its qualified name, `caller / inner`, with conclusion `skipped`.                                     |
| 2b. An `if:` on a **matrix** job inside the reusable workflow, written `if: matrix.should-run` | **Impossible.** GitHub rejects the file: `Unrecognized named-value: 'matrix'`. No check runs are created.                          |
| 3. Whether a `skipped` conclusion satisfies a required status check                            | **Not tested.** It needs a ruleset that requires a check. The owner did not authorise a scratch ruleset, so this stays unanswered. |

What follows for the design: a skipped inner job keeps its normal name, so it does not by itself strand a required check under a different name. Whether a `skipped` run satisfies the requirement (question 3) still decides whether moving `if:` onto inner jobs is safe, so adoption waits for that answer. Matrix legs cannot use a job-level `if:` on their own matrix values, so `checks.yml`'s legs would need another route (for example a separate job per leg, or a `fromJSON` matrix that leaves out the filtered-off legs). Adoption is not part of MB.39.

## Provenance of the claim

Traced from this repo's git history only.

| Commit      | Date       | What it did                                                                                                                                                                                                                                                                                                                   |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1db422ab5` | 2026-09-09 | M0.16. Added the `lint`, `format` and `typecheck` workflows, each with a `should-run` input whose comment says a job-level `if:` gives "a differently-named, bare check run". The commit message says the workflows were copied from another repository with only a path fix. Nothing in it describes the symptom being seen. |
| `860d10f05` | 2026-09-09 | M0.20. Added `pr-gate.yml` with the "NO JOB HERE MAY CARRY A JOB-LEVEL `if:`" header and the same wording in `vitest.yml` and `playwright.yml`.                                                                                                                                                                               |
| `ecce1f1fe` | 2026-09-10 | Consolidated the working docs and wrote the rule into `claude-docs/ci.md` as a general rule ("A required-check job must never carry a job-level `if:`").                                                                                                                                                                      |
| `2e7dcfe85` | 2026-09-17 | MB.32. Collapsed five check workflows into `checks.yml` and extended the sentence to matrix legs.                                                                                                                                                                                                                             |

No ruleset in this repo has ever required a status check, so the symptom could not have been seen. The M0.16, M0.20 and MB.32 decision records are in the frozen archive, which is not read; the commits above are the trace.

## The probe

The probe ran on a throwaway branch `scratch/mb39-probe`, in a pull request into `scratch/mb39-base` (a copy of `staging`). `pr-gate.yml` triggers only on `main`, `staging` and `release/**`, and `deploy.yml` only on pushes to `main`/`staging` and pull requests into `main`, so only the probe fired on the pull request. All probe files and branches are deleted.

The first attempt put the matrix job and the plain jobs in one reusable workflow. GitHub refused the whole file (runs `41087836439` on push and `41087846275` on the pull request, both "This run likely failed because of a workflow file issue", no jobs, no check runs). The second attempt split the matrix job into its own file, which isolated the failure.

`mb39-probe-matrix.yml`:

```yaml
name: probe-matrix
on:
  workflow_call:
jobs:
  matrix-if:
    if: matrix.should-run
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - name: m-on
            should-run: true
          - name: m-off
            should-run: false
    name: matrix-if (${{ matrix.name }})
    steps:
      - run: echo ${{ matrix.name }}
```

`mb39-probe-plain.yml` (the `vitest.yml` shape: inputs, `if: inputs.*`; the two `control-*` jobs resolve the flag in a step, the current pattern):

```yaml
name: probe-plain
on:
  workflow_call:
    inputs:
      run-yes:
        type: boolean
        default: true
      run-no:
        type: boolean
        default: false
jobs:
  plain-yes:
    if: inputs.run-yes
    runs-on: ubuntu-latest
    steps:
      - run: echo yes
  plain-no:
    if: inputs.run-no
    runs-on: ubuntu-latest
    steps:
      - run: echo no
  control-yes:
    runs-on: ubuntu-latest
    steps:
      - if: inputs.run-yes
        run: echo yes
  control-no:
    runs-on: ubuntu-latest
    steps:
      - if: inputs.run-no
        run: echo no
```

`mb39-probe-caller.yml`:

```yaml
name: probe-caller
on:
  pull_request:
    branches: ['scratch/**']
jobs:
  call-if-true:
    if: true
    uses: ./.github/workflows/mb39-probe-plain.yml
  call-if-false:
    if: false
    uses: ./.github/workflows/mb39-probe-plain.yml
  call-plain:
    uses: ./.github/workflows/mb39-probe-plain.yml
```

## Raw output

### Plain jobs: pull request run `41088026042`, head `083d601df03da3fa7d8a8b4ad0d185166231bb96`

`gh api repos/Aurora-Arctic/Sorrel-and-Salt/commits/083d601df03da3fa7d8a8b4ad0d185166231bb96/check-runs --paginate | jq -c '.check_runs[]|{name,status,conclusion}' | sort`:

```json
{"name":"call-if-false","status":"completed","conclusion":"skipped"}
{"name":"call-if-true / control-no","status":"completed","conclusion":"success"}
{"name":"call-if-true / control-yes","status":"completed","conclusion":"success"}
{"name":"call-if-true / plain-no","status":"completed","conclusion":"skipped"}
{"name":"call-if-true / plain-yes","status":"completed","conclusion":"success"}
{"name":"call-plain / control-no","status":"completed","conclusion":"success"}
{"name":"call-plain / control-yes","status":"completed","conclusion":"success"}
{"name":"call-plain / plain-no","status":"completed","conclusion":"skipped"}
{"name":"call-plain / plain-yes","status":"completed","conclusion":"success"}
```

Reading it:

- `call-if-false` (question 1) is one bare check run, `skipped`. The jobs inside never started, so none of them has a `call-if-false / ...` check run. A required check named `call-if-false / plain-yes` would never be reported.
- `call-plain / plain-no` (question 2a) is the inner job with a false `if:`. It keeps the qualified name and is `skipped`.
- `call-plain / control-no` is the step-level pattern in use today. It reports `success`, because the job runs and the step is skipped.
- `call-if-true / ...` shows a caller `if:` that is true leaves the normal names.

### Matrix job: push run `41088014884`, same head

`gh api repos/Aurora-Arctic/Sorrel-and-Salt/actions/runs/41088014884/jobs` returned `{"total_count":0,"jobs":[]}`, and the check-runs call above lists nothing for `matrix-if`. The run's status is `completed`, conclusion `failure`, and `gh run view` says only "This run likely failed because of a workflow file issue". The error text is not in the REST API. It is on the run's public web page, `https://github.com/Aurora-Arctic/Sorrel-and-Salt/actions/runs/41088014884`, which reads:

```
.github/workflows/mb39-probe-matrix.yml#L1
(Line: 6, Col: 9): Unrecognized named-value: 'matrix'. Located at position 1 within expression: matrix.should-run
```

The `matrix` context is not available in `jobs.<job_id>.if`, because that expression is evaluated before the matrix is expanded into jobs.

## Cleanup

- Pull request #1345 closed. `scratch/mb39-probe` and `scratch/mb39-base` deleted from `origin`; `git ls-remote --heads origin 'scratch/*'` prints nothing.
- Rulesets before and after, by `id`, `name` and rule `type`, are identical:

```
{"id":22612570,"name":"Main","rules":["deletion","non_fast_forward","pull_request"]}
{"id":22612931,"name":"Release Branches","rules":["deletion","non_fast_forward"]}
{"id":22612558,"name":"Staging","rules":["deletion","non_fast_forward","pull_request"]}
```

- No live GitHub setting was changed. No ruleset requires a status check, which is why question 3 was not tested.

## What this changes

- `claude-docs/ci.md` and `claude-docs/ci/aggregating-workflows.md` state the split result instead of the unverified rule.
- The comments in `checks.yml`, `pr-gate.yml`, `vitest.yml` and `playwright.yml` no longer claim that any job-level `if:` renames a check. They say what the code does and point here.
- Job behaviour is unchanged. Moving `if:` onto inner jobs would save the container pull for a filtered-off leg (about 20s to 46s each, measured on run `35301237284`), and is a separate task that first needs question 3 answered.
