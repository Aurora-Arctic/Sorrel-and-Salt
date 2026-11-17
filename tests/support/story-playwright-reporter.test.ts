import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FullResult, TestCase } from '@playwright/test/reporter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StoryPlaywrightReporter from './story-playwright-reporter';

// A one-story run, as the reporter sees it at the end.
function finish(reporter: StoryPlaywrightReporter) {
  const test = {
    tags: ['@story-91'],
    title: 'Testwort walk',
    location: { file: join(process.cwd(), 'tests/e2e/stories/testwort.spec.ts') },
    results: [{}],
    outcome: () => 'expected',
  } as unknown as TestCase;
  reporter.onTestEnd(test);
  return reporter.onEnd({ status: 'passed' } as FullResult);
}

describe('the story checklist reporter', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'stories-'));
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the checklist to the file STORIES_JSON names when it is named on the command line, with no options', async () => {
    const file = join(dir, 'stories.json');
    vi.stubEnv('STORIES_JSON', file);

    await finish(new StoryPlaywrightReporter());

    expect(JSON.parse(readFileSync(file, 'utf8')).counts.passed).toBe(1);
  });

  it('writes the file its option names before the one STORIES_JSON names', async () => {
    const named = join(dir, 'option.json');
    const fromEnv = join(dir, 'env.json');
    vi.stubEnv('STORIES_JSON', fromEnv);

    await finish(new StoryPlaywrightReporter({ outputFile: named }));

    expect(existsSync(named)).toBe(true);
    expect(existsSync(fromEnv)).toBe(false);
  });
});
