import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../support/paths';

// Two pieces of wiring no runtime test reaches: `npm run db:reset` drops
// before it migrates and seeds (claude-docs/db.md, "Migrations and scripts"),
// and `app` in compose waits on the one-shot `db-init` service
// (claude-docs/docker.md). Either can go missing with nothing failing until a
// developer hits it by hand. The compose file is parsed rather than grepped:
// the claim is that `service_completed_successfully` is `app`'s condition on
// `db-init`, not that the phrase appears somewhere.

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

  // A profile is what keeps `workshop` and `studio` out of a bare `make docker-up`.
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

  // One node_modules volume per service (docker.md, see above).
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

  // Precondition: `app` really does declare conditional dependencies, so a
  // green result is the condition being right rather than `depends_on` rewritten
  // to the short list form, where every lookup reads `undefined`.
  it('still health-gates on Postgres as well', () => {
    expect(compose.services.app.depends_on?.postgres?.condition).toBe('service_healthy');
  });
});
