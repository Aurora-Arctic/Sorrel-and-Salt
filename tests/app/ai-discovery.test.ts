import { describe, expect, it } from 'vitest';
import { buildAiCatalog, buildLlmsTxt } from '@/app/ai-discovery';
import { describe as cut } from '@/lib/page-metadata';
import { SITE_NAME, SITE_ORIGIN } from '@/lib/site';

// The two public files that describe the compendium to a crawler or an AI agent: llms.txt follows https://llmstxt.org/;
// the catalog follows the AI Catalog draft (https://ai-catalog.io/spec/) and ARD v0.91 (https://agenticresourcediscovery.org/spec) together.

const entry = (
  name: string,
  slug: string,
  canonicalName: string | null = null,
  description: string | null = null,
) => ({
  slug,
  name,
  canonicalName,
  description,
  lastModified: new Date('2026-03-01T00:00:00Z'),
});

describe('M12.2: buildLlmsTxt', () => {
  const entries = [
    entry('Fixture Alpha', 'fixture-alpha', 'Fixtura alpha'),
    entry('Fixture Beta', 'fixture-beta'),
  ];

  it('opens with the site name as an H1, then a blockquote summary', () => {
    const lines = buildLlmsTxt(entries).split('\n');

    expect(lines[0]).toBe(`# ${SITE_NAME}`);
    expect(lines[1]).toBe('');
    expect(lines[2]).toMatch(/^> \S/);
  });

  it('links the compendium and one absolute page per entry as a list item', () => {
    const links = [...buildLlmsTxt(entries).matchAll(/^- \[([^\]]+)\]\((\S+?)\)/gm)].map((match) =>
      match.slice(1),
    );

    expect(links).toContainEqual(['Compendium', `${SITE_ORIGIN}/compendium`]);
    expect(links.filter(([, url]) => url.includes('/ingredients/'))).toEqual([
      ['Fixture Alpha (Fixtura alpha)', `${SITE_ORIGIN}/compendium/ingredients/fixture-alpha`],
      ['Fixture Beta', `${SITE_ORIGIN}/compendium/ingredients/fixture-beta`],
    ]);
  });

  it("adds an entry's description as the note after its link, and nothing when it has none", () => {
    const text = buildLlmsTxt([
      entry('Fixture Alpha', 'fixture-alpha', null, 'A fixture herb.'),
      entry('Fixture Beta', 'fixture-beta'),
      entry('Fixture Gamma', 'fixture-gamma', null, '   '),
    ]);
    const line = (slug: string) =>
      text.split('\n').find((l) => l.includes(`/ingredients/${slug})`));

    expect(line('fixture-alpha')).toMatch(/\): A fixture herb\.$/);
    expect(line('fixture-beta')).toMatch(/\)$/);
    expect(line('fixture-gamma')).toMatch(/\)$/);
  });

  it('cuts a long description as the meta tag does, on one line', () => {
    const long = 'Fixture words that run on across several lines.\n'.repeat(20);
    const text = buildLlmsTxt([entry('Fixture Alpha', 'fixture-alpha', null, long)]);
    const line = text.split('\n').find((l) => l.includes('/ingredients/fixture-alpha)'))!;

    expect(line.split('): ')[1]).toBe(cut(long));
    expect(line.endsWith('…')).toBe(true);
  });

  it('escapes brackets in a note so it cannot start a link', () => {
    const text = buildLlmsTxt([entry('Fixture Alpha', 'fixture-alpha', null, 'See [other] herb')]);

    expect(text).toContain(String.raw`): See \[other\] herb`);
  });

  it('keeps a bracket in a name from ending its link text', () => {
    const text = buildLlmsTxt([entry('Fixture [Odd] Root', 'fixture-odd-root')]);

    expect(text).toContain(String.raw`- [Fixture \[Odd\] Root](`);
  });

  it('has no heading before its first H2 other than the H1, and ends in a newline', () => {
    const text = buildLlmsTxt(entries);
    const beforeFirstH2 = text.split('\n## ')[0];

    expect(beforeFirstH2.match(/^#+ /gm)).toEqual(['# ']);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('is still a valid file with no entries', () => {
    const text = buildLlmsTxt([]);

    expect(text.startsWith('# ')).toBe(true);
    expect(text).toContain(`${SITE_ORIGIN}/compendium)`);
  });
});

describe('M12.2: buildAiCatalog', () => {
  it('carries the required fields of the AI Catalog draft and of ARD', () => {
    const catalog = buildAiCatalog([entry('Fixture Alpha', 'fixture-alpha')]);

    expect(catalog.specVersion).toMatch(/^\d+\.\d+$/);
    expect(catalog.host.displayName).toBe(SITE_NAME);
    expect(catalog.entries).toHaveLength(1);
    expect(catalog.entries[0]).toMatchObject({
      identifier: expect.stringMatching(/^urn:air:[^:]+:[^:]+:[^:]+$/),
      displayName: expect.any(String),
      type: 'text/html',
      url: `${SITE_ORIGIN}/compendium`,
    });
    expect(catalog.entries[0]).not.toHaveProperty('data');
  });

  it('dates the entry by the latest change among the compendium entries', () => {
    const catalog = buildAiCatalog([
      entry('Fixture Alpha', 'a'),
      { ...entry('Fixture Beta', 'b'), lastModified: new Date('2026-05-02T10:00:00Z') },
    ]);

    expect(catalog.entries[0].updatedAt).toBe('2026-05-02T10:00:00.000Z');
  });

  it('leaves the date out when there are no entries', () => {
    expect(buildAiCatalog([]).entries[0]).not.toHaveProperty('updatedAt');
  });
});
