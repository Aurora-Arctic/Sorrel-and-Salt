## Container jobs

`checks.yml`, `vitest.yml` and `playwright.yml` all run their work inside a
`container:` built from a GHCR image, with `defaults.run.working-directory:
/app`. Four things about that shape are load-bearing and none of them is
visible from the step that depends on them.

- **`defaults.run.shell: bash` is not cosmetic.** A `container:` job defaults
  to `sh`, unlike a plain `runs-on` job
  ([docs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container)),
  and dash has no `set -o pipefail` — which every `… | tee output.log` step
  relies on to report the tool's exit status rather than `tee`'s.
- **`options: --user root` on the `testing` image jobs.** That image's default
  user is `node`, which cannot write the runner's bind-mounted
  `_temp/_runner_file_commands` directory — `actions/checkout`, and any JS
  action using `core.saveState`/`setOutput`, fails `EACCES` without it.
- **Guards that shell out to git pass `-c safe.directory=*`.** Those root jobs
  run over a checkout owned by uid 1000, and git refuses a repository owned by
  another user ("dubious ownership") unless told the directory is safe.
- **`playwright.yml` passes `options: --ipc=host` instead.** Chromium crashes
  on the container default 64 MB `/dev/shm`. The e2e image runs as root, the
  `node` base image's default, since `Dockerfile.e2e` never switches user,
  so `--user root` would add nothing there; Chromium
  under root expects `--no-sandbox`, which `playwright.config.ts` owns if it
  ever launches non-headless — the headless default here does not need it.
- **Every path a step hands to another step is the absolute `/app` one.**
  `checkout-to-app` populates both `$GITHUB_WORKSPACE` (what `hashFiles()`
  reads) and `/app` (where the job's commands actually run), so a
  workspace-relative log file, cache path or `--outputFile` resolves against
  the wrong one.

**Each `checks.yml` job's `name:` is load-bearing too.** The job id and `name:`
are both the check's name (`lint`, `format`, …), so the check reports as
`checks / lint`. A job without `name:` would report its id, and a job
renamed would strand a required check under the old name.
