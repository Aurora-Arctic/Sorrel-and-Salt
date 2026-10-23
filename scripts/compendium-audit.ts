#!/usr/bin/env node
// The compendium attribution audit (M14.11): ranks the citations whose source
// may describe another taxon than the entry's formal name, by four
// heuristics, and prints the table (claude-docs/db/compendium-seed/README.md,
// "The attribution audit"). `--report`, the default, writes nothing.
// `--apply`, run only after the owner has read the report, marks each
// flagged file `needs-review` and adds one Questions block per citation; a
// second run adds nothing.
//
// Usage: npm run compendium:audit -- [--report | --apply] [--all] [--wiki <dir>]... [--limit <n>]
//   --all     with --apply, also write the candidates that name no other formal name
//   --wiki    a folder of fetched `<Title>.wikitext` pages; repeatable. By default every
//             `shards/*/wiki` folder under the seed lanes' scratch folder.
//   --limit   print only the first n candidates of the table
import { homedir } from 'node:os';
import { join } from 'node:path';
import { formatReport } from '../src/db/seed/compendium/audit.ts';
import { readWikiPages, runAudit, shardWikiDirs } from '../src/db/seed/compendium/audit-run.ts';
import { COMPENDIUM_ROOT } from '../src/db/seed/compendium/load.ts';

/** Where the seed lanes fetched the Wikipedia pages: one `wiki` folder per shard. */
const SCRATCH_SHARDS = join(homedir(), '.claude/projects/-app/seed-scratch/shards');

const args = process.argv.slice(2);
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
