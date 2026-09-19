import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Reporter, SerializedError, TestModule, TestRunEndReason, Vitest } from 'vitest/node';
import { buildChecklist, formatChecklist } from './story-checklist';

// The Vitest reporter behind `make test-stories`: prints the checklist at the
// end of the run and, when an output file is configured, writes it as JSON for
// .github/scripts/summarize-stories.mjs. Runs beside the default reporter so a
// failing story still shows its assertion.
//
// `--outputFile=stories.json` reaches every reporter as one string;
// `--outputFile.stories=…` addresses this one by name, as the built-in json
// reporter is addressed.

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
