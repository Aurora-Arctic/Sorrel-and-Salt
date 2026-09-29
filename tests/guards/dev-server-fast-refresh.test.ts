import type { NextConfig } from 'next';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// `next dev`'s server Fast Refresh re-runs an edited module and the modules
// that import it, and nothing below them. The GraphQL schema is registered on
// a module-level builder as each module loads, so an edited module registers
// its fields a second time on the builder it imported, and every request then
// fails with Pothos's "Duplicate field" until the server restarts
// (claude-docs/debugging.md, "Server edits reload the server's modules").
describe('next dev', () => {
  it('reloads edited server modules from disk rather than patching them in place', async () => {
    const { default: config } = (await import(fromRoot('next.config.ts'))) as {
      default: NextConfig;
    };

    expect(config.experimental?.turbopackServerFastRefresh).toBe(false);
  });
});
