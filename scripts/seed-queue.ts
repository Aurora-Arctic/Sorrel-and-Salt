#!/usr/bin/env node
// Lists the compendium entry files marked `status: needs-review`; exits 1 when the loader could not read a
// file.
// Usage: npm run seed:queue
import { loadCompendium } from '../src/db/seed/compendium/load.ts';

const loaded = loadCompendium();
const queue = loaded.files.filter((file) => file.status === 'needs-review');
for (const file of queue) console.log(file.path);
console.log(`${queue.length} file${queue.length === 1 ? '' : 's'} need review.`);
if (loaded.issues.length > 0) {
  console.error(
    `The loader could not read ${loaded.issues.length} file(s):\n- ${loaded.issues.join('\n- ')}`,
  );
  process.exitCode = 1;
}
