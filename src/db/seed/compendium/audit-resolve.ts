import { parse } from 'yaml';
import type { CitationFields } from '../../../lib/types';
import type { SeedCompendiumFile } from '../types';
import {
  articleTitle,
  citationsOf,
  headingKey,
  isWikipedia,
  nameUses,
  readingsOf,
  pageNamesEntry,
  taxoboxTaxon,
  wikiKey,
} from './audit';
import type { LoadedCompendium } from './load';
import { WORKS } from './works';

// Resolving by Wikipedia (`--resolve`): a citation headed "X" in a source printing no formal name is `resolved` when Wikipedia's page "X"
// is, or redirects to, the article the entry cites as `stated` for its formal name. A disambiguation, genus or other species' page, no
// page, or a heading another entry uses as a name leaves it. Pure: lookups in, resolutions out (claude-docs/db/compendium-seed/README.md, "The attribution audit").

/** What Wikipedia says of a title: the page it lands on, or that it has none. */
export type PageInfo = { title: string; disambiguation?: boolean } | { missing: true };

/** Lookups by `wikiKey(requested title)`. */
export type PageLookup = ReadonlyMap<string, PageInfo>;

export type UnresolvedReason =
  | 'no-wikipedia-source'
  | 'no-heading'
  | 'collision'
  | 'not-looked-up'
  | 'no-page'
  | 'disambiguation'
  | 'other-page';

export interface Resolution {
  path: string;
  source: string;
  /** The citation's locator, which with the source finds it in the file. */
  locator?: string;
  headedAs: string;
  /** The entry's `stated` Wikipedia source whose article the heading lands on. */
  resolvedBy: string;
  citedOn: string[];
  /** The article both land on. */
  article: string;
}

export interface Unresolved {
  path: string;
  source: string;
  headedAs?: string;
  reason: UnresolvedReason;
}

export interface ResolveReport {
  resolutions: Resolution[];
  unresolved: Unresolved[];
}

type WikiPages = ReadonlyMap<string, string>;

type Sources = Readonly<Record<string, CitationFields>>;

const sourcesOf = (loaded: Pick<LoadedCompendium, 'sources'>): Sources => ({
  ...WORKS,
  ...loaded.sources,
});

/**
 * The Wikipedia sources a file holds for its own formal name: those cited as `stated`, and those whose fetched page's taxobox (or,
 * for a mineral or chemical, infobox and title: `pageNamesEntry`) names it, as the audit reports before a lane writes it.
 */
function ownArticles(file: SeedCompendiumFile, sources: Sources, wiki: WikiPages) {
  const found = new Map<string, string>();
  for (const { citation } of citationsOf(file)) {
    const source = sources[citation.source];
    if (!source || !isWikipedia(source)) continue;
    const title = articleTitle(source);
    const page = wiki.get(wikiKey(title));
    const taxon = page === undefined ? undefined : taxoboxTaxon(page);
    const named = taxon?.toLowerCase() === file.entry.canonicalName?.toLowerCase();
    const names = page !== undefined && pageNamesEntry(page, title, file.entry.canonicalName ?? '');
    if (citation.nameBasis === 'stated' || named || names) found.set(citation.source, title);
  }
  return found;
}

/** Each citation to settle: not yet `stated` or `resolved`, on an entry with a formal name. */
function pending(loaded: Pick<LoadedCompendium, 'files'>) {
  return loaded.files
    .filter((file) => file.entry.canonicalName)
    .flatMap((file) =>
      citationsOf(file)
        .filter(
          ({ citation }) => citation.nameBasis !== 'stated' && citation.nameBasis !== 'resolved',
        )
        .map((item) => ({ file, ...item })),
    );
}

/** Every title the resolution reads: each pending heading and each article an entry cites as its own. */
export function titlesToLookUp(
  loaded: Pick<LoadedCompendium, 'files' | 'sources'>,
  wiki: WikiPages = new Map(),
): string[] {
  const sources = sourcesOf(loaded);
  const titles = new Map<string, string>();
  for (const { file, citation, citedOn } of pending(loaded)) {
    const own = ownArticles(file, sources, wiki);
    if (own.size === 0) continue;
    for (const title of own.values()) titles.set(wikiKey(title), title.replace(/_/g, ' '));
    for (const reading of readingsOf(file, citation, citedOn, sources)) {
      if (reading.headedAs && !reading.workTitle)
        titles.set(wikiKey(reading.headedAs), reading.headedAs);
    }
  }
  return [...titles.values()];
}

/** Settles each pending citation against the lookups. */
export function resolveCitations(
  loaded: Pick<LoadedCompendium, 'files' | 'sources'>,
  lookup: PageLookup,
  wiki: WikiPages = new Map(),
): ResolveReport {
  const sources = sourcesOf(loaded);
  const uses = nameUses(loaded.files.filter((file) => file.entry.canonicalName));
  const resolutions: Resolution[] = [];
  const unresolved: Unresolved[] = [];

  for (const { file, citation, citedOn } of pending(loaded)) {
    const at = { path: file.path, source: citation.source };
    const own = new Map(
      [...ownArticles(file, sources, wiki)].filter(([handle]) => handle !== citation.source),
    );
    const readings = readingsOf(file, citation, citedOn, sources);
    const headings = readings.flatMap((reading) =>
      reading.headedAs && !reading.workTitle ? [reading.headedAs] : [],
    );
    if (own.size === 0) {
      unresolved.push({
        ...at,
        ...(headings[0] ? { headedAs: headings[0] } : {}),
        reason: 'no-wikipedia-source',
      });
      continue;
    }
    if (headings.length === 0 || headings.length < readings.length) {
      unresolved.push({ ...at, reason: 'no-heading' });
      continue;
    }

    const canonicalName = file.entry.canonicalName as string;
    const collides = headings.find((heading) =>
      (uses.get(headingKey(heading)) ?? []).some((use) => use.canonicalName !== canonicalName),
    );
    if (collides) {
      unresolved.push({ ...at, headedAs: collides, reason: 'collision' });
      continue;
    }

    const ownKeys = new Map<string, string>();
    for (const [handle, title] of own) {
      const info = lookup.get(wikiKey(title));
      const landing = info && 'title' in info ? info.title : title;
      if (!ownKeys.has(wikiKey(landing))) ownKeys.set(wikiKey(landing), handle);
    }

    let failed: Unresolved | undefined;
    let matched: { handle: string; article: string } | undefined;
    for (const heading of headings) {
      const info = lookup.get(wikiKey(heading));
      const reason: UnresolvedReason | undefined = !info
        ? 'not-looked-up'
        : 'missing' in info
          ? 'no-page'
          : info.disambiguation
            ? 'disambiguation'
            : !ownKeys.has(wikiKey(info.title))
              ? 'other-page'
              : undefined;
      if (reason) {
        failed = { ...at, headedAs: heading, reason };
        break;
      }
      const landed = (info as { title: string }).title;
      matched ??= { handle: ownKeys.get(wikiKey(landed))!, article: landed };
    }
    if (failed || !matched) {
      unresolved.push(failed ?? { ...at, reason: 'not-looked-up' });
      continue;
    }
    resolutions.push({
      ...at,
      ...(citation.locator === undefined ? {} : { locator: citation.locator }),
      headedAs: headings[0]!,
      resolvedBy: matched.handle,
      citedOn: [...new Set(readings.map((reading) => reading.citedOn))],
      article: matched.article,
    });
  }
  return { resolutions, unresolved };
}

export type ResolveApplyResult = { text: string; written: number } | { issue: string };

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/**
 * `text` with each resolution written: on the citation item with the same source and locator and a basis not yet settled, `nameBasis`
 * becomes `resolved`, with `headedAs` and `resolvedBy`. A text edit, so order, comments and prose survive; neither key is hashed.
 */
export function applyResolutions(
  path: string,
  text: string,
  resolutions: readonly Resolution[],
): ResolveApplyResult {
  const frontmatter = FRONTMATTER.exec(text);
  if (!frontmatter) return { issue: `${path} has no frontmatter.` };
  const lines = frontmatter[0].split('\n');
  const edited: string[] = [];
  const used = new Set<string>();
  const keyOf = (resolution: Resolution) => `${resolution.source}\u0000${resolution.locator ?? ''}`;
  let written = 0;

  for (let at = 0; at < lines.length; at++) {
    const line = lines[at]!;
    const start = /^(\s*)- source:\s/.exec(line);
    if (!start) {
      edited.push(line);
      continue;
    }
    const indent = start[1]!.length;
    let end = at + 1;
    while (end < lines.length) {
      const next = lines[end]!;
      const leading = next.length - next.trimStart().length;
      if (next.trim() !== '' && leading <= indent) break;
      end++;
    }
    const item = lines.slice(at, end);
    let parsed: { source?: string; locator?: string; nameBasis?: string } | undefined;
    try {
      const list: unknown = parse(item.map((row) => row.slice(indent)).join('\n'));
      parsed = Array.isArray(list) ? list[0] : undefined;
    } catch {
      parsed = undefined;
    }
    const match = parsed
      ? resolutions.find(
          (resolution) =>
            resolution.source === parsed.source &&
            resolution.locator === parsed.locator &&
            (parsed.nameBasis === 'unaudited' || parsed.nameBasis === 'unresolved'),
        )
      : undefined;
    const basis = item.findIndex((row) => /^\s*nameBasis:/.test(row));
    if (!match || basis === -1 || item.some((row) => /^\s*(headedAs|resolvedBy):/.test(row))) {
      edited.push(...item);
      at = end - 1;
      continue;
    }
    const pad = item[basis]!.match(/^\s*/)![0];
    const quote = (value: string) =>
      /^[A-Za-z][\w .'-]*$/.test(value) ? value : JSON.stringify(value);
    item.splice(
      basis,
      1,
      `${pad}nameBasis: resolved`,
      `${pad}headedAs: ${quote(match.headedAs)}`,
      `${pad}resolvedBy: ${match.resolvedBy}`,
    );
    used.add(keyOf(match));
    written++;
    edited.push(...item);
    at = end - 1;
  }

  const missing = resolutions.filter((resolution) => !used.has(keyOf(resolution)));
  if (missing.length > 0) {
    return {
      issue: `${path}: no citation to write ${missing.map((m) => m.source).join(', ')} onto.`,
    };
  }
  return { text: edited.join('\n') + text.slice(frontmatter[0].length), written };
}

/** A run's counts: citations resolved, and the rest by the reason they were not. */
export function formatResolveReport(run: ResolveReport & { changed: readonly string[] }): string {
  const reasons = new Map<UnresolvedReason, number>();
  for (const item of run.unresolved) reasons.set(item.reason, (reasons.get(item.reason) ?? 0) + 1);
  return [
    `${run.resolutions.length} citations resolved in ${run.changed.length} files.`,
    `${run.unresolved.length} not resolved:`,
    ...[...reasons].sort().map(([reason, count]) => `  ${reason}: ${count}`),
    '',
    ...run.resolutions.map(
      (r) =>
        `resolved ${r.path} ${r.source} under "${r.headedAs}" by ${r.resolvedBy} (${r.article})`,
    ),
    '',
  ].join('\n');
}
