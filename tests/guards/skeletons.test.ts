import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// While a navigation is on its way, the shell draws the destination's own skeleton, chosen by its
// address from the registry in src/app/skeletons.ts. A page with no entry would wait on a bare page
// bar; an entry with no page is a skeleton nothing can reach. Each skeleton is a `skeleton.tsx` beside
// its page, or beside the layout that stays up while the page is on its way, so it draws that page's
// own components (claude-docs/design-decisions/m11.9-plan.md, Part 1).

const APP = join(REPO_ROOT, 'src/app');

/**
 * Pages with no registry entry on purpose. Each says why no skeleton is owed.
 * The root pages sit under the root layout alone, outside `(public)` and `(shell)`,
 * so no `MainBody` is mounted there to draw one.
 */
const EXEMPT: Record<string, string> = {
  'src/app/page.tsx': 'the root landing, outside every skeleton host',
  'src/app/sign-in/page.tsx': 'the sign-in form, outside every skeleton host',
  'src/app/forgot-password/page.tsx': 'an auth form with no data, outside every skeleton host',
  'src/app/reset-password/page.tsx': 'an auth form with no data, outside every skeleton host',
  'src/app/access-paused/page.tsx': 'a paused-account notice, outside every skeleton host',
  'src/app/invite/[token]/page.tsx': 'the invitation accept panel, outside every skeleton host',
  'src/app/i/[token]/page.tsx': 'the card accept panel, outside every skeleton host',
  'src/app/(unmatched)/[...missing]/page.tsx':
    'answers every unmatched address with the 404, so there is no data to wait on',
  'src/app/(public)/support/request/page.tsx':
    'reads its request in the browser from the link fragment, so the server render has no data to wait on',
};

/** A route group `(…)` or a slot `@…`: a folder that adds no segment to the address. */
const SILENT = /^(\(.*\)|@.*)$/;
const SLOT = /^@/;

/** Every `page.tsx` under src/app, as a path from the repo root. */
function pages(): string[] {
  return (readdirSync(APP, { recursive: true }) as string[])
    .filter((file) => file === 'page.tsx' || file.endsWith('/page.tsx'))
    .map((file) => relative(REPO_ROOT, join(APP, file)))
    .sort();
}

const segmentsOf = (file: string): string[] =>
  relative(APP, dirname(join(REPO_ROOT, file)))
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.');

/** The address shape a folder answers: its segments with groups and slots dropped. */
function patternOf(file: string): string {
  return `/${segmentsOf(file)
    .filter((segment) => !SILENT.test(segment))
    .join('/')}`;
}

const isSlotPage = (file: string): boolean => segmentsOf(file).some((s) => SLOT.test(s));

/** The page's own folder, then each folder above it that holds a layout, nearest first, short of src/app's top-level groups. */
function skeletonHomes(file: string): string[] {
  const segments = segmentsOf(file);
  const homes = [join(APP, ...segments)];
  for (let depth = segments.length - 1; depth >= 2; depth -= 1) {
    const folder = join(APP, ...segments.slice(0, depth));
    if (existsSync(join(folder, 'layout.tsx'))) homes.push(folder);
  }
  return homes;
}

type Host = 'main' | 'coven' | 'admin' | 'help';
const REGION = /<SectionBody\s+region="(coven|admin|help)"/;

/** The region a layout's source mounts, directly or through a component of `src/components` it draws. */
function regionIn(source: string): Host | null {
  const own = REGION.exec(source);
  if (own) return own[1] as Host;
  for (const [, name] of source.matchAll(/import \w+ from '@\/components\/(\w+)'/g)) {
    const component = join(REPO_ROOT, 'src/components', name!, 'index.tsx');
    const drawn = existsSync(component) && REGION.exec(readFileSync(component, 'utf8'));
    if (drawn) return drawn[1] as Host;
  }
  return null;
}

/** The host a page is drawn under: the region of the nearest layout above it that mounts a `SectionBody`, else `main`. */
function hostOf(file: string): Host {
  const segments = segmentsOf(file);
  for (let depth = segments.length; depth >= 1; depth -= 1) {
    const layout = join(APP, ...segments.slice(0, depth), 'layout.tsx');
    if (!existsSync(layout)) continue;
    const region = regionIn(readFileSync(layout, 'utf8'));
    if (region) return region;
  }
  return 'main';
}

describe('the skeleton registry', () => {
  const all = pages();
  const routed = all.filter((file) => !isSlotPage(file));
  const owed = routed.filter((file) => !(file in EXEMPT));

  it('scans the app, and its exemptions name real, routed pages', () => {
    // Preconditions: the scan reaches every kind of folder the patterns drop or keep.
    expect(all.length).toBeGreaterThan(60);
    expect(patternOf('src/app/(shell)/curator/(categories)/categories/page.tsx')).toBe(
      '/curator/categories',
    );
    expect(patternOf('src/app/(shell)/coven/[slug]/grimoire/[id]/page.tsx')).toBe(
      '/coven/[slug]/grimoire/[id]',
    );
    expect(patternOf('src/app/page.tsx')).toBe('/');
    expect(all).toContain('src/app/(shell)/coven/[slug]/(people)/@action/members/page.tsx');
    expect(isSlotPage('src/app/(shell)/coven/[slug]/(people)/@action/members/page.tsx')).toBe(true);
    // A slot page has the address of the page it sits beside, so that page's entry covers it.
    expect(routed.map(patternOf)).toContain('/coven/[slug]/members');
    // An exemption that names no page, or a slot page, is a stale line.
    for (const file of Object.keys(EXEMPT)) {
      expect(all, file).toContain(file);
      expect(isSlotPage(file), file).toBe(false);
    }
    // The root pages' reason holds: no layout between them and the root mounts a skeleton host.
    expect(existsSync(join(APP, 'layout.tsx'))).toBe(true);
    expect(readFileSync(join(APP, 'layout.tsx'), 'utf8')).not.toMatch(/MainBody|AppShell/);
  });

  it('has an entry for every page that loads data', async () => {
    const { skeletons } = await import('@/app/skeletons');
    const missing = owed.filter((file) => !(patternOf(file) in skeletons));
    expect(missing).toEqual([]);
  });

  it('names only pages that exist', async () => {
    const { skeletons } = await import('@/app/skeletons');
    const known = new Set(routed.map(patternOf));
    expect(Object.keys(skeletons).filter((pattern) => !known.has(pattern))).toEqual([]);
  });

  it('names no exempt page', async () => {
    const { skeletons } = await import('@/app/skeletons');
    const exempt = Object.keys(EXEMPT).map(patternOf);
    expect(Object.keys(skeletons).filter((pattern) => exempt.includes(pattern))).toEqual([]);
  });

  // The host is where the skeleton is drawn, so it must be the one the page's layouts mount.
  it("gives each entry the host the page's layouts mount", async () => {
    const { skeletons } = await import('@/app/skeletons');
    const wrong = owed
      .filter((file) => patternOf(file) in skeletons)
      .filter((file) => skeletons[patternOf(file) as keyof typeof skeletons].host !== hostOf(file))
      .map((file) => `${patternOf(file)}: ${hostOf(file)}`);

    // Preconditions: the hosts are each found where their layouts mount them.
    expect(hostOf('src/app/(shell)/coven/[slug]/ingredients/page.tsx')).toBe('coven');
    expect(hostOf('src/app/(shell)/keepers/(people)/users/page.tsx')).toBe('admin');
    expect(hostOf('src/app/(shell)/curator/compendium/page.tsx')).toBe('admin');
    expect(hostOf('src/app/(public)/help/search/page.tsx')).toBe('help');
    expect(hostOf('src/app/(shell)/help/staff/page.tsx')).toBe('main');
    expect(hostOf('src/app/(public)/compendium/page.tsx')).toBe('main');
    expect(hostOf('src/app/(shell)/coven/new/page.tsx')).toBe('main');
    expect(wrong).toEqual([]);
  });

  it("draws each entry's Skeleton from a skeleton.tsx beside its page or one of its layouts", async () => {
    const { skeletons } = await import('@/app/skeletons');
    const unhoused: string[] = [];
    for (const file of owed) {
      const entry = skeletons[patternOf(file) as keyof typeof skeletons];
      if (!entry) continue;
      let housed = false;
      for (const home of skeletonHomes(file)) {
        const candidate = join(home, 'skeleton.tsx');
        if (!existsSync(candidate)) continue;
        const exported = Object.values((await import(candidate)) as Record<string, unknown>);
        if (exported.includes(entry.Skeleton)) {
          housed = true;
          break;
        }
      }
      if (!housed) unhoused.push(file);
    }

    // Preconditions: a TabbedPage tab's homes reach its layout's folder, and stop short of the top-level group.
    const tab = 'src/app/(shell)/curator/(categories)/categories/page.tsx';
    expect(skeletonHomes(tab)).toContain(join(APP, '(shell)/curator/(categories)'));
    expect(skeletonHomes(tab)).not.toContain(join(APP, '(shell)'));
    expect(owed.length).toBeGreaterThan(30);
    expect(unhoused).toEqual([]);
  });
});
