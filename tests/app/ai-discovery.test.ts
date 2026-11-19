import { describe, expect, it } from 'vitest';
import { buildAiCatalog, buildLlmsTxt } from '@/app/ai-discovery';
import { describe as cut } from '@/lib/page-metadata';
import { PUBLIC_DOCUMENTS } from '@/lib/public-documents';
import { SITE_NAME, SITE_ORIGIN, siteUrl } from '@/lib/site';

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

describe('buildLlmsTxt', () => {
  const entries = [
    entry('Fixture Alpha', 'fixture-alpha', 'Fixtura alpha'),
    entry('Fixture Beta', 'fixture-beta'),
  ];

  it('opens with the site name as an H1, then a blockquote summary', () => {
    const lines = buildLlmsTxt(entries, []).split('\n');

    expect(lines[0]).toBe(`# ${SITE_NAME}`);
    expect(lines[1]).toBe('');
    expect(lines[2]).toMatch(/^> \S/);
  });

  it('links the compendium and one absolute page per entry as a list item', () => {
    const links = [...buildLlmsTxt(entries, []).matchAll(/^- \[([^\]]+)\]\((\S+?)\)/gm)].map(
      (match) => match.slice(1),
    );

    expect(links).toContainEqual(['Compendium', `${SITE_ORIGIN}/compendium`]);
    expect(links.filter(([, url]) => url.includes('/ingredients/'))).toEqual([
      ['Fixture Alpha (Fixtura alpha)', `${SITE_ORIGIN}/compendium/ingredients/fixture-alpha`],
      ['Fixture Beta', `${SITE_ORIGIN}/compendium/ingredients/fixture-beta`],
    ]);
  });

  it("adds an entry's description as the note after its link, and nothing when it has none", () => {
    const text = buildLlmsTxt(
      [
        entry('Fixture Alpha', 'fixture-alpha', null, 'A fixture herb.'),
        entry('Fixture Beta', 'fixture-beta'),
        entry('Fixture Gamma', 'fixture-gamma', null, '   '),
      ],
      [],
    );
    const line = (slug: string) =>
      text.split('\n').find((l) => l.includes(`/ingredients/${slug})`));

    expect(line('fixture-alpha')).toMatch(/\): A fixture herb\.$/);
    expect(line('fixture-beta')).toMatch(/\)$/);
    expect(line('fixture-gamma')).toMatch(/\)$/);
  });

  it('cuts a long description as the meta tag does, on one line', () => {
    const long = 'Fixture words that run on across several lines.\n'.repeat(20);
    const text = buildLlmsTxt([entry('Fixture Alpha', 'fixture-alpha', null, long)], []);
    const line = text.split('\n').find((l) => l.includes('/ingredients/fixture-alpha)'))!;

    expect(line.split('): ')[1]).toBe(cut(long));
    expect(line.endsWith('…')).toBe(true);
  });

  it('escapes brackets in a note so it cannot start a link', () => {
    const text = buildLlmsTxt(
      [entry('Fixture Alpha', 'fixture-alpha', null, 'See [other] herb')],
      [],
    );

    expect(text).toContain(String.raw`): See \[other\] herb`);
  });

  it('keeps a bracket in a name from ending its link text', () => {
    const text = buildLlmsTxt([entry('Fixture [Odd] Root', 'fixture-odd-root')], []);

    expect(text).toContain(String.raw`- [Fixture \[Odd\] Root](`);
  });

  it('has no heading before its first H2 other than the H1, and ends in a newline', () => {
    const text = buildLlmsTxt(entries, []);
    const beforeFirstH2 = text.split('\n## ')[0];

    expect(beforeFirstH2.match(/^#+ /gm)).toEqual(['# ']);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('is still a valid file with no entries', () => {
    const text = buildLlmsTxt([], []);

    expect(text.startsWith('# ')).toBe(true);
    expect(text).toContain(`${SITE_ORIGIN}/compendium)`);
  });
});

describe('buildLlmsTxt’s documents and help', () => {
  const help = [
    {
      path: '/help/testwort-guide',
      title: 'Testwort Guide',
      summary: 'How a fixture guide reads.',
    },
    { path: '/help/testwort-guide/testwort-step', title: 'Testwort Step', summary: null },
    { path: '/help/fixture-[odd]-page', title: 'Fixture [Odd] Page', summary: 'See [other] page' },
  ];
  const text = () => buildLlmsTxt([entry('Fixture Alpha', 'fixture-alpha')], help);
  const linkLines = (body: string) => body.split('\n').filter((line) => /^- \[/.test(line));
  /** The H2 a link to `url` sits under, or undefined when no list item links to it. */
  const sectionOf = (body: string, url: string) => {
    let heading: string | undefined;
    for (const line of body.split('\n')) {
      if (line.startsWith('## ')) heading = line;
      if (/^- \[/.test(line) && line.includes(`](${url})`)) return heading;
    }
    return undefined;
  };

  it('links About and each public document, absolute on the site’s origin and named by its title', () => {
    // Precondition: the shared list names documents, About among them.
    expect(PUBLIC_DOCUMENTS.map((document) => document.path)).toContain('/about');

    const body = text();
    for (const document of PUBLIC_DOCUMENTS) {
      const link = `- [${document.title}](${siteUrl(document.path)})`;
      expect(linkLines(body).some((line) => line.startsWith(link))).toBe(true);
    }
  });

  it('puts the documents in one section of their own, apart from the compendium and the optional links', () => {
    const body = text();
    const sections = new Set(
      PUBLIC_DOCUMENTS.map((document) => sectionOf(body, siteUrl(document.path))),
    );

    expect(PUBLIC_DOCUMENTS.length).toBeGreaterThan(0);
    expect(sections.size).toBe(1);
    const [documents] = [...sections];
    expect(documents).toBeDefined();
    expect(documents).not.toBe(sectionOf(body, siteUrl('/compendium')));
    expect(documents).not.toBe(sectionOf(body, siteUrl('/sitemap.xml')));
  });

  it('links the help index, the glossary and each article it is given, with the summary as the note', () => {
    const body = text();

    expect(sectionOf(body, siteUrl('/help'))).toBeDefined();
    expect(sectionOf(body, siteUrl('/help/glossary'))).toBeDefined();
    const line = (path: string) => linkLines(body).find((l) => l.includes(`](${siteUrl(path)})`));
    expect(line('/help/testwort-guide')).toBe(
      `- [Testwort Guide](${siteUrl('/help/testwort-guide')}): How a fixture guide reads.`,
    );
    expect(line('/help/testwort-guide/testwort-step')).toBe(
      `- [Testwort Step](${siteUrl('/help/testwort-guide/testwort-step')})`,
    );
    expect(line('/help/fixture-[odd]-page')).toContain(String.raw`- [Fixture \[Odd\] Page](`);
    expect(line('/help/fixture-[odd]-page')).toMatch(/\): See \\\[other\\\] page$/);
  });

  it('puts the help in one section of its own, apart from the documents, the compendium and the optional links', () => {
    const body = text();
    const sections = new Set(
      ['/help', '/help/glossary', ...help.map((article) => article.path)].map((path) =>
        sectionOf(body, siteUrl(path)),
      ),
    );

    expect(sections.size).toBe(1);
    const [helpSection] = [...sections];
    expect(helpSection).toBeDefined();
    expect(helpSection).not.toBe(sectionOf(body, siteUrl('/about')));
    expect(helpSection).not.toBe(sectionOf(body, siteUrl('/compendium')));
    expect(helpSection).not.toBe(sectionOf(body, siteUrl('/sitemap.xml')));
  });

  it('links nothing off the site’s own origin', () => {
    const urls = [...text().matchAll(/\]\((\S+?)\)(?=:|$)/gm)].map((match) => match[1]);

    expect(urls.length).toBeGreaterThan(help.length + PUBLIC_DOCUMENTS.length);
    for (const url of urls) expect(url.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
  });

  it('keeps the layout with documents and help in it: one H1, the summary, no heading before the first H2', () => {
    const body = text();

    expect(body.split('\n')[0]).toBe(`# ${SITE_NAME}`);
    expect(body.split('\n')[2]).toMatch(/^> \S/);
    expect(body.split('\n## ')[0].match(/^#+ /gm)).toEqual(['# ']);
    expect(body.match(/^# /gm)).toHaveLength(1);
    expect(body.endsWith('\n')).toBe(true);
  });
});

describe('buildAiCatalog', () => {
  it('stays one compendium entry, carrying two to five representative queries', () => {
    const catalog = buildAiCatalog([entry('Fixture Alpha', 'fixture-alpha')]);

    expect(catalog.entries.map((one) => one.url)).toEqual([`${SITE_ORIGIN}/compendium`]);
    const queries = catalog.entries[0].representativeQueries;
    expect(Array.isArray(queries)).toBe(true);
    expect(queries!.length).toBeGreaterThanOrEqual(2);
    expect(queries!.length).toBeLessThanOrEqual(5);
    for (const query of queries!) expect(query.trim()).not.toBe('');
    expect(new Set(queries).size).toBe(queries!.length);
  });

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
