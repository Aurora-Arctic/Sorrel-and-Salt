import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from '@/lib/security-headers';
import nextConfig from '../../next.config';

// What the browser is told on each path: every rule whose `source` matches the path contributes its
// headers. Next reads a source as path-to-regexp; the rules here are one regex group, which a RegExp reads too.
async function headersFor(path: string): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const applied: Record<string, string> = {};
  for (const rule of rules) {
    if (!new RegExp(`^${rule.source}$`).test(path)) continue;
    for (const { key, value } of rule.headers) applied[key.toLowerCase()] = value;
  }
  return applied;
}

describe('security headers', () => {
  it.each(['/', '/compendium', '/coven/some-coven', '/admin/people'])(
    '%s carries the page headers',
    async (path) => {
      const headers = await headersFor(path);
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    },
  );

  it('names its sources and allows neither a blanket source nor eval in production', () => {
    const policy = contentSecurityPolicy(false);
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).not.toMatch(/(^|[\s;])\*(\s|;|$)/);
    expect(policy).not.toContain('unsafe-eval');
  });

  it('allows eval only in development', () => {
    expect(contentSecurityPolicy(true)).toContain('unsafe-eval');
  });

  it('leaves HSTS to Vercel, which already sends it on the production domain', async () => {
    expect((await headersFor('/'))['strict-transport-security']).toBeUndefined();
  });

  it('sends the workshop none of them, as it keeps its own', async () => {
    for (const path of ['/workshop', '/workshop/index.html', '/workshop/assets/a.js']) {
      expect(await headersFor(path)).toEqual({});
    }
  });

  it('keeps the policy off API responses, which are not documents', async () => {
    const headers = await headersFor('/api/graphql');
    expect(headers['content-security-policy']).toBeUndefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
