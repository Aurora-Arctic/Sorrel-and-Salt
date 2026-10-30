#!/usr/bin/env node
// Marks one compendium entry file for update: writes `seedUpdate:
// <hash>` into its frontmatter, the hash of the file as it stands, so the
// next seed run applies the change. Refuses a file that is not `approved`.
//
// Usage: npm run seed:mark compendium/ingredients/<nomenclature>/<slug>.md
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { COMPENDIUM_ROOT } from '../src/db/seed/compendium/load.ts';
import { markFile } from '../src/db/seed/compendium/mark.ts';

const [given] = process.argv.slice(2);
if (given === undefined) {
  console.error('Usage: npm run seed:mark compendium/ingredients/<nomenclature>/<slug>.md');
  process.exit(2);
}
const absolute = resolve(given);
// The path as the loader names it, relative to the compendium root.
const path = relative(resolve(COMPENDIUM_ROOT), absolute).split(sep).join('/');
const before = readFileSync(absolute, 'utf8');
const result = markFile(path, before);
if ('issue' in result) {
  console.error(result.issue);
  process.exit(1);
}
if (result.text === before) {
  console.log(`${path} is already marked for update at ${result.hash}.`);
} else {
  writeFileSync(absolute, result.text);
  console.log(`Marked ${path} for update at ${result.hash}.`);
}
