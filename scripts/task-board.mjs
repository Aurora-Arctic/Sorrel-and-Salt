#!/usr/bin/env node
// The board's calls in one file, so the lookup rule and the Project's field
// ids live here rather than in each skill that needs them. Every call is a
// `gh` invocation with an argument list — never a shell string, since a title
// or a comment is text the shell would otherwise interpret.
// claude-docs/task-tracking.md
//
// usage: node scripts/task-board.mjs <find|status|estimate|comment|list> …

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const REPO = 'Aurora-Arctic/Sorrel-and-Salt';
export const OWNER = 'Aurora-Arctic';
export const PROJECT = '1';
export const STATUSES = ['Not Started', 'In Progress', 'In Review', 'Done'];
export const TRACKED_LABEL = 'tracked';

const ISSUE_FIELDS = 'number,title,state,stateReason,url,milestone,labels';

/** A refusal or a `gh` failure: printed as one line, never as a stack. */
export class BoardError extends Error {}

/** Runs `gh` with an argument list; a failure surfaces gh's own stderr. */
export function gh(args, { input } = {}) {
  try {
    return execFileSync('gh', args, {
      encoding: 'utf8',
      input: input ?? '',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const stderr = String(error.stderr ?? '').trim();
    throw new BoardError(stderr || error.message, { cause: error });
  }
}

export const ghJson = (args, options) => JSON.parse(gh(args, options));

// ---------------------------------------------------------------------------
// Issues

/** `M2.6 — `: the id plus the separator, so `M2.6` cannot match `M2.60 — …`. */
export const titlePrefix = (id) => `${id.toUpperCase()} — `;

export const matchesId = (title, id) => title.toUpperCase().startsWith(titlePrefix(id));

const shapeIssue = (issue) => ({
  number: issue.number,
  title: issue.title,
  state: issue.state,
  stateReason: issue.stateReason ?? null,
  url: issue.url,
  milestone: issue.milestone?.title ?? null,
  labels: (issue.labels ?? []).map((label) => label.name),
});

/** Every issue carrying the `tracked` label, open or closed. */
export function listTracked() {
  const args = ['issue', 'list', '--repo', REPO, '--state', 'all', '--limit', '1000'];
  return ghJson([...args, '--label', TRACKED_LABEL, '--json', ISSUE_FIELDS]).map(shapeIssue);
}

/** The one tracked issue titled `<id> — …`; zero or several is a refusal, never a guess. */
export function findIssue(id, issues = listTracked()) {
  const matches = issues.filter((issue) => matchesId(issue.title, id));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new BoardError(`No tracked issue is titled "${titlePrefix(id)}…" in ${REPO}.`);
  }
  const list = matches.map((issue) => `#${issue.number}`).join(', ');
  throw new BoardError(
    `${matches.length} tracked issues are titled "${titlePrefix(id)}…": ${list}.`,
  );
}

// ---------------------------------------------------------------------------
// Project

/** The Project's node id, its fields and every item, read once per run. */
export function loadProject(number = PROJECT) {
  const scope = [number, '--owner', OWNER, '--format', 'json'];
  return {
    number,
    id: ghJson(['project', 'view', ...scope]).id,
    fields: ghJson(['project', 'field-list', ...scope]).fields,
    items: ghJson(['project', 'item-list', ...scope, '--limit', '1000']).items,
  };
}

export function projectField(project, name) {
  const field = project.fields.find((candidate) => candidate.name === name);
  if (!field) throw new BoardError(`Project ${project.number} has no "${name}" field.`);
  return field;
}

/** item-list keys a field's value by the lower-camel form of its name: `status`, `estimate`. */
const fieldKey = (name) =>
  name
    .split(/\s+/)
    .map((word, i) => (i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1)))
    .join('');

export const itemFor = (project, issue) =>
  project.items.find((item) => item.content?.url === issue.url) ?? null;

/** A field's value on an item, null when unset or when there is no item. */
export const itemValue = (item, fieldName) => item?.[fieldKey(fieldName)] ?? null;

/** The issue's Project item, added when absent. */
export function ensureItem(project, issue) {
  const existing = itemFor(project, issue);
  if (existing) return existing;
  const scope = [project.number, '--owner', OWNER, '--format', 'json'];
  const added = ghJson(['project', 'item-add', ...scope, '--url', issue.url]);
  const item = { id: added.id, content: { url: issue.url, number: issue.number } };
  project.items.push(item);
  return item;
}

function editItem(project, item, field, valueArgs) {
  const args = ['project', 'item-edit', '--id', item.id, '--project-id', project.id];
  gh([...args, '--field-id', field.id, ...valueArgs]);
}

/**
 * Moves Status forward. `Done` is the merge's (the Action sets it through the
 * issue closing), so it is refused unless `force` — the migration's flag for
 * tasks that were already done on Asana.
 */
export function setStatus(project, issue, target, { force = false } = {}) {
  if (!STATUSES.includes(target)) {
    throw new BoardError(`Unknown status "${target}"; one of: ${STATUSES.join(', ')}.`);
  }
  const field = projectField(project, 'Status');
  const item = ensureItem(project, issue);
  const from = item[fieldKey(field.name)] ?? null;
  if (from === target) return { from, to: target, changed: false };
  if (target === 'Done' && !force) {
    throw new BoardError(
      'Done is set by the merge, never by hand: a PR body naming `Closes #N` closes the issue on merge and the Project moves it.',
    );
  }
  if (from !== null && STATUSES.indexOf(target) < STATUSES.indexOf(from)) {
    throw new BoardError(
      `Status moves forward only: "${from}" → "${target}" is a step back. A PR closed without merging goes back to "In Progress" by hand and nothing else.`,
    );
  }
  const option = field.options?.find((candidate) => candidate.name === target);
  if (!option) throw new BoardError(`The Status field has no "${target}" option.`);
  editItem(project, item, field, ['--single-select-option-id', option.id]);
  item[fieldKey(field.name)] = target;
  return { from, to: target, changed: true };
}

export function setEstimate(project, issue, hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value < 0) {
    throw new BoardError(`An estimate is a number of hours, not "${hours}".`);
  }
  const field = projectField(project, 'Estimate');
  const item = ensureItem(project, issue);
  const from = item[fieldKey(field.name)] ?? null;
  if (from === value) return { from, to: value, changed: false };
  editItem(project, item, field, ['--number', String(value)]);
  item[fieldKey(field.name)] = value;
  return { from, to: value, changed: true };
}

// ---------------------------------------------------------------------------
// Comments

// A comment is public and indexed before anyone reads it, so a comment is
// refused when it looks like it carries a value rather than a name. The rule
// is names, never values; these are the shapes a pasted value tends to take.
const KNOWN_URLS = /https?:\/\/(?:www\.)?(?:github\.com|app\.asana\.com)\/\S*/g;
const GIT_SHA = /^[0-9a-f]{40}$/i;

export const SECRET_PATTERNS = [
  { name: 'connection string', pattern: /\bpostgres(?:ql)?:\/\/\S+/i },
  { name: 'dashboard URL', pattern: /\b(?:[\w-]+\.)*(?:vercel\.com|console\.neon\.tech)\b\S*/i },
  {
    name: 'token prefix',
    pattern: /\b(?:sk_|re_|ghp_|github_pat_|xox[abp]-|AKIA)[A-Za-z0-9_-]{8,}/,
  },
  { name: 'bearer token', pattern: /\bBearer\s+[A-Za-z0-9._+/=-]{16,}/ },
  {
    name: 'token-like run',
    pattern: /[A-Za-z0-9+/=_-]{40,}/,
    // A github.com or app.asana.com link is long and harmless; a bare git SHA
    // is exactly 40 hex characters and is what a PR body cites.
    prepare: (text) => text.replace(KNOWN_URLS, ' '),
    reject: (match) => GIT_SHA.test(match),
  },
  { name: 'email address', pattern: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/ },
];

/** The first pattern the text trips, as `{ name, match }`, or null. */
export function findSecret(text) {
  for (const { name, pattern, prepare, reject } of SECRET_PATTERNS) {
    const subject = prepare ? prepare(text) : text;
    const global = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    );
    for (const match of subject.matchAll(global)) {
      if (!reject || !reject(match[0])) return { name, match: match[0] };
    }
  }
  return null;
}

export function postComment(issue, text) {
  const hit = findSecret(text);
  if (hit) {
    throw new BoardError(
      `Refused: the comment looks like it carries a ${hit.name}. A comment names an env var, a file or a provider and never carries a value.`,
    );
  }
  gh(['issue', 'comment', String(issue.number), '--repo', REPO, '--body-file', '-'], {
    input: text,
  });
}

// ---------------------------------------------------------------------------
// CLI

const USAGE = `usage: node scripts/task-board.mjs <command> …

  find <ID>                  the tracked issue titled "<ID> — …", as JSON
  status <ID> "<Status>"     move the Project Status forward (${STATUSES.join(' → ')})
  estimate <ID> <hours>      set the Project Estimate
  comment <ID> "<text>"      comment on the issue; refused if the text looks like a value
  list                       every tracked issue, as a JSON array`;

const COMMANDS = {
  find([id]) {
    if (!id) throw new BoardError(USAGE);
    const issue = findIssue(id);
    const project = loadProject();
    const item = itemFor(project, issue);
    const status = item?.[fieldKey(projectField(project, 'Status').name)] ?? null;
    console.log(JSON.stringify({ ...issue, status }, null, 2));
  },
  status([id, target]) {
    if (!id || !target) throw new BoardError(USAGE);
    const result = setStatus(loadProject(), findIssue(id), target);
    const note = result.changed ? '' : ' (already there)';
    console.log(`${id.toUpperCase()}: ${result.from ?? '(unset)'} → ${result.to}${note}`);
  },
  estimate([id, hours]) {
    if (!id || hours === undefined) throw new BoardError(USAGE);
    const result = setEstimate(loadProject(), findIssue(id), hours);
    const note = result.changed ? '' : ' (already there)';
    console.log(`${id.toUpperCase()}: ${result.from ?? '(unset)'} → ${result.to}h${note}`);
  },
  comment([id, text]) {
    if (!id || !text) throw new BoardError(USAGE);
    const issue = findIssue(id);
    postComment(issue, text);
    console.log(`${id.toUpperCase()}: commented on #${issue.number}`);
  },
  list() {
    console.log(JSON.stringify(listTracked(), null, 2));
  },
};

export function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const run = COMMANDS[command];
  if (!run) throw new BoardError(USAGE);
  run(rest);
}

// Runs the CLI only when invoked directly; the migration imports the helpers.
const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    if (error instanceof BoardError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}
