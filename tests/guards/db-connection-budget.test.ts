import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import config from '../../vitest.config.mts';
import stories from '../../vitest.stories.config.mts';
import { BOUNDED_POSTGRES_PLUGIN, DB_WORKER_CAP, dbMaxWorkers } from '../support/db-project.mts';
import { TEST_POOL_MAX } from '../support/db/bounded-postgres';
import { fromRoot } from '../support/paths';
import type { Project } from './types';

// A db run holds connections in every worker at once, and Postgres refuses
// the first one past `max_connections` with a 500 from whatever happened to
// be signing in (MB.179). The budget is arithmetic over three configured
// numbers — the worker cap, the pool each client under test may open, and the
// image's `max_connections` — so that raising any one of them without the
// others fails here rather than in a crowded afternoon
// (claude-docs/testing/db-harness.md, "Connections per run").

const DOCKERFILE = 'Docker/Dockerfile.postgres';
/** A pool every worker's app client and every test file's own client may each fill. */
const POOLS_PER_WORKER = 2;
/** The run's own client outside the workers: global setup's, which ends before they start. */
const SETUP_CONNECTIONS = 1;

/** `max_connections` as the image's CMD sets it; undefined when it leaves Postgres's default. */
function configuredMaxConnections(): number | undefined {
  const dockerfile = readFileSync(fromRoot(DOCKERFILE), 'utf8').replace(/\\\r?\n/g, ' ');
  const cmd = dockerfile.split(/\r?\n/).find((line) => /^CMD\s/.test(line.trim()));
  const match = cmd?.match(/max_connections=(\d+)/);
  return match ? Number(match[1]) : undefined;
}

const maxConnections = configuredMaxConnections();

const projects = (config.test?.projects ?? []).filter(
  (project) => typeof project === 'object' && !(project instanceof Promise),
) as Project[];
const pluginNames = (project: Project) =>
  [project.plugins ?? []].flat().map((plugin) => (plugin as { name?: string }).name);

describe('MB.179: the numbers the budget is made of', () => {
  // Precondition: a zero or an unparsed value would satisfy any budget.
  it('are each configured and positive', () => {
    expect(DB_WORKER_CAP).toBeGreaterThan(0);
    expect(dbMaxWorkers).toBeGreaterThan(0);
    expect(TEST_POOL_MAX).toBeGreaterThan(0);
    expect(maxConnections, `${DOCKERFILE} sets no max_connections in its CMD`).toBeGreaterThan(0);
  });

  it('hold the worker count under the cap on this machine, so the cap is the bound', () => {
    expect(dbMaxWorkers).toBeLessThanOrEqual(DB_WORKER_CAP);
  });
});

describe('MB.179: a full run holds no more than half of max_connections', () => {
  it('within the budget: workers × pools × pool size, plus the setup client', () => {
    const peak = DB_WORKER_CAP * POOLS_PER_WORKER * TEST_POOL_MAX + SETUP_CONNECTIONS;

    expect(peak).toBeLessThanOrEqual((maxConnections as number) / 2);
  });
});

describe('MB.179: the bound is what the runs use', () => {
  it('pins every project to the capped worker count, so one pool group agrees', () => {
    expect(config.test?.maxWorkers).toBe(dbMaxWorkers);
    expect(stories.test?.maxWorkers).toBe(dbMaxWorkers);
  });

  it('bounds the clients of the db project and the acceptance suite', () => {
    const db = projects.find((project) => project.test?.name === 'db');

    expect(db).toBeDefined();
    expect(pluginNames(db as Project)).toContain(BOUNDED_POSTGRES_PLUGIN);
    expect(pluginNames(stories)).toContain(BOUNDED_POSTGRES_PLUGIN);
  });

  it('leaves the projects without a database alone', () => {
    for (const project of projects.filter((entry) => entry.test?.name !== 'db')) {
      expect(pluginNames(project)).not.toContain(BOUNDED_POSTGRES_PLUGIN);
    }
  });
});
