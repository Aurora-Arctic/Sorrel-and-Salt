import { describe, expect, it } from 'vitest';

import {
  CLIENT_ONLY_PARAMS,
  MIGRATION_LOCK_TIMEOUT,
  withMigrationLockTimeout,
  withoutClientOnlyParams,
} from '../../src/db/connection-url';

const BASE = 'postgresql://testuser:testpass@ep-fixture-host-pooler.example.test/testdb';

describe('withoutClientOnlyParams', () => {
  it('removes every listed parameter at once and leaves the rest', () => {
    const query = CLIENT_ONLY_PARAMS.map((name) => `${name}=x`).join('&');
    const url = new URL(
      withoutClientOnlyParams(`${BASE}?${query}&sslmode=require&channel_binding=require`),
    );
    expect([...url.searchParams.keys()]).toEqual(['sslmode', 'channel_binding']);
  });

  it('keeps sslmode, channel_binding, application_name and options', () => {
    const input = `${BASE}?sslmode=require&application_name=fixture&options=-c%20search_path%3Dx&channel_binding=require`;
    const params = new URL(withoutClientOnlyParams(input)).searchParams;
    expect(params.get('sslmode')).toBe('require');
    expect(params.get('application_name')).toBe('fixture');
    expect(params.get('options')).toBe('-c search_path=x');
    expect(params.get('channel_binding')).toBe('require');
  });

  it('keeps the credentials, host and database', () => {
    const url = new URL(withoutClientOnlyParams(`${BASE}?gssencmode=disable`));
    expect(url.username).toBe('testuser');
    expect(url.password).toBe('testpass');
    expect(url.host).toBe('ep-fixture-host-pooler.example.test');
    expect(url.pathname).toBe('/testdb');
  });

  it('returns a URL with no query string unchanged', () => {
    expect(withoutClientOnlyParams(BASE)).toBe(BASE);
  });

  it('returns a URL with nothing to remove byte-for-byte unchanged', () => {
    const input = `${BASE}?sslmode=require&options=a%20b`;
    expect(withoutClientOnlyParams(input)).toBe(input);
  });

  it('returns an unparseable string unchanged', () => {
    expect(withoutClientOnlyParams('not a url')).toBe('not a url');
  });
});

describe('withMigrationLockTimeout', () => {
  it('sets the lock timeout as a startup option and keeps the rest of the URL', () => {
    const url = new URL(withMigrationLockTimeout(`${BASE}?sslmode=require`));
    expect(url.searchParams.get('options')).toBe(`-c lock_timeout=${MIGRATION_LOCK_TIMEOUT}`);
    expect(url.searchParams.get('sslmode')).toBe('require');
    expect(url.password).toBe('testpass');
  });

  it('adds the lock timeout after options the URL already carries', () => {
    const url = new URL(withMigrationLockTimeout(`${BASE}?options=endpoint%3Dep-fixture`));
    expect(url.searchParams.get('options')).toBe(
      `endpoint=ep-fixture -c lock_timeout=${MIGRATION_LOCK_TIMEOUT}`,
    );
  });
});
