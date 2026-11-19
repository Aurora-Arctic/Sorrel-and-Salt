import fs from 'node:fs';

import { setOutput } from './lib/github-output.mjs';

// The one place the size limit is written: a pull request that changes more
// lines than this is labelled `oversized`, which asks for a stack.
const LIMIT = 400;

// Files that are rebuilt by a tool, so their lines say nothing about how much
// a reviewer has to read.
const EXCLUDED = [
  /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|[^/]*\.lock)$/,
  /^src\/gql\//,
  /^src\/graphql\/schema\.graphql$/,
  /^src\/db\/migrations\/meta\//,
];

const LABEL = 'oversized';

// Reads one JSON file object per line, as `gh api --paginate --jq '.[]'` prints them.
const files = fs
  .readFileSync(process.env.FILES_PATH, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const lines = files
  .filter((file) => !EXCLUDED.some((pattern) => pattern.test(file.filename)))
  .reduce((sum, file) => sum + file.additions + file.deletions, 0);

const labelled = JSON.parse(process.env.CURRENT_LABELS ?? '[]').includes(LABEL);
const oversized = lines > LIMIT;

setOutput('lines', String(lines));
setOutput('limit', String(LIMIT));
setOutput('label', LABEL);
setOutput('action', oversized && !labelled ? 'add' : !oversized && labelled ? 'remove' : 'none');
