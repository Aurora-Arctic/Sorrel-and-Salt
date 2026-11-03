import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A daily job starts from its Vercel Cron route alone (claude-docs/design-decisions/m15.46-daily-jobs-from-vercel-cron.md):
// no page visit, sign-up or send starts one, so the job never depends on traffic and never runs twice for it. The set of
// callers is pinned, so a further one is argued for in the diff. Untracked files count.

const sources = () =>
  inject('repoFiles').filter(
    (file) =>
      file.startsWith('src/') && /\.[cm]?tsx?$/.test(file) && !file.includes('__lint-probe'),
  );
const callers = (call: RegExp) =>
  sources()
    .filter((file) => call.test(readFileSync(join(REPO_ROOT, file), 'utf8')))
    .sort();

describe('a daily job starts from its cron route alone', () => {
  it('only the support-retention route starts the support-retention job', () => {
    // Precondition: the listing holds the route, so an empty one cannot pass.
    expect(sources()).toContain('src/app/api/cron/support-retention/route.ts');

    expect(callers(/\bstartSupportRetention\(/)).toEqual([
      'src/app/api/cron/support-retention/route.ts',
      'src/modules/support/services/retention-start.ts',
    ]);
    expect(callers(/\bstartJob\(\s*supportRetention\b/)).toEqual([
      'src/modules/support/services/retention-start.ts',
    ]);
  });

  it('only the provisional-cleanup route starts the provisional cleanup', () => {
    // Precondition: the listing holds the route, so an empty one cannot pass.
    expect(sources()).toContain('src/app/api/cron/provisional-cleanup/route.ts');

    expect(callers(/\bstartProvisionalCleanup\(/)).toEqual([
      'src/app/api/cron/provisional-cleanup/route.ts',
      'src/modules/identity/services/provisional-cleanup.ts',
    ]);
    expect(callers(/\bstartJob\(\s*provisionalCleanup\b/)).toEqual([
      'src/modules/identity/services/provisional-cleanup.ts',
    ]);
  });

  it('the coordinator ends: it neither sleeps nor holds a hook', () => {
    const job = readFileSync(
      join(REPO_ROOT, 'src/modules/identity/jobs/provisional-cleanup.ts'),
      'utf8',
    );
    // Precondition: the file is the coordinator.
    expect(job).toMatch(/export async function provisionalCleanup\(/);
    expect(job).not.toMatch(/\b(?:sleep|createHook)\b/);
  });

  it('the admin Support page starts no support job', () => {
    const page = readFileSync(join(REPO_ROOT, 'src/app/(shell)/keepers/support/page.tsx'), 'utf8');
    // Precondition: the page is the one that reads the support requests.
    expect(page).toMatch(/requireCuratorSession/);
    expect(page).not.toMatch(/Retention|Sweep|\bafter\(/);
  });
});
