import type { CitationFields } from '../../../lib/types';
import type {
  AuditCandidate,
  AuditHeuristic,
  AuditReport,
  AuditStated,
  SeedCitation,
  SeedCompendiumFile,
} from '../types';
import type { LoadedCompendium } from './load';
import { WORKS } from './works';

// The attribution audit: a read over every entry file that ranks the
// citations whose source may describe another taxon than the entry's formal
// name, for the curator to settle. It never decides a citation is wrong; it
// finds the ones worth reading first. Pure: the files, the sources and the
// fetched Wikipedia pages come in, a report goes out, and `audit-run.ts`
// does the reading and writing. Each heuristic is a reason to doubt, not
// proof, so a candidate carries the evidence a person checks it against
// (claude-docs/db/compendium-seed/README.md, "The attribution audit").

const TAXONOMIC = new Set(['botanical', 'fungal', 'zoological']);

/** The order a candidate's heuristics are listed in, so a report reads the same each run. */
const HEURISTIC_ORDER: readonly AuditHeuristic[] = ['collision', 'hatnote', 'no-binomial'];

/** What each heuristic adds to a candidate's rank: an alternative named counts for more than a heading that names none. */
const WEIGHT = { collision: 3, hatnote: 2, noBinomial: 1 } as const;

/** A Wikipedia page's title as the audit looks it up: case and underscores ignored. */
export function wikiKey(title: string): string {
  return title.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * A heading as the collision check compares it: accents, case and
 * punctuation dropped, and an inverted heading read in plain order, so
 * Grieve's "Poplar, trembling" meets a file named "Trembling Poplar".
 */
export function headingKey(heading: string): string {
  const parts = heading.split(',');
  const ordered = parts.length === 2 ? `${parts[1]} ${parts[0]}` : heading;
  return ordered
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Every `under "X"` a locator names, straight or curly quotes. */
function headingsIn(locator: string | undefined): string[] {
  if (!locator) return [];
  return [...locator.matchAll(/under\s+["“]([^"”]+)["”]/g)].map((match) => match[1]!.trim());
}

/** A source whose title is the page's own heading, rather than a whole work's name. */
const titleIsHeading = (source: CitationFields | undefined) =>
  source?.kind === 'entry' || source?.kind === 'web_page';

/** A source that is a Wikipedia article. */
export const isWikipedia = (source: CitationFields | undefined) =>
  source?.container === 'Wikipedia' || /\bwikipedia\.org\//.test(source?.url ?? '');

/** The article a Wikipedia source cites: the url's `title=` or `/wiki/` path, else the source's title. */
export function articleTitle(source: CitationFields): string {
  const url = source.url ?? '';
  const query = /[?&]title=([^&#]+)/.exec(url);
  const path = /\/wiki\/([^?#]+)/.exec(url);
  const raw = query?.[1] ?? path?.[1];
  return raw ? decodeURIComponent(raw) : source.title;
}

/** Wiki markup stripped from a value: italics, bold, and a link's target. */
function plain(value: string): string {
  return value
    .replace(/'{2,}/g, '')
    .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

interface Template {
  name: string;
  /** The text between the name and the closing braces, nested templates included. */
  body: string;
}

/** Every template on a page, nested ones too, each with its whole body. */
function templatesIn(text: string): Template[] {
  const found: Template[] = [];
  const opens: number[] = [];
  for (let at = 0; at < text.length - 1; at++) {
    if (text[at] === '{' && text[at + 1] === '{') {
      opens.push(at + 2);
      at++;
    } else if (text[at] === '}' && text[at + 1] === '}') {
      const start = opens.pop();
      if (start !== undefined) {
        const inner = text.slice(start, at);
        const bar = inner.indexOf('|');
        found.push({
          name: (bar === -1 ? inner : inner.slice(0, bar)).trim().toLowerCase(),
          body: bar === -1 ? '' : inner.slice(bar + 1),
        });
      }
      at++;
    }
  }
  return found;
}

/** A template's named parameters, `| key = value`, as plain text. */
function parametersOf(body: string): Map<string, string> {
  const parameters = new Map<string, string>();
  for (const part of body.split(/\n\s*\|/)) {
    const match = /^\s*\|?\s*([\w ]+?)\s*=\s*([\s\S]*)$/.exec(part);
    if (match) parameters.set(match[1]!.toLowerCase(), plain(match[2]!));
  }
  return parameters;
}

/** The taxon a page's taxobox names, or undefined when it has none the audit reads. */
export function taxoboxTaxon(page: string): string | undefined {
  for (const template of templatesIn(page)) {
    // Wikipedia spells a template name with spaces or underscores alike.
    if (
      !/^(speciesbox|subspeciesbox|automatic taxobox|taxobox)$/.test(
        template.name.replace(/_/g, ' ').trim(),
      )
    )
      continue;
    const parameters = parametersOf(template.body);
    // A genus can carry a disambiguator, "Actaea (plant)", which is no part of the name.
    const bare = (value: string | undefined) =>
      value
        ?.replace(/\s*\([^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const taxon = bare(parameters.get('taxon'));
    if (taxon) return taxon;
    const genus = bare(parameters.get('genus'));
    const species = parameters.get('species');
    if (genus && species) return `${genus} ${species}`;
  }
  return undefined;
}

/** A title or name as the own-article check compares it: no disambiguator, no case, one apostrophe. */
function nameKey(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Whether a Wikipedia page is the article on exactly the formal name given,
 * for a mineral or a chemical, which have no taxobox to say so.
 *
 * A plain name ("Iron", "Beryl") needs the page title, or its infobox's name,
 * to equal it, and the page to be a mineral, a chemical element or a chembox
 * compound: a rock ("Marble"), a group ("Garnet", "Tourmaline") and a page
 * with no infobox to say what it is do not count. A variety ("Quartz var.
 * amethyst") needs the page to be the variety's own article and its infobox,
 * or failing that its first sentence, to say it is a variety of the named
 * mineral. Anything less stays a doubt for a person to settle.
 */
export function pageNamesEntry(page: string, title: string, canonicalName: string): boolean {
  const templates = templatesIn(page);
  const kindOf = (name: string) => name.replace(/_/g, ' ').trim();
  const infobox = templates.find((template) =>
    /^(infobox mineral|chembox)$/.test(kindOf(template.name)),
  );
  const infoboxName = infobox ? parametersOf(infobox.body).get('name') : undefined;
  const firstLine = leadOf(page)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith("'''"));
  const sentence = firstLine ? plain(firstLine.split(/(?<=\.)\s/)[0]!) : '';
  const shortDescription = templates.find((template) => template.name === 'short description');
  const isNamed = (name: string) =>
    nameKey(title) === nameKey(name) ||
    (infoboxName ? nameKey(infoboxName) === nameKey(name) : false);

  const variety = /^(.+?) var\. (.+)$/i.exec(canonicalName);
  if (variety) {
    if (!isNamed(variety[2]!)) return false;
    const of = new RegExp(
      String.raw`\bvariety\b[^.]*\b${variety[1]!.replace(/[.*+?^${}()|[\]\\]/g, '\\/** The templates that point a reader at another subject: the hatnotes. */')}\b`,
      'i',
    );
    const status = templates
      .filter((template) => /^infobox mineral$/.test(kindOf(template.name)))
      .map((template) => parametersOf(template.body).get('imastatus') ?? '');
    return [...status, sentence].some((text) => of.test(text));
  }

  if (!isNamed(canonicalName)) return false;
  if (!infobox && !/\bchemical element\b/.test(sentence)) return false;
  const group =
    /\b(?:is|are) (?:a|an|the) group\b/i.test(sentence) ||
    /\bgroup\b/i.test(shortDescription?.body ?? '');
  return !group;
}

/** The templates that point a reader at another subject: the hatnotes. */
const HATNOTE = /^(about|for|for-multi|other uses\d*|redirect\w*|distinguish|see also)$/;

const BINOMIAL = String.raw`[A-Z][a-z]+ (?:× )?[a-z][a-z-]+`;

/**
 * The binomials `text` names, in order: any set in italics, and any linked or
 * bare whose genus the corpus holds, since a bare "Common ash" is not one.
 */
function taxaIn(text: string, genera: ReadonlySet<string>, bare: boolean): string[] {
  const found: { at: number; taxon: string }[] = [];
  for (const match of text.matchAll(
    new RegExp(String.raw`(?<!')''(?!')\[*(${BINOMIAL})(?:\|[^\]']*)?\]*(?<!')''(?!')`, 'g'),
  )) {
    found.push({ at: match.index, taxon: match[1]! });
  }
  for (const match of text.matchAll(
    new RegExp(String.raw`\[\[(${BINOMIAL})(?:\|[^\]]*)?\]\]`, 'g'),
  )) {
    if (genera.has(match[1]!.split(' ')[0]!)) found.push({ at: match.index, taxon: match[1]! });
  }
  if (bare) {
    for (const match of text.matchAll(
      new RegExp(String.raw`(?<=^|\|)\s*(${BINOMIAL})\s*(?=\||$)`, 'g'),
    )) {
      if (genera.has(match[1]!.split(' ')[0]!)) found.push({ at: match.index, taxon: match[1]! });
    }
  }
  return [...new Set(found.sort((a, b) => a.at - b.at).map((entry) => entry.taxon))];
}

/** The page's opening prose: its text before the first section heading, templates and references dropped. */
function leadOf(page: string): string {
  let lead = page.split(/^==/m)[0]!.replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '');
  // Innermost templates first, until none is left: a taxobox nests many.
  for (let before = ''; before !== lead;) {
    before = lead;
    lead = lead.replace(/\{\{[^{}]*\}\}/g, '');
  }
  return lead;
}

/**
 * The taxa a page's hatnotes name. A disambiguation page — one carrying a
 * disambiguation template, or whose opening says it "may refer to" — is read
 * by its list lines instead, since its whole body is the hatnote. An article
 * whose references happen to say "may refer to" is not one.
 */
function hatnoteTaxa(page: string, genera: ReadonlySet<string>): string[] {
  const templates = templatesIn(page);
  const disambiguation =
    /may (?:also )?refer to:/i.test(leadOf(page)) ||
    templates.some((template) =>
      /^(disambiguation|dab|disambig|hndis|set index article|plant common name)$/.test(
        template.name,
      ),
    );
  if (disambiguation) {
    const listed = page
      .split(/\r?\n/)
      .filter((line) => line.startsWith('*'))
      .join('\n');
    return taxaIn(listed, genera, false);
  }
  return [
    ...new Set(
      templates
        .filter((template) => HATNOTE.test(template.name))
        .flatMap((template) => taxaIn(template.body, genera, true)),
    ),
  ];
}

/** One citation as the audit reads it: where on the file, and under which heading. */
export interface Reading {
  file: SeedCompendiumFile;
  citation: SeedCitation<string>;
  citedOn: string;
  headedAs?: string;
  /** The heading is the work's title, the locator naming none. */
  workTitle: boolean;
}

/** Each heading a citation is read under: every `under "X"` in its locator, else the source's title. */
export function readingsOf(
  file: SeedCompendiumFile,
  citation: SeedCitation<string>,
  citedOn: string,
  sources: Readonly<Record<string, CitationFields>>,
): Reading[] {
  const headings = headingsIn(citation.locator);
  if (headings.length > 0) {
    return headings.map((headedAs) => ({ file, citation, citedOn, headedAs, workTitle: false }));
  }
  const source = sources[citation.source];
  return [
    {
      file,
      citation,
      citedOn,
      headedAs: source?.title,
      workTitle: !titleIsHeading(source),
    },
  ];
}

/** Every citation on a file, the entry's first, then each variant's under its form. */
export function citationsOf(
  file: SeedCompendiumFile,
): { citation: SeedCitation<string>; citedOn: string }[] {
  return [
    ...file.entry.references.map((citation) => ({ citation, citedOn: 'entry' })),
    ...file.entry.variants.flatMap((variant) =>
      variant.references.map((citation) => ({ citation, citedOn: variant.form })),
    ),
  ];
}

/** Where a name was found in the corpus, for a collision's evidence. */
export interface NameUse {
  canonicalName: string;
  path: string;
  field: string;
}

/**
 * Every name the corpus gives a formal name: each file's name and folk
 * names. Not the headings it is cited under, since a page cited for context
 * by many entries ("Incense") is a topic, not a name for any one of them.
 */
export function nameUses(files: readonly SeedCompendiumFile[]): Map<string, NameUse[]> {
  const uses = new Map<string, NameUse[]>();
  const add = (name: string, use: NameUse) => {
    const key = headingKey(name);
    if (!key) return;
    const list = uses.get(key) ?? [];
    if (!list.some((seen) => seen.canonicalName === use.canonicalName && seen.path === use.path)) {
      list.push(use);
    }
    uses.set(key, list);
  };
  for (const file of files) {
    const canonicalName = file.entry.canonicalName;
    if (!canonicalName) continue;
    add(file.entry.name, { canonicalName, path: file.path, field: 'name' });
    for (const folk of file.entry.folkNames ?? []) {
      add(folk, { canonicalName, path: file.path, field: 'folk name' });
    }
  }
  return uses;
}

/** Whether a heading prints a formal name: one the corpus holds, or a known genus and an epithet. */
function printsBinomial(
  heading: string,
  canonicalName: string,
  taxonomic: boolean,
  canonicalNames: readonly string[],
  genera: ReadonlySet<string>,
): boolean {
  const lower = heading.toLowerCase();
  if (!taxonomic) return lower.includes(canonicalName.toLowerCase());
  if (canonicalNames.some((name) => lower.includes(name.toLowerCase()))) return true;
  return [...heading.matchAll(/\b([A-Z][a-z]+) (?:× )?[a-z][a-z-]+/g)].some((match) =>
    genera.has(match[1]!),
  );
}

/**
 * The audit over a loaded compendium. `sources` defaults to the shared works
 * and the loaded per-entry files; `wiki` holds the fetched Wikipedia pages by
 * `wikiKey(title)`. Only a citation not yet `stated` or `resolved`, on an
 * entry with a formal name, is read.
 */
export function auditCompendium(
  loaded: Pick<LoadedCompendium, 'files' | 'sources'>,
  wiki: ReadonlyMap<string, string>,
  sources: Readonly<Record<string, CitationFields>> = { ...WORKS, ...loaded.sources },
): AuditReport {
  const named = loaded.files.filter((file) => file.entry.canonicalName);
  const canonicalNames = [...new Set(named.map((file) => file.entry.canonicalName as string))];
  const genera = new Set(
    named
      .filter((file) => TAXONOMIC.has(file.entry.nomenclature))
      .map((file) => (file.entry.canonicalName as string).split(' ')[0]!),
  );
  const uses = nameUses(named);

  const groups = new Map<string, Reading[]>();
  let citations = 0;
  for (const file of named) {
    for (const { citation, citedOn } of citationsOf(file)) {
      if (citation.nameBasis === 'stated' || citation.nameBasis === 'resolved') continue;
      citations++;
      for (const reading of readingsOf(file, citation, citedOn, sources)) {
        const key = [file.path, citation.source, reading.headedAs ?? ''].join('\u0000');
        groups.set(key, [...(groups.get(key) ?? []), reading]);
      }
    }
  }

  const candidates: AuditCandidate[] = [];
  const stated: AuditStated[] = [];
  for (const readings of groups.values()) {
    const { file, citation, headedAs, workTitle } = readings[0]!;
    const canonicalName = file.entry.canonicalName as string;
    const citedOn = [...new Set(readings.map((reading) => reading.citedOn))];
    const source = sources[citation.source];

    if (source && isWikipedia(source)) {
      const page = wiki.get(wikiKey(articleTitle(source)));
      const taxon = page === undefined ? undefined : taxoboxTaxon(page);
      if (taxon && taxon.toLowerCase() === canonicalName.toLowerCase()) {
        stated.push({ path: file.path, source: citation.source, citedOn, taxon });
        continue;
      }
      if (page !== undefined && pageNamesEntry(page, articleTitle(source), canonicalName)) {
        stated.push({ path: file.path, source: citation.source, citedOn, taxon: canonicalName });
        continue;
      }
    }

    const heuristics: AuditHeuristic[] = [];
    const evidence: string[] = [];
    let score = 0;

    const others = headedAs && !workTitle ? (uses.get(headingKey(headedAs)) ?? []) : [];
    const otherUses = others.filter((use) => use.canonicalName !== canonicalName);
    const collisionNames = [...new Set(otherUses.map((use) => use.canonicalName))].sort();
    if (collisionNames.length > 0) {
      heuristics.push('collision');
      score += WEIGHT.collision * collisionNames.length;
      for (const use of otherUses) {
        evidence.push(`"${headedAs}" is the ${use.field} of ${use.path} (${use.canonicalName}).`);
      }
    }

    const page = headedAs ? wiki.get(wikiKey(headedAs)) : undefined;
    const taxa =
      page === undefined
        ? []
        : hatnoteTaxa(page, genera).filter(
            (taxon) => taxon.toLowerCase() !== canonicalName.toLowerCase(),
          );
    if (taxa.length >= 2) {
      heuristics.push('hatnote');
      score += WEIGHT.hatnote * taxa.length;
      evidence.push(`The Wikipedia page "${headedAs}" points to ${taxa.join(', ')}.`);
    }

    const taxonomic = TAXONOMIC.has(file.entry.nomenclature);
    if (!headedAs || !printsBinomial(headedAs, canonicalName, taxonomic, canonicalNames, genera)) {
      heuristics.push('no-binomial');
      score += WEIGHT.noBinomial;
      evidence.push(
        !headedAs
          ? `The citation names no heading, and ${citation.source} has no title.`
          : workTitle
            ? `The locator names no heading; read as the work's title, "${headedAs}", which prints no formal name.`
            : `"${headedAs}" prints no formal name.`,
      );
    }

    if (heuristics.length === 0) continue;
    candidates.push({
      path: file.path,
      canonicalName,
      source: citation.source,
      ...(headedAs ? { headedAs } : {}),
      citedOn,
      heuristics: HEURISTIC_ORDER.filter((heuristic) => heuristics.includes(heuristic)),
      candidates: [...new Set([...collisionNames, ...taxa])],
      evidence,
      score,
    });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.path.localeCompare(b.path) ||
      a.source.localeCompare(b.source) ||
      (a.headedAs ?? '').localeCompare(b.headedAs ?? ''),
  );
  stated.sort((a, b) => a.path.localeCompare(b.path) || a.source.localeCompare(b.source));
  return { files: named.length, citations, candidates, stated };
}

/**
 * The candidates `--apply` writes: by default only those naming another
 * formal name, from a collision or a hatnote. A heading that merely prints no
 * formal name marks most of the corpus, so it is written only when asked.
 */
export function flaggedCandidates(
  report: AuditReport,
  options: { includeUnnamed?: boolean } = {},
): AuditCandidate[] {
  return report.candidates.filter(
    (candidate) => options.includeUnnamed || candidate.candidates.length > 0,
  );
}

/** The report as markdown: a summary, the ranked candidates, then the citations a taxobox states. */
export function formatReport(report: AuditReport, limit = Infinity): string {
  const count = (heuristic: AuditHeuristic) =>
    report.candidates.filter((candidate) => candidate.heuristics.includes(heuristic)).length;
  const lines = [
    `# Attribution audit`,
    '',
    `${report.files} files with a formal name; ${report.citations} citations not yet stated or resolved.`,
    `${report.candidates.length} candidates: ${count('collision')} by collision, ${count('hatnote')} by hatnote, ${count('no-binomial')} by no binomial; ${flaggedCandidates(report).length} name another formal name.`,
    `${report.stated.length} citations a Wikipedia taxobox states.`,
    '',
    '| Score | File | Source | Heading | Cited on | Heuristics | Other names |',
    '| ---: | --- | --- | --- | --- | --- | --- |',
  ];
  for (const candidate of report.candidates.slice(0, limit)) {
    lines.push(
      `| ${candidate.score} | ${candidate.path} | ${candidate.source} | ${candidate.headedAs ?? ''} | ${candidate.citedOn.join(', ')} | ${candidate.heuristics.join(', ')} | ${candidate.candidates.join(', ')} |`,
    );
  }
  if (report.candidates.length > limit) {
    lines.push('', `${report.candidates.length - limit} more not shown.`);
  }
  if (report.stated.length > 0) {
    lines.push(
      '',
      '## Stated by the taxobox',
      '',
      '| File | Source | Taxon |',
      '| --- | --- | --- |',
    );
    for (const entry of report.stated) {
      lines.push(`| ${entry.path} | ${entry.source} | ${entry.taxon} |`);
    }
  }
  return `${lines.join('\n')}\n`;
}
