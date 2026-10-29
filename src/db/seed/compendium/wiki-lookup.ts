import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { wikiKey } from './audit';
import type { PageInfo, PageLookup } from './audit-resolve';

// Wikipedia's answer to "what page does this title land on?" (`--resolve`): the MediaWiki API follows redirects and flags disambiguation
// pages, which a title alone cannot show. Answers are cached in one JSON file
// outside git, so the resolving run itself reads only local data and a second
// run asks nothing; only `--fetch` goes to the network.

const API = 'https://en.wikipedia.org/w/api.php';
/** The API takes at most 50 titles to a request. */
const BATCH = 50;

/** The shape of the API's reply that is read here. */
interface ApiReply {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: {
      title: string;
      missing?: boolean;
      invalid?: boolean;
      pageprops?: { disambiguation?: unknown };
    }[];
  };
}

export type Fetcher = (url: string) => Promise<ApiReply>;

const fetchJson: Fetcher = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'sorrel-and-salt-seed/1.0 (compendium audit)' },
  });
  if (!response.ok) throw new Error(`Wikipedia answered ${response.status}.`);
  return (await response.json()) as ApiReply;
};

/** The cache file as a lookup, empty when there is none. */
export function readLookupCache(path: string): Map<string, PageInfo> {
  if (!existsSync(path)) return new Map();
  return new Map(
    Object.entries(JSON.parse(readFileSync(path, 'utf8')) as Record<string, PageInfo>),
  );
}

/** Writes the lookup to the cache file, keys sorted so the file reads the same each run. */
export function writeLookupCache(path: string, lookup: PageLookup): void {
  mkdirSync(dirname(path), { recursive: true });
  const sorted = Object.fromEntries([...lookup].sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
}

/**
 * Asks Wikipedia about each of `titles` the cache lacks, and returns the
 * cache with the answers added. A title is followed through normalisation
 * and redirects to the page it lands on.
 */
export async function fetchLookups(
  titles: readonly string[],
  cache: ReadonlyMap<string, PageInfo>,
  fetcher: Fetcher = fetchJson,
): Promise<Map<string, PageInfo>> {
  const result = new Map(cache);
  const wanted = titles.filter((title) => !cache.has(wikiKey(title)));
  for (let at = 0; at < wanted.length; at += BATCH) {
    const batch = wanted.slice(at, at + BATCH);
    const url = `${API}?${new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      redirects: '1',
      prop: 'pageprops',
      ppprop: 'disambiguation',
      titles: batch.join('|'),
    })}`;
    const { query } = await fetcher(url);
    const normalised = new Map((query?.normalized ?? []).map((n) => [n.from, n.to]));
    const redirected = new Map((query?.redirects ?? []).map((r) => [r.from, r.to]));
    const pages = new Map((query?.pages ?? []).map((page) => [page.title, page]));
    for (const title of batch) {
      let landed = normalised.get(title) ?? title;
      // A redirect may point at another redirect only through a loop; one hop is what the API reports.
      landed = redirected.get(landed) ?? landed;
      const page = pages.get(landed);
      result.set(
        wikiKey(title),
        !page || page.missing || page.invalid
          ? { missing: true }
          : {
              title: page.title,
              ...(page.pageprops?.disambiguation !== undefined ? { disambiguation: true } : {}),
            },
      );
    }
  }
  return result;
}
