# MB.39 — A job-level `if:` renames the check only on the job that calls a reusable workflow

**Status:** decided, verified by two probes, adopted in MB.39 · **Date:** 2026-10-30

The rule this repo's CI filtering was built on said: a job-level `if:` makes GitHub report a differently named, bare check run, so no job may carry one. It had never been tested here. This record tests it. The result is split. The rule is **true for the job that calls a reusable workflow** and **false for a job inside the reusable workflow**. A matrix job cannot carry such an `if:` at all. A skipped check satisfies a required status check, and a required check that never reports blocks the pull request. MB.39 therefore moves the filtering of `vitest.yml`, `playwright.yml` and `checks.yml` onto job-level `if:` and splits `checks.yml`'s matrix into plain jobs.

A job-level `if:` is an `if:` key directly under a job, as opposed to under one of its steps.

## Verdict

| Question                                                                                       | Answer                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. An `if:` on the job that **calls** a reusable workflow (`uses:`) that evaluates to false    | **Verified.** One bare check run named after the calling job, `skipped`. No `caller / inner` check runs exist.                                                     |
| 2a. An `if:` on a plain job **inside** the reusable workflow, false                            | **Not true.** The check keeps its qualified name, `caller / inner`, with conclusion `skipped`.                                                                     |
| 2b. An `if:` on a **matrix** job inside the reusable workflow, written `if: matrix.should-run` | **Impossible.** GitHub rejects the file: `Unrecognized named-value: 'matrix'`. No check runs are created.                                                          |
| 3. Whether a `skipped` conclusion satisfies a required status check                            | **Yes.** A required check whose run is `skipped` leaves the pull request `CLEAN` (case A below). A required check that never reports leaves it `BLOCKED` (case B). |

What follows for the design:

- A skipped inner job keeps its normal name and satisfies a required check, so moving `if:` onto inner jobs is safe.
- A required check that never reports blocks the pull request. Leaving a matrix leg out of a `fromJSON` matrix would strand a required check, so that route is out.
- A matrix leg cannot skip itself with `if: matrix.*`. The route for `checks.yml` is a plain job per leg, each with `if: inputs.run-<leg>`.
- A job-level `if:` on a job that calls a reusable workflow still gives a bare check name. The only such `if:` in `pr-gate.yml` is the stand-down's (see "PR Gate's stand-down" below).

## Provenance of the claim

Traced from this repo's git history only.

| Commit      | Date       | What it did                                                                                                                                                                                                                                                                                                                   |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1db422ab5` | 2026-09-09 | M0.16. Added the `lint`, `format` and `typecheck` workflows, each with a `should-run` input whose comment says a job-level `if:` gives "a differently-named, bare check run". The commit message says the workflows were copied from another repository with only a path fix. Nothing in it describes the symptom being seen. |
| `860d10f05` | 2026-09-09 | M0.20. Added `pr-gate.yml` with the "NO JOB HERE MAY CARRY A JOB-LEVEL `if:`" header and the same wording in `vitest.yml` and `playwright.yml`.                                                                                                                                                                               |
| `ecce1f1fe` | 2026-09-10 | Consolidated the working docs and wrote the rule into `claude-docs/ci.md` as a general rule ("A required-check job must never carry a job-level `if:`").                                                                                                                                                                      |
| `2e7dcfe85` | 2026-09-17 | MB.32. Collapsed five check workflows into `checks.yml` and extended the sentence to matrix legs.                                                                                                                                                                                                                             |

None of this repo's three rulesets requires a status check today, so the symptom could not have been seen. The M0.16, M0.20 and MB.32 decision records are in the frozen archive, which is not read; the commits above are the trace.

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

## Question 3: the ruleset probe

A second scratch pull request tested whether a skipped check satisfies a required check. The ruleset write is the one step the `gh` token cannot do: creating a ruleset returned `gh: Resource not accessible by personal access token (HTTP 403)`, and a PUT returned `{"message":"Resource not accessible by personal access token",...,"status":"403"}`. The owner made the ruleset changes in the web UI instead. The UI form also added `deletion` and `non_fast_forward` rules, which do not affect the result.

Probe commit `1256d135282f050c9da6be3ea1398e69335dab98`, pull request #1346 into `scratch/mb39-base`, run `41091224592` (success). Ruleset `mb39-scratch`, id `26221065`, targeted `scratch/mb39-base` only. Read back: `"required_status_checks":[{"context":"call-plain / plain-no","integration_id":15368}]`.

Check runs on the head sha, the same in all three cases:

```json
{"name":"call-plain / leg (leg-on)","status":"completed","conclusion":"success"}
{"name":"call-plain / plain-no","status":"completed","conclusion":"skipped"}
{"name":"call-plain / plain-yes","status":"completed","conclusion":"success"}
```

| Case | Required check                                                                | Result                                                           |
| ---- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| A    | `call-plain / plain-no` (a plain job, `skipped`)                              | `{"mergeable_state":"clean"}` `{"mergeStateStatus":"CLEAN"}`     |
| B    | `call-plain / leg (leg-off)` (a matrix leg left out of the matrix, never ran) | `{"mergeable_state":"blocked"}` `{"mergeStateStatus":"BLOCKED"}` |
| C    | `call-plain / plain-yes` (a job that succeeded, the control)                  | `{"mergeable_state":"clean"}` `{"mergeStateStatus":"CLEAN"}`     |

Case B was read back as `[[{"context":"call-plain / leg (leg-off)"}]]`, case C as `{"updated_at":"2026-10-30T09:44:24.696-07:00","checks":["call-plain / plain-yes"]}`.

## What MB.39 changed

Part 1, in `vitest.yml` and `playwright.yml`:

- `vitest-dom`, `vitest-node` and `vitest-db` carry `if: inputs.should-run`. The merge job `vitest` carries `if: ${{ !cancelled() && inputs.should-run }}`, so it still runs after a failed part but not on a filtered-off run.
- The `playwright` job carries `if: inputs.should-run`. The step-level `should-run` gating is gone from both files.
- Check names are unchanged (`vitest / vitest`, `playwright / playwright`). The only other caller of `playwright.yml` is `e2e-cache.yml`'s `warm` job, which relies on the default `should-run: true`.
- `playwright-coverage` reads only the `playwright` and `stories` results and outputs and uses `!cancelled()`. A skipped inner job leaves the caller's result `success` with empty outputs, so nothing breaks. Nothing `needs:` the vitest job.

Part 2, in `checks.yml`:

- The one matrix job is eight plain jobs: `lint`, `format`, `typecheck`, `codegen`, `build`, `destructive-ddl`, `migration-order` and `audit`. Each job's id and `name:` are the check name, so the check names are identical before and after, in the same order.
- `lint`, `typecheck`, `build`, `destructive-ddl` and `migration-order` carry `if: ${{ format('{0}', inputs.run-<leg>) != 'false' }}`. `format`, `codegen` and `audit` are not path-filtered and carry none. The `format()` wrapper makes an unset input (the empty string, as `act` leaves it) count as run.
- The `run-*` inputs and their defaults are kept, so `pr-gate.yml`'s call is unchanged. Nothing `needs:` `checks`.
- The steps every leg shares live in the composite action `.github/actions/run-check` (run, summarise, job summary, pull request comment). A composite action contributes steps only, so each job repeats the `container:` and `defaults:` preamble.
- Each job's `env:` is narrowed to what that job reads.
- `make act-check` runs `-j <leg>` instead of `-j check --matrix name:<leg>`.

`playwright-coverage.yml` and `gitflow.yml` still gate by step and are out of scope.

## PR Gate's stand-down

`pr-gate.yml` used to cancel its own `changes` run on a title or description edit, which left a cancelled `changes` and a cancelled `workshop` check run on the head commit, newer than the real run's successes, so the PR read as UNSTABLE (run `41097615379`). It now stands down: `changes` succeeds and sets a `stand-down` output, and every other job carries an `if:` on it, so each reports skipped. The finding above is what makes a caller-level `if:` safe here. A false `if:` on a calling job reports one bare name (`checks`) and never `checks / lint`, so it cannot overwrite a required inner name. A caller that ran with its inner jobs skipped would overwrite a real `checks / lint` failure with a skipped one, and a skipped required check passes, so no caller runs on a stand-down. A close's run stands down as well, since the other runs of the PR are cancelled by the group and a closed PR has no head commit to protect. Edits that retarget the base, and edits to a head commit no run has gated, still run the full gate. The `cancel-in-progress` expression is unchanged.

## Cleanup

- Pull requests #1345 and #1346 closed. `scratch/mb39-probe` and `scratch/mb39-base` deleted from `origin`; `git ls-remote --heads origin 'scratch/*'` prints nothing.
- The owner deleted the `mb39-scratch` ruleset. The rulesets diff against the list taken before is identical:

```
[{"id":22612570,"name":"Main"},{"id":22612931,"name":"Release Branches"},{"id":22612558,"name":"Staging"}]
```

- By `id`, `name` and rule `type` the three rulesets are unchanged: Main and Staging hold `deletion`, `non_fast_forward` and `pull_request`, Release Branches holds `deletion` and `non_fast_forward`. None of them requires a status check today.
- No live GitHub setting is changed.
