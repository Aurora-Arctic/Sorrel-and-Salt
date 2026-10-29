#!/usr/bin/env node
// Lists the compendium entry files marked `status: needs-review`: the
// owner's queue, each with its Questions for the Curator to settle. Exits 1
// when the loader could not read a file, since a queue that leaves one out is
// wrong, and 0 otherwise, an empty queue included.
//
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
