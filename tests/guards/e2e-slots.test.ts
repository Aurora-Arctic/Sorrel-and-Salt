import type { NextConfig } from 'next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '../../playwright.config';
import {
  COMPENDIUM_CACHE_PORT,
  CONFIGURED_PROVIDERS_PORT,
  E2E_SLOTS,
  MAX_SLOTS,
  currentSlot,
  slotCount,
  slotPort,
} from '../e2e/slots';
import { fromRoot } from '../support/paths';

// Each Playwright worker slot has a server and a database of its own, as each
// Vitest pool slot has a database: one database shared between workers is one
// that a spec file's reseed drops under another's (claude-docs/testing/e2e.md,
// "E2E"). The servers are declared up front, so the worker count is a config
// value, and a worker past it must fail rather than reach another's server.

const servers = [config.webServer ?? []].flat();
const databaseOf = (server: (typeof servers)[number]) =>
  new URL(server.env?.DATABASE_URL ?? '').pathname.slice(1);
const portOf = (url: string | undefined) => Number(new URL(url ?? '').port);
const project = (name: string) => config.projects?.find((entry) => entry.name === name);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('MB.112: the worker count', () => {
  it("defaults to half the CPUs, as Playwright's own default does", () => {
    expect(slotCount({}, 4)).toBe(2);
    expect(slotCount({}, 5)).toBe(2);
    expect(slotCount({}, 1)).toBe(1);
  });

  it('takes E2E_WORKERS over the default', () => {
    expect(slotCount({ E2E_WORKERS: '3' }, 4)).toBe(3);
  });

  it.each(['0', '-1', '2.5', 'two', '', String(MAX_SLOTS + 1)])('refuses E2E_WORKERS=%j', (raw) => {
    expect(() => slotCount({ E2E_WORKERS: raw }, 4)).toThrow(/E2E_WORKERS/);
  });

  it("keeps the last slot's port below the configured-providers server's", () => {
    expect(slotPort(MAX_SLOTS - 1)).toBeLessThan(CONFIGURED_PROVIDERS_PORT);
  });

  it('is what the config runs', () => {
    expect(config.workers).toBe(E2E_SLOTS);
  });

  it('declares a server for each worker E2E_WORKERS asks for', async () => {
    vi.stubEnv('E2E_WORKERS', '3');
    const { default: stubbed } = await import('../../playwright.config');
    const stubbedServers = [stubbed.webServer ?? []].flat();

    expect(stubbed.workers).toBe(3);
    // Three slots, the configured-providers server and the compendium-cache server.
    expect(stubbedServers).toHaveLength(5);
  });
});

describe("MB.112: a worker's slot", () => {
  it('is the parallel index Playwright gives the worker', () => {
    expect(currentSlot({ TEST_PARALLEL_INDEX: '1' }, 2)).toBe(1);
  });

  it('fails past the last server, naming the limit and how to raise it', () => {
    expect(() => currentSlot({ TEST_PARALLEL_INDEX: '2' }, 2)).toThrow(
      /slot 2 has no server.*starts 2.*E2E_WORKERS/s,
    );
  });

  it('fails outside a Playwright worker', () => {
    expect(() => currentSlot({}, 2)).toThrow(/TEST_PARALLEL_INDEX/);
  });
});

describe('MB.112: every slot has its own server and database', () => {
  const slots = Array.from({ length: E2E_SLOTS }, (_, slot) => slot);

  // Precondition: an empty or single-entry list would pass every
  // uniqueness assertion below without anything having been kept apart.
  it('declares the slot servers, the configured-providers server and the compendium-cache server', () => {
    expect(servers).toHaveLength(E2E_SLOTS + 2);
  });

  it.each(slots)('serves slot %i on its own port, from its own database', (slot) => {
    const server = servers[slot];

    expect(portOf(server.url)).toBe(slotPort(slot));
    expect(server.env?.PORT).toBe(String(slotPort(slot)));
    expect(databaseOf(server)).toBe(`sorrel_e2e_${slot}`);
  });

  it('builds once, in the first server, and starts every other over that build', () => {
    expect(servers[0].command).toMatch(/^npm run build && npm run start$/);
    for (const server of servers.slice(1)) expect(server.command).toBe('npm run start');
  });

  it('gives no two servers the same port or database', () => {
    expect(new Set(servers.map((server) => portOf(server.url))).size).toBe(servers.length);
    expect(new Set(servers.map(databaseOf)).size).toBe(servers.length);
  });

  it('leaves the default project without a baseURL, so its fixture picks the slot server', () => {
    expect(config.use?.baseURL).toBeUndefined();
    expect(project('chromium')?.use?.baseURL).toBeUndefined();
  });

  it('runs the configured-providers spec against a server and database of its own', () => {
    const server = servers.find((entry) => portOf(entry.url) === CONFIGURED_PROVIDERS_PORT)!;

    expect(server).toBeDefined();
    expect(portOf(project('chromium-configured-providers')?.use?.baseURL)).toBe(
      CONFIGURED_PROVIDERS_PORT,
    );
    expect(databaseOf(server)).toBe('sorrel_e2e_providers');
    expect(server.env?.GOOGLE_CLIENT_ID).not.toBe('');
  });
});

describe('MB.112: every e2e server keeps its data cache in its own memory', () => {
  // The servers share one build directory, so a data cache flushed to disk
  // would hand one slot's cached reads to another slot's server.
  it('sets the flag on every server', () => {
    for (const server of servers) expect(server.env?.NEXT_ISR_FLUSH_TO_DISK).toBe('false');
  });

  it('is what next.config.ts turns the flag into', async () => {
    vi.stubEnv('NEXT_ISR_FLUSH_TO_DISK', 'false');
    const { default: e2e } = (await import(fromRoot('next.config.ts'))) as { default: NextConfig };
    expect(e2e.experimental?.isrFlushToDisk).toBe(false);
  });

  it("leaves Next's default everywhere else", async () => {
    vi.stubEnv('NEXT_ISR_FLUSH_TO_DISK', undefined);
    vi.stubEnv('NEXT_DATA_CACHE', undefined);
    const { default: other } = (await import(fromRoot('next.config.ts'))) as {
      default: NextConfig;
    };
    expect(other.experimental?.isrFlushToDisk).toBe(true);
    expect(other.cacheMaxMemorySize).toBeUndefined();
  });
});

describe('M8.6: one e2e server keeps a data cache, and only one', () => {
  const cacheServer = servers.find((server) => portOf(server.url) === COMPENDIUM_CACHE_PORT);

  // A slot's database is reseeded under its server between spec files, which
  // a cache held across the reseed would not follow.
  it('turns the data cache off on every slot server and the providers server', () => {
    const others = servers.filter((server) => server !== cacheServer);
    expect(others).toHaveLength(E2E_SLOTS + 1);
    for (const server of others) expect(server.env?.NEXT_DATA_CACHE).toBe('off');
  });

  it('runs the compendium-cache spec against a server that keeps it, on a database of its own', () => {
    expect(cacheServer).toBeDefined();
    expect(cacheServer?.env?.NEXT_DATA_CACHE).toBeUndefined();
    expect(databaseOf(cacheServer!)).toBe('sorrel_e2e_cache');
    expect(portOf(project('chromium-compendium-cache')?.use?.baseURL)).toBe(COMPENDIUM_CACHE_PORT);
  });

  it('is what next.config.ts turns the switch into', async () => {
    vi.stubEnv('NEXT_DATA_CACHE', 'off');
    const { default: e2e } = (await import(fromRoot('next.config.ts'))) as { default: NextConfig };
    expect(e2e.cacheMaxMemorySize).toBe(0);
  });
});
