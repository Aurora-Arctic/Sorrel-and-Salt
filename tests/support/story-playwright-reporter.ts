import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import type { FullResult, Reporter, TestCase } from '@playwright/test/reporter';
import { buildChecklist, formatChecklist } from './story-checklist';
import type { StoryObservation, StoryReporterOptions } from './types';

// The Playwright reporter behind `npm run test:stories`: reads the `@story-N` tag of every test in
// tests/e2e/stories/ and prints the checklist of v1 stories, writing it as JSON for
// .github/scripts/summarize-stories.mjs when an output file is configured. It runs beside the `list`
// reporter, so a failing story still shows its assertion (claude-docs/testing/acceptance.md).

const STORY_TAG = /^@story-(\d+)$/;

export default class StoryPlaywrightReporter implements Reporter {
  private readonly tests: TestCase[] = [];

  constructor(private readonly options: StoryReporterOptions = {}) {}

  onTestEnd(test: TestCase): void {
    // Retries end the same test more than once; keep one entry per test.
    if (!this.tests.includes(test)) this.tests.push(test);
  }

  printsToStdio(): boolean {
    return true;
  }

  async onEnd(result: FullResult): Promise<{ status: 'failed' } | undefined> {
    const observations: StoryObservation[] = [];
    const untagged: string[] = [];

    for (const test of this.tests) {
      const file = relative(process.cwd(), test.location.file);
      const ids = test.tags.flatMap((tag) => {
        const match = STORY_TAG.exec(tag);
        return match ? [Number(match[1])] : [];
      });
      if (ids.length === 0) {
        untagged.push(`${file} › ${test.title}`);
        continue;
      }
      const observed = observe(test, result);
      for (const storyId of ids) observations.push({ storyId, file, ...observed });
    }

    const checklist = buildChecklist(observations);
    process.stdout.write(`\n${formatChecklist(checklist)}\n`);
    for (const name of untagged) process.stdout.write(`No story tag: ${name}\n`);

    const { outputFile } = this.options;
    if (outputFile) {
      const path = resolve(process.cwd(), outputFile);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify({ ...checklist, untagged }, null, 2));
    }

    // A test no story names proves no story, and the checklist cannot show it:
    // fail the run, which replaces reviewing the names by eye.
    return untagged.length > 0 ? { status: 'failed' } : undefined;
  }
}

function observe(test: TestCase, result: FullResult): Pick<StoryObservation, 'state' | 'flaky'> {
  switch (test.outcome()) {
    case 'unexpected':
      return { state: 'failed' };
    // A story that passed only on a retry has a bug to fix. Retries stay on so
    // the run completes and the flake shows its trace, but it counts as failed:
    // the checklist lists it as flaky and leaves its box unticked.
    case 'flaky':
      return { state: 'failed', flaky: true };
    case 'skipped':
      return { state: 'skipped' };
    default:
      // No result at all in an interrupted run (Ctrl-C, a global timeout) is
      // not a pass: Vitest's `pending` read as failed for the same reason.
      return {
        state: test.results.length === 0 && result.status === 'interrupted' ? 'failed' : 'passed',
      };
  }
}
