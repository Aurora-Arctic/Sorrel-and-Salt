#!/usr/bin/env node
// The board's calls in one file, so the lookup rule and the Project's field
// ids live here rather than in each skill that needs them. Every call is a
// `gh` invocation with an argument list — never a shell string, since a title
// or a comment is text the shell would otherwise interpret. The Project's own
// workflows place every tracked issue and set `Not Started` and `Done`; this
// file sets the two statuses between them and never adds an item
// (claude-docs/task-tracking.md, "Status").
//
// usage: node scripts/task-board.mjs <find|status|estimate|comment|list|reorder> …

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { ID, expandIds, loadTasksMd } from './tasks-md.mjs';

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
// Order — the Project's manual item order is execution order: TASKS.md's wave
// table, wave by wave. `reorder` reads the order with the leanest requests
// there are, plans the fewest moves that restore it, and makes them one paced
// mutation at a time (claude-docs/task-tracking.md, "Order").

/** `M2.6` off `M2.6 — Title`, or null for a title that does not open with an id. */
export const idOf = (title) => new RegExp(String.raw`^(${ID}) — `).exec(title)?.[1] ?? null;

/** A REST milestone: the open count is what decides that a wave is done. */
export const shapeMilestone = (milestone) => ({
  number: milestone.number,
  title: milestone.title,
  state: milestone.state,
  openIssues: milestone.open_issues,
  closedIssues: milestone.closed_issues,
  description: milestone.description ?? '',
});

/** Every milestone, open or closed. One REST page. */
export function listMilestones() {
  const endpoint = `repos/${REPO}/milestones?state=all&per_page=100`;
  return ghJson(['api', '--paginate', '--slurp', endpoint]).flat().map(shapeMilestone);
}

// Position is observable only as listing order, so this is the one listing
// the script makes. It asks each item for its id and its issue number and
// nests no connection, which the cost formula prices at a page's minimum;
// the listing that tripped the secondary limit (`gh project item-list`)
// asked every item for every field value.
const ITEMS_QUERY = `
  query ($owner: String!, $number: Int!, $endCursor: String) {
    organization(login: $owner) {
      projectV2(number: $number) {
        id
        items(first: 100, after: $endCursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            content { ... on Issue { number } }
          }
        }
      }
    }
  }`;

/** The pages of `ITEMS_QUERY` flattened in position order; a draft or a pull request has no number. */
export function shapeItems(pages) {
  const projects = pages.map((page) => page.data.organization.projectV2);
  return {
    projectId: projects[0]?.id ?? null,
    items: projects.flatMap((project) =>
      project.items.nodes.map((node) => ({ id: node.id, number: node.content?.number ?? null })),
    ),
  };
}

export function listItems(number = PROJECT) {
  const args = ['-f', `query=${ITEMS_QUERY}`, '-f', `owner=${OWNER}`, '-F', `number=${number}`];
  return shapeItems(ghJson(['api', 'graphql', '--paginate', '--slurp', ...args]));
}

/** Indices of one longest strictly increasing subsequence (patience sorting). */
function longestIncreasing(values) {
  const tails = [];
  const tailIndex = [];
  const previous = Array.from({ length: values.length }, () => -1);
  for (let i = 0; i < values.length; i++) {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (tails[mid] < values[i]) low = mid + 1;
      else high = mid;
    }
    tails[low] = values[i];
    tailIndex[low] = i;
    previous[i] = low > 0 ? tailIndex[low - 1] : -1;
  }
  const kept = [];
  for (let i = tailIndex[tails.length - 1] ?? -1; i >= 0; i = previous[i]) kept.push(i);
  return kept.reverse();
}

/**
 * The fewest moves that put `target` (in target order, each with its current
 * position) into that order. The first entry is the anchor and never moves;
 * behind it the longest run already in order stays, and each other entry is
 * moved after its predecessor. Processing in target order makes a predecessor
 * final before its follower is placed, and no move is ever "to the top", so
 * nothing climbs above the items the plan leaves alone.
 */
export function planMoves(target) {
  if (target.length < 2) return [];
  const anchor = target[0].position;
  const behind = target.map((_, i) => i).filter((i) => i > 0 && target[i].position > anchor);
  const run = longestIncreasing(behind.map((i) => target[i].position)).map((k) => behind[k]);
  const kept = new Set([0, ...run]);
  const moves = [];
  for (let i = 1; i < target.length; i++) {
    if (kept.has(i)) continue;
    const [entry, before] = [target[i], target[i - 1]];
    moves.push({ id: entry.id, itemId: entry.itemId, after: before.id, afterId: before.itemId });
  }
  return moves;
}

/** `Wave 08`: how a row's number opens its milestone's title. */
const waveTitle = (number) => `Wave ${String(number).padStart(2, '0')}`;

/**
 * The plan: the waves left where they sit, every way the rows and the board
 * disagree, the target order of the waves still open, and the moves. A wave
 * whose milestone has no open issue is done whatever the milestone's state;
 * an issue on a wave's milestone that its row does not name is appended to
 * the wave, in heading order, and reported.
 */
export function planReorder({ issues, milestones, listing, tasks }) {
  const byId = new Map();
  for (const issue of issues) {
    const id = idOf(issue.title);
    if (id) byId.set(id, issue);
  }
  const onBoard = new Map(
    listing.items.map((item, position) => [item.number, { itemId: item.id, position }]),
  );
  const headingIndex = new Map(tasks.order.map((id, i) => [id, i]));
  const plan = {
    projectId: listing.projectId,
    skipped: [],
    missing: [],
    unlisted: [],
    misplaced: [],
    descriptions: [],
    target: [],
    considered: 0,
    moves: [],
  };
  const entries = [];
  const placed = new Set();
  const place = (id, issue) => {
    entries.push({ id, ...onBoard.get(issue.number) });
    placed.add(id);
  };
  for (const wave of tasks.waves) {
    const prefix = waveTitle(wave.number);
    const milestone = milestones.find((candidate) => candidate.title.startsWith(`${prefix} `));
    if (!milestone) {
      plan.skipped.push(`row ${wave.number}: no milestone titled "${prefix} — …"`);
      continue;
    }
    if (milestone.openIssues === 0) {
      plan.skipped.push(`${milestone.title}: no open task, left where it sits`);
      continue;
    }
    for (const id of wave.ids) {
      const issue = byId.get(id);
      if (!issue) {
        plan.missing.push(`row ${wave.number}: ${id} has no tracked issue`);
      } else if (!onBoard.has(issue.number)) {
        plan.missing.push(`row ${wave.number}: ${id} (#${issue.number}) is not on the Project`);
      } else if (placed.has(id)) {
        plan.misplaced.push(`row ${wave.number}: ${id} was already placed by an earlier row`);
      } else {
        if (issue.milestone !== milestone.title) {
          plan.misplaced.push(
            `row ${wave.number}: ${id} sits on "${issue.milestone ?? 'no milestone'}"`,
          );
        }
        place(id, issue);
      }
    }
    const members = issues
      .map((issue) => ({ id: idOf(issue.title), issue }))
      .filter(
        ({ id, issue }) =>
          id && issue.milestone === milestone.title && !placed.has(id) && onBoard.has(issue.number),
      )
      .sort((a, b) => (headingIndex.get(a.id) ?? Infinity) - (headingIndex.get(b.id) ?? Infinity));
    for (const { id, issue } of members) {
      plan.unlisted.push(`${milestone.title}: ${id} is not in row ${wave.number}, appended`);
      place(id, issue);
    }
    const listed = expandIds(milestone.description.split('\n')[0], tasks.order).ids;
    if (listed.join(' ') !== wave.ids.join(' ')) {
      plan.descriptions.push(
        `${milestone.title}: the description's first line differs from row ${wave.number}`,
      );
    }
  }
  plan.target = entries.map((entry) => entry.id);
  plan.considered = entries.length;
  plan.moves = planMoves(entries);
  return plan;
}

/** The plan for the live board: the REST issue list, one milestones page, the items listing. */
export function readReorderPlan() {
  return planReorder({
    issues: listTracked(),
    milestones: listMilestones(),
    listing: listItems(),
    tasks: loadTasksMd(),
  });
}

// One move a request. The ids travel as variables, and only the mutation id
// is selected: asking for `items` back would be the listing again.
const POSITION_MUTATION = `
  mutation ($projectId: ID!, $itemId: ID!, $afterId: ID!) {
    updateProjectV2ItemPosition(input: { projectId: $projectId, itemId: $itemId, afterId: $afterId }) {
      clientMutationId
    }
  }`;

export const reorderMutationArgs = (projectId, move) => [
  'api',
  'graphql',
  '-f',
  `query=${POSITION_MUTATION}`,
  '-f',
  `projectId=${projectId}`,
  '-f',
  `itemId=${move.itemId}`,
  '-f',
  `afterId=${move.afterId}`,
];

// Content creation on GitHub: ~80/min, 500/hour (secondary limit).
const WRITE_INTERVAL_MS = 1500;
const RATE_LIMITED = /HTTP 403|HTTP 429|rate limit|submitted too quickly/i;

/** A GitHub write, spaced out, retried once after a rate-limit refusal. */
export async function pacedWrite(fn) {
  await sleep(WRITE_INTERVAL_MS);
  try {
    return fn();
  } catch (error) {
    if (!(error instanceof BoardError) || !RATE_LIMITED.test(error.message)) throw error;
    const retryAfter = /retry-after:?\s*(\d+)/i.exec(error.message)?.[1];
    // The hourly content-creation cap answers "submitted too quickly" with no
    // retry-after, and a minute never clears it; five is a guess that usually does.
    const wait = retryAfter ? Number(retryAfter) : 300;
    console.error(`rate limited; waiting ${wait}s`);
    await sleep(wait * 1000);
    return fn();
  }
}

/** Makes the plan's moves in order, at most `limit` of them; answers how many were made. */
export async function applyReorder(plan, { limit = Infinity, onMove = () => {} } = {}) {
  let made = 0;
  for (const move of plan.moves.slice(0, limit)) {
    await pacedWrite(() => gh(reorderMutationArgs(plan.projectId, move)));
    made += 1;
    onMove(move);
  }
  return made;
}

function printReorderPlan(plan) {
  const section = (title, lines) => {
    if (lines.length) console.log(`${title}\n${lines.map((line) => `  ${line}`).join('\n')}`);
  };
  section('Left where they sit:', plan.skipped);
  section('Rows naming an issue the board lacks:', plan.missing);
  section('Issues in a wave its row does not name:', plan.unlisted);
  section('Row ids sitting on another milestone, ordered by the row:', plan.misplaced);
  section('Milestone descriptions that differ from the row:', plan.descriptions);
  const count = plan.moves.length;
  console.log(
    `${plan.considered} items considered, ${count} move${count === 1 ? '' : 's'} needed${count ? ':' : '.'}`,
  );
  for (const move of plan.moves) console.log(`  ${move.id} → after ${move.after}`);
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
  list                       every tracked issue, as a JSON array
  reorder [--apply] [--limit N]
                             the moves that put the open waves in execution order; --apply makes them`;

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
  async reorder(args) {
    const at = args.indexOf('--limit');
    const limit = at === -1 ? Infinity : Number(args[at + 1]);
    if (limit !== Infinity && !(Number.isInteger(limit) && limit > 0)) throw new BoardError(USAGE);
    const plan = readReorderPlan();
    printReorderPlan(plan);
    if (!args.includes('--apply') || plan.moves.length === 0) return;
    console.log(`\nApplying${limit === Infinity ? '' : ` the first ${limit}`}…`);
    let made = 0;
    try {
      await applyReorder(plan, {
        limit,
        onMove: (move) => {
          made += 1;
          console.log(`  ${move.id} → after ${move.after}`);
        },
      });
    } catch (error) {
      console.error(
        `Stopped after ${made} move(s). Re-run \`reorder --apply\`: the plan is recomputed from the live order.`,
      );
      throw error;
    }
    console.log(`${made} move(s) made. Reading the order again…\n`);
    printReorderPlan(readReorderPlan());
  },
};

export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const run = COMMANDS[command];
  if (!run) throw new BoardError(USAGE);
  await run(rest);
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
  main().catch((error) => {
    if (error instanceof BoardError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  });
}
