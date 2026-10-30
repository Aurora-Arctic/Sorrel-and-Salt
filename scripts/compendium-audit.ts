#!/usr/bin/env node
// The compendium attribution audit: ranks the citations whose source
// may describe another taxon than the entry's formal name, by four
// heuristics, and prints the table (claude-docs/db/compendium-seed/README.md,
// "The attribution audit"). `--report`, the default, writes nothing.
// `--apply`, run only after the curator has read the report, marks each
// flagged file `needs-review` and adds one Questions block per citation; a
// second run adds nothing.
//
// `--resolve` settles instead: a citation headed "X" becomes `resolved` when
// Wikipedia's page "X" is, or redirects to, the article the entry cites as
// `stated` for its own formal name (never a collision, a disambiguation page
// or another taxon's page). It reads the redirect answers from a local cache;
// `--fetch` first asks Wikipedia for the ones the cache lacks.
//
// Usage: npm run compendium:audit -- [--report | --apply | --resolve [--fetch] [--dry-run] [--cache <file>]] [--all] [--wiki <dir>]... [--limit <n>]
//   --all     with --apply, also write the candidates that name no other formal name
//   --wiki    a folder of fetched `<Title>.wikitext` pages; repeatable. By default every
//             `shards/*/wiki` folder under the seed lanes' scratch folder.
//   --limit   print only the first n candidates of the table
//   --resolve write `nameBasis: resolved`, `headedAs` and `resolvedBy` on each citation Wikipedia settles
//   --fetch   with --resolve, fetch the redirect answers the cache lacks (the only network use)
//   --dry-run with --resolve, write no file
//   --cache   the redirect cache, a JSON file outside git; by default wiki-lookups.json beside the shards
import { homedir } from 'node:os';
import { join } from 'node:path';
import { formatReport } from '../src/db/seed/compendium/audit.ts';
import { formatResolveReport, titlesToLookUp } from '../src/db/seed/compendium/audit-resolve.ts';
import {
  readWikiPages,
  runAudit,
  runResolve,
  shardWikiDirs,
} from '../src/db/seed/compendium/audit-run.ts';
import { COMPENDIUM_ROOT, loadCompendium } from '../src/db/seed/compendium/load.ts';
import {
  fetchLookups,
  readLookupCache,
  writeLookupCache,
} from '../src/db/seed/compendium/wiki-lookup.ts';

/** Where the seed lanes fetched the Wikipedia pages: one `wiki` folder per shard. */
const SCRATCH_SHARDS = join(homedir(), '.claude/projects/-app/seed-scratch/shards');

const SCRATCH_LOOKUPS = join(homedir(), '.claude/projects/-app/seed-scratch/wiki-lookups.json');

const args = process.argv.slice(2);
if (args.includes('--resolve')) {
  const cacheAt = args.indexOf('--cache');
  const cache = cacheAt === -1 ? SCRATCH_LOOKUPS : args[cacheAt + 1]!;
  const resolveWiki = readWikiPages(shardWikiDirs(SCRATCH_SHARDS));
  let lookup = readLookupCache(cache);
  if (args.includes('--fetch')) {
    const loaded = loadCompendium(COMPENDIUM_ROOT);
    lookup = await fetchLookups(titlesToLookUp(loaded, resolveWiki), lookup);
    writeLookupCache(cache, lookup);
  }
  const run = runResolve({
    root: COMPENDIUM_ROOT,
    lookup,
    wiki: resolveWiki,
    dryRun: args.includes('--dry-run'),
  });
  console.log(formatResolveReport(run));
  if (run.issues.length > 0) {
    console.error(`The resolve could not finish:\n- ${run.issues.join('\n- ')}`);
    process.exitCode = 1;
  }
  process.exit();
}

const apply = args.includes('--apply');
const includeUnnamed = args.includes('--all');
const wikiDirs = args.flatMap((arg, at) =>
  arg === '--wiki' && args[at + 1] ? [args[at + 1]!] : [],
);
const limitAt = args.indexOf('--limit');
const limit = limitAt === -1 ? Infinity : Number(args[limitAt + 1]);

const dirs = wikiDirs.length > 0 ? wikiDirs : shardWikiDirs(SCRATCH_SHARDS);
const wiki = readWikiPages(dirs);
if (wiki.size === 0) {
  console.warn(
    'No Wikipedia pages found: the hatnote and own-taxon checks read nothing. Pass --wiki <dir>.',
  );
}

const run = runAudit({
  root: COMPENDIUM_ROOT,
  wiki,
  mode: apply ? 'apply' : 'report',
  includeUnnamed,
});
console.log(formatReport(run.report, limit));
if (apply) {
  for (const path of run.changed) console.log(`wrote ${path}`);
  console.log(`${run.changed.length} file${run.changed.length === 1 ? '' : 's'} changed.`);
}
if (run.issues.length > 0) {
  console.error(`The audit could not finish:\n- ${run.issues.join('\n- ')}`);
  process.exitCode = 1;
}
