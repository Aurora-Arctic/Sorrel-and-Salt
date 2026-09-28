#!/usr/bin/env node
// The board's calls in one file, so the lookup rule and the Project's field
// ids live here rather than in each skill that needs them. Every call is a
// `gh` invocation with an argument list — never a shell string, since a title
// or a comment is text the shell would otherwise interpret. The Project's own
// workflows place every tracked issue and set `Not Started` and `Done`; this
// file sets the two statuses between them and never adds an item
// (claude-docs/task-tracking.md, "Status").
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
// Issues — read through REST, one request per hundred against the core
// budget. The GraphQL listing carried every issue's labels and cost enough
// that two lookups in a minute tripped GitHub's secondary rate limit.

/** `M2.6 — `: the id plus the separator, so `M2.6` cannot match `M2.60 — …`. */
export const titlePrefix = (id) => `${id.toUpperCase()} — `;

export const matchesId = (title, id) => title.toUpperCase().startsWith(titlePrefix(id));

// REST spells state and reason in lower case; the skills and project-progress
// read the GraphQL spellings this script has always printed.
const STATES = { open: 'OPEN', closed: 'CLOSED' };
const STATE_REASONS = { completed: 'COMPLETED', not_planned: 'NOT_PLANNED', reopened: 'REOPENED' };

/** A REST issue in the shape the skills read. */
export const shapeIssue = (issue) => ({
  number: issue.number,
  title: issue.title,
  state: STATES[issue.state] ?? String(issue.state).toUpperCase(),
  stateReason: issue.state_reason
    ? (STATE_REASONS[issue.state_reason] ?? issue.state_reason.toUpperCase())
    : null,
  url: issue.html_url,
  milestone: issue.milestone?.title ?? null,
  labels: (issue.labels ?? []).map((label) => label.name),
});

/**
 * `--paginate --slurp` answers an array of pages. The issues endpoint lists
 * pull requests among issues, and a labelled one is not a task.
 */
export const shapeTracked = (pages) =>
  pages
    .flat()
    .filter((issue) => !issue.pull_request)
    .map(shapeIssue);

/** Every issue carrying the `tracked` label, open or closed. */
export function listTracked() {
  const endpoint = `repos/${REPO}/issues?labels=${TRACKED_LABEL}&state=all&per_page=100`;
  return shapeTracked(ghJson(['api', '--paginate', '--slurp', endpoint]));
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
// Project — one query for the issue's own item, never a listing of every
// item. It answers the item id, its Status and Estimate, and the Project's
// field and option ids, read on each run rather than hardcoded: an option
// recreated in the Project's settings gets a new id, and a stale constant
// would set nothing while reporting success.

const ITEM_QUERY = `
  query ($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      issue(number: $number) {
        projectItems(first: 10) {
          nodes {
            id
            project {
              id
              number
              fields(first: 30) {
                nodes {
                  ... on ProjectV2Field { id name }
                  ... on ProjectV2SingleSelectField { id name options { id name } }
                }
              }
            }
            status: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            estimate: fieldValueByName(name: "Estimate") {
              ... on ProjectV2ItemFieldNumberValue { number }
            }
          }
        }
      }
    }
  }`;

/** This Project's node among an issue's items, reshaped; null when there is none. */
export function shapeItem(nodes, number = PROJECT) {
  const node = nodes.find((candidate) => String(candidate.project.number) === String(number));
  if (!node) return null;
  return {
    id: node.id,
    projectId: node.project.id,
    // A field type the query does not spell out answers an empty node.
    fields: node.project.fields.nodes.filter((field) => field.name),
    status: node.status?.name ?? null,
    estimate: node.estimate?.number ?? null,
  };
}

/** The issue's item on the Project, or null when the auto-add has not placed it. One point. */
export function readItem(issue, number = PROJECT) {
  const [owner, name] = REPO.split('/');
  const query = ['-f', `query=${ITEM_QUERY}`, '-f', `owner=${owner}`, '-f', `name=${name}`];
  const data = ghJson(['api', 'graphql', ...query, '-F', `number=${issue.number}`]);
  return shapeItem(data.data.repository.issue.projectItems.nodes, number);
}

/**
 * The item, or a refusal. The Project's auto-add workflow places every
 * tracked issue moments after its creation, and nothing here adds one by
 * hand: an item the script added would be one the triage filter never saw.
 */
export function requireItem(issue, item = readItem(issue)) {
  if (item) return item;
  throw new BoardError(
    `#${issue.number} is not on the Project yet. Its auto-add workflow places a \`${TRACKED_LABEL}\` issue moments after creation; retry then.`,
  );
}

export function projectField(item, name) {
  const field = item.fields.find((candidate) => candidate.name === name);
  if (!field) throw new BoardError(`Project ${PROJECT} has no "${name}" field.`);
  return field;
}

function editItem(item, field, valueArgs) {
  const args = ['project', 'item-edit', '--id', item.id, '--project-id', item.projectId];
  gh([...args, '--field-id', field.id, ...valueArgs]);
}

/**
 * Moves Status forward. `Done` is the merge's — the Action closes the issue
 * and the Project's Item-closed workflow sets it — so it is refused unless
 * `force`, the migration's flag for tasks that were already done on Asana.
 * `item` is read unless given, so a refusal costs no query.
 */
export function setStatus(issue, target, { force = false, item } = {}) {
  if (!STATUSES.includes(target)) {
    throw new BoardError(`Unknown status "${target}"; one of: ${STATUSES.join(', ')}.`);
  }
  const current = item ?? requireItem(issue);
  const from = current.status;
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
  const field = projectField(current, 'Status');
  const option = field.options?.find((candidate) => candidate.name === target);
  if (!option) throw new BoardError(`The Status field has no "${target}" option.`);
  editItem(current, field, ['--single-select-option-id', option.id]);
  current.status = target;
  return { from, to: target, changed: true };
}

export function setEstimate(issue, hours, { item } = {}) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value < 0) {
    throw new BoardError(`An estimate is a number of hours, not "${hours}".`);
  }
  const current = item ?? requireItem(issue);
  const from = current.estimate;
  if (from === value) return { from, to: value, changed: false };
  editItem(current, projectField(current, 'Estimate'), ['--number', String(value)]);
  current.estimate = value;
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
  {
    name: 'connection string',
    pattern: /\bpostgres(?:ql)?:\/\/\S+/i,
    // The local Docker credential is checked in (Docker/docker-compose.yaml,
    // the CI workflows) and is what a dev-stack comment cites.
    reject: (match) => /^postgres(?:ql)?:\/\/sorrel:sorrel@/i.test(match),
  },
  { name: 'dashboard URL', pattern: /\b(?:[\w-]+\.)*(?:vercel\.com|console\.neon\.tech)\b\S*/i },
  {
    name: 'token prefix',
    pattern: /\b(?:sk_|re_|ghp_|github_pat_|xox[abp]-|AKIA)[A-Za-z0-9_-]{8,}/,
  },
  { name: 'bearer token', pattern: /\bBearer\s+[A-Za-z0-9._+/=-]{16,}/ },
  {
    name: 'token-like run',
    // No '/', '_' or '-', and both a digit and a letter: a file path, a URL
    // path, a branch name or a SCREAMING_CASE constant is the long run a comment
    // actually cites, and a token has none of those. A github.com or
    // app.asana.com link is blanked first; a bare git SHA is exactly 40 hex
    // characters and is what a PR body cites.
    pattern: /(?=[A-Za-z0-9+=]*\d)(?=[A-Za-z0-9+=]*[A-Za-z])[A-Za-z0-9+=]{40,}/,
    prepare: (text) => text.replace(KNOWN_URLS, ' '),
    reject: (match) => GIT_SHA.test(match),
  },
  {
    name: 'email address',
    // An alphabetic top-level label: `typescript@5.9.3` is a version, not an address.
    pattern: /\b[\w.+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/,
  },
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
    console.log(JSON.stringify({ ...issue, status: readItem(issue)?.status ?? null }, null, 2));
  },
  status([id, target]) {
    if (!id || !target) throw new BoardError(USAGE);
    const result = setStatus(findIssue(id), target);
    const note = result.changed ? '' : ' (already there)';
    console.log(`${id.toUpperCase()}: ${result.from ?? '(unset)'} → ${result.to}${note}`);
  },
  estimate([id, hours]) {
    if (!id || hours === undefined) throw new BoardError(USAGE);
    const result = setEstimate(findIssue(id), hours);
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
