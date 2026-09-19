import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Reporter, SerializedError, TestModule, TestRunEndReason, Vitest } from 'vitest/node';
import { buildChecklist, formatChecklist } from './story-checklist';

// M1.28 — the Vitest reporter behind `make test-stories`.
//
// It does one thing at the end of the run: build the checklist from the
// modules Vitest reports, print it, and — when an output file is configured
// — write the same checklist as JSON for .github/scripts/summarize-stories.mjs
// to turn into the PR comment. It runs beside the default reporter rather
// than instead of it (vitest.stories.config.mts), so a failing story still
// shows its assertion; this only adds the view §11 asks for.
//
// The output file is taken the way the built-in json reporter takes its own:
// `--outputFile=stories.json` reaches every reporter as one string, and
// `--outputFile.stories=…` addresses this one by name.

export interface StoryReporterOptions {
  /** Where to write the checklist as JSON; relative paths resolve against the root. */
  outputFile?: string;
}

export default class StoryReporter implements Reporter {
  private vitest!: Vitest;

  constructor(private readonly options: StoryReporterOptions = {}) {}

  onInit(vitest: Vitest): void {
    this.vitest = vitest;
  }

  onTestRunEnd(
    testModules: ReadonlyArray<TestModule>,
    _unhandledErrors: ReadonlyArray<SerializedError>,
    _reason: TestRunEndReason,
  ): void {
    const checklist = buildChecklist(testModules);
    this.vitest.logger.log(formatChecklist(checklist));

    const outputFile = this.outputFile();
    if (!outputFile) return;
    const path = resolve(this.vitest.config.root, outputFile);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(checklist, null, 2));
  }

  private outputFile(): string | undefined {
    if (this.options.outputFile) return this.options.outputFile;
    const configured = this.vitest.config.outputFile;
    if (typeof configured === 'string') return configured;
    return configured?.stories;
  }
}
