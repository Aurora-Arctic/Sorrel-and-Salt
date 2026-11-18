import { describe, expect, it } from 'vitest';

import {
  CONFIG,
  DEFAULT_BASE,
  affectedGraph,
  cruiseArguments,
  runCruise,
} from '../../scripts/review-affected.mjs';

describe('the affected-modules graph', () => {
  it('diffs against origin/staging unless given another base', () => {
    expect(DEFAULT_BASE).toBe('origin/staging');
    const args = cruiseArguments();
    expect(args[args.indexOf('--affected') + 1]).toBe('origin/staging');

    const given = cruiseArguments('origin/main');
    expect(given[given.indexOf('--affected') + 1]).toBe('origin/main');
  });

  it('fails when the cruise reached no modules', async () => {
    const empty = { modules: [], summary: { totalCruised: 0 } };
    await expect(affectedGraph(empty, DEFAULT_BASE)).rejects.toThrow(/cruised no modules/);
  });

  it('writes the cruised modules as a Mermaid block', async () => {
    const result = runCruise(['src/lib/slugify.ts', '--config', CONFIG, '--output-type', 'json']);

    // Precondition: the cruise found the module the graph should show.
    expect(result.summary.totalCruised).toBeGreaterThan(0);
    const markdown = await affectedGraph(result, DEFAULT_BASE);
    expect(markdown).toMatch(/```mermaid\nflowchart LR\n[\s\S]*"slugify\.ts"[\s\S]*\n```\n$/);
  });
});
