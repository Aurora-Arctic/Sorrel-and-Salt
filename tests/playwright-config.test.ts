import { afterEach, describe, expect, it, vi } from 'vitest';

// The audit projects exist only when asked for, and `npm run e2e` never asks
// (claude-docs/testing/e2e.md, "The audit"). The config reads the environment as it loads, so
// each case loads it afresh.

const CHROMIUM_PROJECTS = [
  'chromium',
  'chromium-configured-providers',
  'chromium-compendium-cache',
];
const AUDIT_PROJECTS = ['webkit', 'firefox', 'phone'];
const SPECIAL_SPECS = [
  'tests/e2e/sign-in-configured-providers.spec.ts',
  'tests/e2e/compendium-cache.spec.ts',
];
const CHROMIUM_ENDPOINT = 'ws://playwright-server:4444/';
const AUDIT_ENDPOINT = 'ws://playwright-audit:4444/';

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const name of ['E2E_AUDIT', 'PLAYWRIGHT_WS_ENDPOINT', 'PLAYWRIGHT_AUDIT_WS_ENDPOINT']) {
    vi.stubEnv(name, env[name]);
  }
  const [{ default: config }, slots] = await Promise.all([
    import('../playwright.config'),
    import('./e2e/slots'),
  ]);
  return { config, slots };
}

const names = (projects: { name?: string }[] | undefined) => projects?.map((p) => p.name);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('playwright.config.ts', () => {
  it('runs the three Chromium projects alone unless E2E_AUDIT=1, whatever else is set', async () => {
    const { config } = await load({
      PLAYWRIGHT_WS_ENDPOINT: CHROMIUM_ENDPOINT,
      PLAYWRIGHT_AUDIT_WS_ENDPOINT: AUDIT_ENDPOINT,
    });
    expect(names(config.projects)).toEqual(CHROMIUM_PROJECTS);
    // `E2E_AUDIT` set to anything but '1' is the same as unset.
    const off = await load({ E2E_AUDIT: '0', PLAYWRIGHT_AUDIT_WS_ENDPOINT: AUDIT_ENDPOINT });
    expect(names(off.config.projects)).toEqual(CHROMIUM_PROJECTS);
  });

  it('adds webkit, firefox and phone under E2E_AUDIT=1, each dialling the audit service', async () => {
    const { config } = await load({
      E2E_AUDIT: '1',
      PLAYWRIGHT_WS_ENDPOINT: CHROMIUM_ENDPOINT,
      PLAYWRIGHT_AUDIT_WS_ENDPOINT: AUDIT_ENDPOINT,
    });
    expect(names(config.projects)).toEqual([...CHROMIUM_PROJECTS, ...AUDIT_PROJECTS]);
    // The global `use` still names the Chromium server, so the audit projects
    // must each carry their own endpoint, and the Chromium ones none.
    expect(config.use?.connectOptions?.wsEndpoint).toBe(CHROMIUM_ENDPOINT);
    for (const project of config.projects!) {
      const own = project.use?.connectOptions?.wsEndpoint;
      expect(own, project.name).toBe(
        AUDIT_PROJECTS.includes(project.name!) ? AUDIT_ENDPOINT : undefined,
      );
    }
  });

  it('keeps the two special specs, which run on their own ports, out of every audit project', async () => {
    const { config } = await load({ E2E_AUDIT: '1', PLAYWRIGHT_AUDIT_WS_ENDPOINT: AUDIT_ENDPOINT });
    const audit = config.projects!.filter((p) => AUDIT_PROJECTS.includes(p.name!));
    expect(audit).toHaveLength(AUDIT_PROJECTS.length);
    for (const project of audit) {
      const ignores = ([] as (string | RegExp)[]).concat(project.testIgnore ?? []);
      for (const spec of SPECIAL_SPECS) {
        const ignored = ignores.some((pattern) =>
          pattern instanceof RegExp ? pattern.test(spec) : spec.endsWith(pattern),
        );
        expect(ignored, `${project.name} ignores ${spec}`).toBe(true);
      }
      // No project of its own base URL: the fixture gives each worker its
      // slot's server, as it does the Chromium project.
      expect(project.use?.baseURL, project.name).toBeUndefined();
    }
  });

  it('runs the audit in the two other engines and on a real iPhone profile', async () => {
    const { config } = await load({ E2E_AUDIT: '1', PLAYWRIGHT_AUDIT_WS_ENDPOINT: AUDIT_ENDPOINT });
    const byName = Object.fromEntries(config.projects!.map((p) => [p.name, p.use ?? {}]));
    expect(byName.webkit.defaultBrowserType).toBe('webkit');
    expect(byName.firefox.defaultBrowserType).toBe('firefox');
    expect(byName.phone).toMatchObject({
      defaultBrowserType: 'webkit',
      isMobile: true,
      hasTouch: true,
    });
    expect(byName.phone.userAgent).toMatch(/iPhone/);
  });

  it('refuses E2E_AUDIT=1 without the audit endpoint, naming the variable', async () => {
    await expect(
      load({ E2E_AUDIT: '1', PLAYWRIGHT_WS_ENDPOINT: CHROMIUM_ENDPOINT }),
    ).rejects.toThrow(/PLAYWRIGHT_AUDIT_WS_ENDPOINT/);
  });
});

describe('browserUrl', () => {
  it('names the devcontainer when the audit service alone holds the browser', async () => {
    const { slots } = await load({ E2E_AUDIT: '1', PLAYWRIGHT_AUDIT_WS_ENDPOINT: AUDIT_ENDPOINT });
    expect(slots.browserUrl(8001)).toBe('http://devcontainer:8001');
  });

  it('reads the audit endpoint only under E2E_AUDIT=1', async () => {
    const { slots } = await load({ PLAYWRIGHT_AUDIT_WS_ENDPOINT: AUDIT_ENDPOINT });
    expect(slots.browserUrl(8001)).toBe('http://localhost:8001');
  });
});

describe('the e2e port block', () => {
  async function ports(base: string | undefined) {
    vi.resetModules();
    vi.stubEnv('E2E_PORT_BASE', base);
    return import('./e2e/slots');
  }

  it('starts at 8001 with the providers server on 8100, the cache server on 8101, and the workshop on 8102', async () => {
    const slots = await ports(undefined);
    expect(slots.slotPort(0)).toBe(8001);
    expect(slots.slotPort(3)).toBe(8004);
    expect(slots.CONFIGURED_PROVIDERS_PORT).toBe(8100);
    expect(slots.COMPENDIUM_CACHE_PORT).toBe(8101);
    expect(slots.WORKSHOP_PORT).toBe(8102);
  });

  it('moves them all together when E2E_PORT_BASE moves', async () => {
    const slots = await ports('8401');
    expect(slots.slotPort(0)).toBe(8401);
    expect(slots.slotPort(2)).toBe(8403);
    expect(slots.CONFIGURED_PROVIDERS_PORT).toBe(8500);
    expect(slots.COMPENDIUM_CACHE_PORT).toBe(8501);
    expect(slots.WORKSHOP_PORT).toBe(8502);
  });

  it.each(['abc', '80.5', '', '1023', '0', '65435'])('refuses %j', async (base) => {
    await expect(ports(base)).rejects.toThrow(/E2E_PORT_BASE/);
  });

  it('accepts the highest base whose workshop port still fits under 65535', async () => {
    const slots = await ports('65434');
    expect(slots.WORKSHOP_PORT).toBe(65535);
  });
});

// Storybook's live-reload socket shares its HTTP port, so the block needs no second
// port for it and a test run never competes with the review workshop's 61000
// (claude-docs/workshop.md, ".storybook/").
describe('playwright.workshop.config.ts', () => {
  it("serves Storybook on the block's workshop port, which moves with E2E_PORT_BASE", async () => {
    vi.resetModules();
    vi.stubEnv('E2E_PORT_BASE', '8401');
    const { default: config } = await import('../playwright.workshop.config');
    const server = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
    expect(server?.command).toContain('storybook dev');
    expect(server?.command).toContain('--port 8502');
  });

  // CI's workshop job has no database and no .env.local, and the config must still load: it shares
  // nothing with the e2e config that builds the slot servers' environment, which reads DATABASE_URL
  // as it is imported. The devcontainer's shell sets DATABASE_URL, so without the stub this case would pass on a broken config.
  it('loads with DATABASE_URL unset, as on CI', async () => {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', undefined);
    expect(process.env.DATABASE_URL).toBeUndefined();
    const { default: config } = await import('../playwright.workshop.config');
    expect(config.testDir).toMatch(/workshop/);
  });
});
