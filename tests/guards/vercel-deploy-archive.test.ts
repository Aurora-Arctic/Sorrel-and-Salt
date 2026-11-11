import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// Vercel's free plan caps uploads at 5,000 files a day, and a prebuilt deploy uploads each output file
// separately unless it is archived into one tarball.

const WORKFLOW_FILE = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const DEPLOY_COMMAND = /vercel deploy\b[^\n]*(?:\\\n[^\n]*)*/g;

describe('.github/workflows', () => {
  it('archives every vercel deploy into one upload', () => {
    const files = inject('repoFiles').filter((file) => WORKFLOW_FILE.test(file));
    const commands = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(DEPLOY_COMMAND)].map(([command]) => ({
        file,
        command,
      })),
    );

    // Preconditions: the scan read the workflows and found the deploy command in them.
    expect(files).toContain('.github/workflows/deploy.yml');
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.filter(({ command }) => !command.includes('--archive=tgz'))).toEqual([]);
  });
});
