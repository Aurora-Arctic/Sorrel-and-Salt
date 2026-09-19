import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Vitest } from 'vitest/node';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StoryReporter from './story-reporter';
import type { ReportedModule } from './story-checklist';

// Only the plumbing; what the checklist says is story-checklist.test.ts's.

const modules: ReportedModule[] = [
  {
    relativeModuleId: 'tests/acceptance/01-accounts.test.ts',
    children: {
      allSuites: () => [{ name: 'Story 1: sign in', state: () => 'passed' as const }],
    },
  },
];

function fakeVitest(root: string, outputFile?: Vitest['config']['outputFile']) {
  const log = vi.fn();
  const vitest = { logger: { log }, config: { root, outputFile } } as unknown as Vitest;
  return { vitest, log };
}

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'story-reporter-'));
  roots.push(root);
  return root;
}

describe('StoryReporter', () => {
  it('prints the checklist through the logger when the run ends', async () => {
    const { vitest, log } = fakeVitest(tempRoot());
    const reporter = new StoryReporter();
    reporter.onInit(vitest);

    await reporter.onTestRunEnd(modules as never, [], 'passed');

    expect(log).toHaveBeenCalledTimes(1);
    const printed = String(log.mock.calls[0][0]);
    expect(printed).toContain('[x] Story 1:');
    expect(printed).toContain('1 of 45 stories passing');
  });

  it('writes nothing to disk unless an output file is configured', async () => {
    const root = tempRoot();
    const { vitest } = fakeVitest(root);
    const reporter = new StoryReporter();
    reporter.onInit(vitest);

    await reporter.onTestRunEnd([], [], 'passed');

    expect(() => readFileSync(join(root, 'stories.json'))).toThrow();
  });

  it('writes the checklist as JSON at --outputFile, resolved against the root', async () => {
    // `--outputFile=stories.json` reaches every reporter as a plain string.
    const root = tempRoot();
    const { vitest } = fakeVitest(root, 'stories.json');
    const reporter = new StoryReporter();
    reporter.onInit(vitest);

    await reporter.onTestRunEnd(modules as never, [], 'passed');

    const written = JSON.parse(readFileSync(join(root, 'stories.json'), 'utf8'));
    expect(written.total).toBe(45);
    expect(written.counts.passed).toBe(1);
    expect(written.stories[0]).toMatchObject({ id: 1, status: 'passed' });
  });

  it('takes the "stories" key when --outputFile is given per reporter, creating the directory', async () => {
    // `--outputFile.stories=out/stories.json` is how the built-in json
    // reporter is addressed too; the key is this reporter's name.
    const root = tempRoot();
    const { vitest } = fakeVitest(root, { stories: 'out/stories.json', json: 'other.json' });
    const reporter = new StoryReporter();
    reporter.onInit(vitest);

    await reporter.onTestRunEnd([], [], 'passed');

    expect(JSON.parse(readFileSync(join(root, 'out/stories.json'), 'utf8')).total).toBe(45);
    expect(() => readFileSync(join(root, 'other.json'))).toThrow();
  });

  it('prefers an output file passed to the constructor', async () => {
    const root = tempRoot();
    const { vitest } = fakeVitest(root, 'ignored.json');
    const reporter = new StoryReporter({ outputFile: join(root, 'chosen.json') });
    reporter.onInit(vitest);

    await reporter.onTestRunEnd([], [], 'passed');

    expect(JSON.parse(readFileSync(join(root, 'chosen.json'), 'utf8')).total).toBe(45);
    expect(() => readFileSync(join(root, 'ignored.json'))).toThrow();
  });
});
