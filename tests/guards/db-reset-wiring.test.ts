import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../support/paths';

// M1.24 — the two pieces of wiring that make "a corrupted local database is
// never a blocker" true, neither of which any other test can reach.
//
//   1. `npm run db:reset` drops before it migrates and seeds. Drop the drop
//      and the script still passes its own smoke test on a healthy database —
//      it only fails in the state it exists for, on someone else's machine.
//   2. `make docker-up` seeds a clean volume on its own, because `app` waits
//      on a one-shot `db-init` service. Delete the `depends_on` and compose
//      still starts everything; the app just races an unmigrated database.
//
// Both are configuration, so both are unreachable from a runtime test and
// neither shows up as a failure until a developer hits it by hand. That is the
// sweep-task rule's "can it be made impossible, or only absent?" — this one
// can only be made absent, so it gets a mechanical guard (CLAUDE.md).
//
// The compose file is parsed rather than grepped: `condition:
// service_completed_successfully` appearing *somewhere* in the file is not the
// claim. The claim is that it is `app`'s condition on `db-init`.

interface ComposeService {
  profiles?: string[];
  command?: string[] | string;
  environment?: Record<string, string>;
  depends_on?: Record<string, { condition?: string }>;
}

interface Compose {
  services: Record<string, ComposeService>;
  volumes: Record<string, unknown>;
}

const compose = parse(readFileSync(fromRoot('Docker/docker-compose.yaml'), 'utf8')) as Compose;
const scripts = (
  JSON.parse(readFileSync(fromRoot('package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  }
).scripts;

const INIT_SERVICE = 'db-init';

/** A service's command as one string, however compose spells it. */
function commandOf(service: ComposeService): string {
  const command = service.command ?? '';
  return Array.isArray(command) ? command.join(' ') : command;
}

describe('npm run db:reset', () => {
  it('drops, then migrates, then seeds — in that order', () => {
    const reset = scripts['db:reset'];

    expect(reset.indexOf('db:drop')).toBeGreaterThanOrEqual(0);
    expect(reset.indexOf('db:migrate')).toBeGreaterThan(reset.indexOf('db:drop'));
    expect(reset.indexOf('db:seed')).toBeGreaterThan(reset.indexOf('db:migrate'));
  });

  // `&&`, not `;`: a failed drop must stop the reset rather than let a migrate
  // run against the state that just refused to clear.
  it('stops at the first failing step', () => {
    expect(scripts['db:reset']).not.toContain(';');
    expect(scripts['db:reset']).toContain('&&');
  });

  it('exposes the drop on its own, so a reset can be taken apart when it fails', () => {
    expect(scripts['db:drop']).toBeDefined();
  });
});

describe(`the ${INIT_SERVICE} compose service`, () => {
  const service = compose.services[INIT_SERVICE];

  it('exists', () => {
    expect(service).toBeDefined();
  });

  // A profile is what keeps `workshop` and `studio` out of a bare
  // `make docker-up`. This service is the one that must not be kept out.
  it('sits in no compose profile, so a bare docker-up runs it', () => {
    expect(service.profiles).toBeUndefined();
  });

  it('waits for Postgres to pass its health check', () => {
    expect(service.depends_on?.postgres?.condition).toBe('service_healthy');
  });

  it('migrates and then seeds', () => {
    const command = commandOf(service);

    expect(command).toContain('db:migrate');
    expect(command.indexOf('db:seed')).toBeGreaterThan(command.indexOf('db:migrate'));
  });

  it('takes its scenario from SEED_SCENARIO, defaulting to minimal', () => {
    expect(service.environment?.SEED_SCENARIO).toBe('${SEED_SCENARIO:-minimal}');
  });

  // docker.md's rule: one node_modules volume per service, because a shared
  // one makes services race to populate it from their images on first mount.
  it('has a node_modules volume of its own', () => {
    expect(compose.volumes).toHaveProperty('node_modules_db_init');
  });
});

describe('the app compose service', () => {
  it(`starts only once ${INIT_SERVICE} has completed successfully`, () => {
    expect(compose.services.app.depends_on?.[INIT_SERVICE]?.condition).toBe(
      'service_completed_successfully',
    );
  });

  // The precondition for the assertion above: `app` really does declare
  // conditional dependencies, so a green result is the condition being right
  // rather than depends_on having been rewritten to the short list form (where
  // every lookup would read `undefined` and this suite would go quiet).
  it('still health-gates on Postgres as well', () => {
    expect(compose.services.app.depends_on?.postgres?.condition).toBe('service_healthy');
  });
});
