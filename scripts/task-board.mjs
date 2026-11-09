#!/usr/bin/env node
// The board's calls in one file, each a `gh` argument list, never a shell string; it never adds an item
// (claude-docs/task-tracking.md, "Status").
// Usage: node scripts/task-board.mjs <find|status|estimate|comment|sync|list|reorder|move|milestone|retire|place> ...

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
  PROJECTS,
  projectByNumber,
  projectOfMilestone,
  projectOfWave,
  waveTitle,
  ProjectConfigError,
} from './task-projects.mjs';
import { ID, expandIds, findEntry, loadTasksMd } from './tasks-md.mjs';

export const REPO = 'Aurora-Arctic/Sorrel-and-Salt';
export const OWNER = 'Aurora-Arctic';
export const STATUSES = ['Not Started', 'In Progress', 'In Review', 'Done'];
export const TRACKED_LABEL = 'tracked';

export class BoardError extends Error {}

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

// Issues are read through REST, because the GraphQL listing tripped GitHub's secondary rate limit.

/** `<id> — `: the id plus the separator, so a short id cannot match a longer one that starts with it. */
export const titlePrefix = (id) => `${id.toUpperCase()} — `;

export const matchesId = (title, id) => title.toUpperCase().startsWith(titlePrefix(id));

// REST spells state and reason in lower case; the skills and project-progress
// read the GraphQL spellings this script has always printed.
const STATES = { open: 'OPEN', closed: 'CLOSED' };
const STATE_REASONS = { completed: 'COMPLETED', not_planned: 'NOT_PLANNED', reopened: 'REOPENED' };

export const shapeIssue = (issue) => ({
  number: issue.number,
  nodeId: issue.node_id,
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

// Project — one query for the issue's own item, never a listing. Field and option ids are read on each run, not hardcoded: a recreated option gets a new id,
// and a stale constant would set nothing while reporting success.

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

const shapeNode = (node) => ({
  id: node.id,
  projectId: node.project.id,
  projectNumber: node.project.number,
  // A field type the query does not spell out answers an empty node.
  fields: (node.project.fields?.nodes ?? []).filter((field) => field.name),
  status: node.status?.name ?? null,
  estimate: node.estimate?.number ?? null,
});

const isConfigured = (number) => PROJECTS.some((project) => project.number === Number(number));

/** The issue's items on the configured Projects; another org Project holding it is not the board's. */
export const shapeItems = (nodes) =>
  nodes.filter((node) => isConfigured(node.project.number)).map(shapeNode);

/**
 * The issue's item on Project `number`, or, unnamed, on the one configured Project holding it.
 * On two, every command but `place` refuses, as which one is the task's is the question `place` answers.
 */
export function shapeItem(nodes, number) {
  const items = shapeItems(nodes);
  if (number !== undefined) {
    return items.find((item) => String(item.projectNumber) === String(number)) ?? null;
  }
  if (items.length > 1) {
    const on = items.map((item) => item.projectNumber).join(' and ');
    throw new BoardError(
      `The issue is on Projects ${on}. Run \`node scripts/task-board.mjs place <ID> --apply\` to keep it on its milestone's Project only.`,
    );
  }
  return items[0] ?? null;
}

function readItemNodes(issue) {
  const [owner, name] = REPO.split('/');
  const query = ['-f', `query=${ITEM_QUERY}`, '-f', `owner=${owner}`, '-f', `name=${name}`];
  const data = ghJson(['api', 'graphql', ...query, '-F', `number=${issue.number}`]);
  return data.data.repository.issue.projectItems.nodes;
}

export function readItem(issue, number) {
  return shapeItem(readItemNodes(issue), number);
}

/**
 * The item, or a refusal. A Project with an auto-add workflow places a
 * tracked issue moments after its creation, and nothing here adds one there:
 * an item the script added would be one the triage filter never saw.
 */
export function requireItem(issue, item = readItem(issue)) {
  if (item) return item;
  const project = projectOfMilestone(issue.milestone);
  if (project && !project.autoAdd) {
    throw new BoardError(
      `#${issue.number} is not on Project ${project.number} yet. Run \`node scripts/task-board.mjs place <ID> --apply\` to add it.`,
    );
  }
  throw new BoardError(
    `#${issue.number} is not on a Project yet. Its auto-add workflow places a \`${TRACKED_LABEL}\` issue moments after creation; retry then.`,
  );
}

export function projectField(item, name) {
  const field = item.fields.find((candidate) => candidate.name === name);
  if (!field) throw new BoardError(`Project ${item.projectNumber} has no "${name}" field.`);
  return field;
}

function editItem(item, field, valueArgs) {
  const args = ['project', 'item-edit', '--id', item.id, '--project-id', item.projectId];
  gh([...args, '--field-id', field.id, ...valueArgs]);
}

/**
 * Moves Status forward. `Done` is the merge's, so it is refused unless `force`, the migration's flag for tasks already done on Asana. `item` is read unless given.
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

// Order — the Project's manual item order is execution order: TASKS.md's wave table, wave by wave. `reorder` plans the fewest moves and makes them one paced
// mutation at a time (claude-docs/task-tracking.md, "Order").

export const idOf = (title) => new RegExp(String.raw`^(${ID}) — `).exec(title)?.[1] ?? null;

export const shapeMilestone = (milestone) => ({
  number: milestone.number,
  title: milestone.title,
  state: milestone.state,
  openIssues: milestone.open_issues,
  closedIssues: milestone.closed_issues,
  description: milestone.description ?? '',
});

export function listMilestones() {
  const endpoint = `repos/${REPO}/milestones?state=all&per_page=100`;
  return ghJson(['api', '--paginate', '--slurp', endpoint]).flat().map(shapeMilestone);
}

// Position is observable only as listing order, so this is the one listing the script makes. It asks each item for its id and issue number and nests no connection,
// as `gh project item-list`, which asked for every field value, tripped the secondary limit.
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

export function shapeListing(pages) {
  const projects = pages.map((page) => page.data.organization.projectV2);
  return {
    projectId: projects[0]?.id ?? null,
    items: projects.flatMap((project) =>
      project.items.nodes.map((node) => ({ id: node.id, number: node.content?.number ?? null })),
    ),
  };
}

export function listItems(number) {
  const args = ['-f', `query=${ITEMS_QUERY}`, '-f', `owner=${OWNER}`, '-F', `number=${number}`];
  return shapeListing(ghJson(['api', 'graphql', '--paginate', '--slurp', ...args]));
}

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
 * The fewest moves that put `target` into order: the first entry is the anchor, the longest run already in order stays, and each other entry moves after its predecessor.
 * Target order makes a predecessor final before its follower is placed, so nothing climbs above the items left alone.
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

/**
 * The plan: the waves left where they sit, every disagreement between rows and board, the target order of the open waves, and the moves. A wave whose milestone has no open issue is done;
 * an issue on a wave's milestone that its row does not name is appended to the wave and reported.
 */
export function planReorder({ issues, milestones, listing, tasks, project }) {
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
    project: project.number,
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
  for (const wave of tasks.waves.filter((row) => projectOfWave(row) === project)) {
    const prefix = waveTitle(wave, project);
    const row = `row ${wave.letter ? `${wave.letter} · ` : ''}${wave.number}`;
    const milestone = milestones.find((candidate) => candidate.title.startsWith(`${prefix} `));
    if (!milestone) {
      plan.skipped.push(`${row}: no milestone titled "${prefix} — …"`);
      continue;
    }
    if (milestone.openIssues === 0) {
      plan.skipped.push(`${milestone.title}: no open task, left where it sits`);
      continue;
    }
    for (const id of wave.ids) {
      const issue = byId.get(id);
      if (!issue) {
        plan.missing.push(`${row}: ${id} has no tracked issue`);
      } else if (!onBoard.has(issue.number)) {
        plan.missing.push(`${row}: ${id} (#${issue.number}) is not on Project ${project.number}`);
      } else if (placed.has(id)) {
        plan.misplaced.push(`${row}: ${id} was already placed by an earlier row`);
      } else {
        if (issue.milestone !== milestone.title) {
          plan.misplaced.push(`${row}: ${id} sits on "${issue.milestone ?? 'no milestone'}"`);
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
      plan.unlisted.push(`${milestone.title}: ${id} is not in ${row}, appended`);
      place(id, issue);
    }
    const listed = expandIds(milestone.description.split('\n')[0], tasks.order).ids;
    if (listed.join(' ') !== wave.ids.join(' ')) {
      plan.descriptions.push(
        `${milestone.title}: the description's first line differs from ${row}`,
      );
    }
  }
  plan.target = entries.map((entry) => entry.id);
  plan.considered = entries.length;
  plan.moves = planMoves(entries);
  return plan;
}

/** One plan per Project, the reads shared: each Project keeps its own waves in their own order. */
export function readReorderPlans(projects = PROJECTS) {
  const [issues, milestones, tasks] = [listTracked(), listMilestones(), loadTasksMd()];
  return projects.map((project) =>
    planReorder({ issues, milestones, tasks, project, listing: listItems(project.number) }),
  );
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
  console.log(`Project ${plan.project}, ${projectByNumber(plan.project).title}:`);
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

// Milestone and placement — `milestone`, `retire` and `move` (claude-docs/task-tracking.md, "scripts/task-board.mjs").

export const RETIRED_MILESTONE = 'Retired — not done';

/** The one milestone titled exactly `title`, open unless `open` is false; zero or several is a refusal. */
export function findMilestone(title, milestones, { open = true } = {}) {
  const named = milestones.filter((candidate) => candidate.title === title);
  const matches = open ? named.filter((candidate) => candidate.state === 'open') : named;
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    const closed = named.length ? ` (#${named[0].number} is closed)` : '';
    throw new BoardError(`No open milestone is titled "${title}" in ${REPO}${closed}.`);
  }
  const list = matches.map((candidate) => `#${candidate.number}`).join(', ');
  throw new BoardError(`${matches.length} milestones are titled "${title}": ${list}.`);
}

/** A REST edit of the issue; a number goes as `-F`, since `-f` would send the milestone as a string. */
export const issueEditArgs = (issue, fields) => [
  'api',
  '-X',
  'PATCH',
  `repos/${REPO}/issues/${issue.number}`,
  ...Object.entries(fields).flatMap(([key, value]) => [
    typeof value === 'number' ? '-F' : '-f',
    `${key}=${value}`,
  ]),
];

export function parseMoveArgs(args) {
  const [id, flag, other, ...rest] = args;
  if (!id || id.startsWith('--') || rest.length) throw new BoardError(USAGE);
  if (flag === '--last' && other === undefined) return { id, last: true };
  if (flag === '--after' && other && !other.startsWith('--')) return { id, after: other };
  throw new BoardError(USAGE);
}

/**
 * The one move that puts `id` directly after `after`, or after the last item on its own milestone for `last`; `move` is null when it already sits there.
 * Both tasks must share a milestone, so the command places a task within one and never across.
 */
export function planPlacement({ issues, listing, id, after, last }) {
  const issue = findIssue(id, issues);
  if (!issue.milestone)
    throw new BoardError(`${idOf(issue.title)} (#${issue.number}) has no milestone.`);
  const byNumber = new Map(issues.map((candidate) => [candidate.number, candidate]));
  const positions = new Map(
    listing.items.map((item, position) => [item.number, { item, position }]),
  );
  const onBoard = (candidate) => {
    const found = positions.get(candidate.number);
    if (found) return found;
    throw new BoardError(`${idOf(candidate.title)} (#${candidate.number}) is not on the Project.`);
  };
  const task = onBoard(issue);
  let anchor;
  if (last) {
    const others = listing.items.filter(
      (item) =>
        item.number !== issue.number && byNumber.get(item.number)?.milestone === issue.milestone,
    );
    if (others.length === 0) {
      throw new BoardError(`${idOf(issue.title)} is the only item on "${issue.milestone}".`);
    }
    anchor = byNumber.get(others.at(-1).number);
  } else {
    anchor = findIssue(after, issues);
    if (anchor.number === issue.number)
      throw new BoardError(`${idOf(issue.title)} cannot follow itself.`);
    if (anchor.milestone !== issue.milestone) {
      throw new BoardError(
        `${idOf(anchor.title)} sits on "${anchor.milestone ?? 'no milestone'}", not "${issue.milestone}".`,
      );
    }
  }
  const target = onBoard(anchor);
  const inPlace = last ? task.position > target.position : task.position === target.position + 1;
  const move = inPlace
    ? null
    : {
        id: idOf(issue.title),
        itemId: task.item.id,
        after: idOf(anchor.title),
        afterId: target.item.id,
      };
  return { projectId: listing.projectId, move };
}

// Project placement — `place` keeps each issue on the Project its milestone belongs to, and only there (claude-docs/task-tracking.md, "Several Projects").

const statusRank = (status) => (status === null ? -1 : STATUSES.indexOf(status));

/**
 * What puts `issue` on its milestone's Project alone, or null when it already sits there. Every write it plans is idempotent and the removal comes last,
 * so a run that stops part-way leaves the issue on both Projects and a second run finishes it: the furthest Status of the two and the source's Estimate are carried.
 */
export function planProjectPlacement(issue, items) {
  const target = projectOfMilestone(issue.milestone);
  if (!target) return null;
  const onTarget = items.find((item) => item.projectNumber === target.number) ?? null;
  const others = items.filter((item) => item !== onTarget);
  if (!onTarget && others.length === 0 && target.autoAdd) return null;
  const labels = issue.labels ?? [];
  const addLabels = target.label && !labels.includes(target.label) ? [target.label] : [];
  const removeLabels = PROJECTS.filter((project) => project !== target && project.label)
    .map((project) => project.label)
    .filter((label) => labels.includes(label));
  const status = [...others, onTarget]
    .filter(Boolean)
    .reduce(
      (best, item) => (statusRank(item.status) > statusRank(best) ? item.status : best),
      null,
    );
  const estimate =
    others.find((item) => item.estimate !== null)?.estimate ?? onTarget?.estimate ?? null;
  const settled =
    onTarget && onTarget.status === status && onTarget.estimate === estimate && others.length === 0;
  if (settled && addLabels.length === 0 && removeLabels.length === 0) return null;
  return {
    id: idOf(issue.title) ?? `#${issue.number}`,
    number: issue.number,
    nodeId: issue.nodeId,
    to: target.number,
    itemId: onTarget?.id ?? null,
    from: others.map((item) => ({ projectNumber: item.projectNumber, itemId: item.id })),
    add: !onTarget,
    current: { status: onTarget?.status ?? null, estimate: onTarget?.estimate ?? null },
    status,
    estimate,
    addLabels,
    removeLabels,
  };
}

const projectMetaQuery = (numbers) => `
  query ($owner: String!) {
    organization(login: $owner) {
      ${numbers
        .map(
          (number) => `p${number}: projectV2(number: ${number}) {
        id
        number
        fields(first: 30) {
          nodes {
            ... on ProjectV2Field { id name }
            ... on ProjectV2SingleSelectField { id name options { id name } }
          }
        }
      }`,
        )
        .join('\n')}
    }
  }`;

/** Each configured Project's node id and fields, in one query. */
export function readProjects(projects = PROJECTS) {
  const numbers = projects.map((project) => project.number);
  const query = ['-f', `query=${projectMetaQuery(numbers)}`, '-f', `owner=${OWNER}`];
  const data = ghJson(['api', 'graphql', ...query]).data.organization;
  return new Map(
    numbers.map((number) => {
      const project = data[`p${number}`];
      if (!project) throw new BoardError(`Project ${number} does not exist in ${OWNER}.`);
      const fields = project.fields.nodes.filter((field) => field.name);
      return [number, { id: project.id, number, fields }];
    }),
  );
}

const ITEMS_CHUNK = 50;

/** Every listed issue's items on the configured Projects, fifty issues a query under aliases, by issue number. */
export function readItemsOf(numbers) {
  const [owner, name] = REPO.split('/');
  const found = new Map();
  for (let start = 0; start < numbers.length; start += ITEMS_CHUNK) {
    const chunk = numbers.slice(start, start + ITEMS_CHUNK);
    const aliases = chunk
      .map(
        (number) => `i${number}: issue(number: ${number}) {
        projectItems(first: 10) {
          nodes {
            id
            project { id number }
            status: fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
            estimate: fieldValueByName(name: "Estimate") { ... on ProjectV2ItemFieldNumberValue { number } }
          }
        }
      }`,
      )
      .join('\n');
    const query = `query ($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${aliases} } }`;
    const args = ['-f', `query=${query}`, '-f', `owner=${owner}`, '-f', `name=${name}`];
    const repository = ghJson(['api', 'graphql', ...args]).data.repository;
    for (const number of chunk) {
      found.set(number, shapeItems(repository[`i${number}`]?.projectItems.nodes ?? []));
    }
  }
  return found;
}

/** The plan for each issue that is off its milestone's Project, read in one batched query. */
export function readPlacementPlans(issues) {
  const items = readItemsOf(issues.map((issue) => issue.number));
  return issues
    .map((issue) => planProjectPlacement(issue, items.get(issue.number) ?? []))
    .filter(Boolean);
}

const ADD_MUTATION = `
  mutation ($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) { item { id } }
  }`;
const DELETE_MUTATION = `
  mutation ($projectId: ID!, $itemId: ID!) {
    deleteProjectV2Item(input: { projectId: $projectId, itemId: $itemId }) { deletedItemId }
  }`;

export const addItemArgs = (projectId, contentId) => [
  'api',
  'graphql',
  '-f',
  `query=${ADD_MUTATION}`,
  '-f',
  `projectId=${projectId}`,
  '-f',
  `contentId=${contentId}`,
];

export const deleteItemArgs = (projectId, itemId) => [
  'api',
  'graphql',
  '-f',
  `query=${DELETE_MUTATION}`,
  '-f',
  `projectId=${projectId}`,
  '-f',
  `itemId=${itemId}`,
];

export const addLabelArgs = (number, label) => [
  'api',
  '-X',
  'POST',
  `repos/${REPO}/issues/${number}/labels`,
  '-f',
  `labels[]=${label}`,
];

export const removeLabelArgs = (number, label) => [
  'api',
  '-X',
  'DELETE',
  `repos/${REPO}/issues/${number}/labels/${encodeURIComponent(label)}`,
];

// The target Project's "Item added to project" workflow sets Not Started a moment after an add, so the fields are written after every add has settled.
const SETTLE_MS = 15000;

/**
 * Applies the plans in phases across every issue: labels, adds, field values, one verifying read, then the removals for the items verified.
 * Labels go first, so the default Project's auto-add, which an issue edit triggers, never sees a moved issue unlabelled once it is gone from there.
 */
export async function applyPlacements(plans, { log = () => {} } = {}) {
  const projects = readProjects();
  const pending = plans.map((plan) => ({ ...plan }));
  for (const plan of pending) {
    for (const label of plan.addLabels) {
      await pacedWrite(() => gh(addLabelArgs(plan.number, label)));
      log(`${plan.id}: labelled ${label}`);
    }
    for (const label of plan.removeLabels) {
      await pacedWrite(() => gh(removeLabelArgs(plan.number, label)));
      log(`${plan.id}: unlabelled ${label}`);
    }
  }
  let added = 0;
  for (const plan of pending.filter((candidate) => candidate.add)) {
    const projectId = projects.get(plan.to).id;
    const data = await pacedWrite(() => ghJson(addItemArgs(projectId, plan.nodeId)));
    plan.itemId = data.data.addProjectV2ItemById.item.id;
    added += 1;
    log(`${plan.id}: added to Project ${plan.to}`);
  }
  if (added) await sleep(SETTLE_MS);
  const current = readItemsOf(pending.map((plan) => plan.number));
  for (const plan of pending) {
    const project = projects.get(plan.to);
    const onTarget = current.get(plan.number).find((item) => item.projectNumber === plan.to);
    if (!onTarget) continue;
    const item = { ...onTarget, projectId: project.id, fields: project.fields };
    if (plan.status !== null && item.status !== plan.status) {
      const field = projectField(item, 'Status');
      const option = field.options?.find((candidate) => candidate.name === plan.status);
      if (!option) throw new BoardError(`Project ${plan.to}'s Status has no "${plan.status}".`);
      await pacedWrite(() => editItem(item, field, ['--single-select-option-id', option.id]));
      log(`${plan.id}: Status ${item.status ?? '(unset)'} → ${plan.status}`);
    }
    if (plan.estimate !== null && item.estimate !== plan.estimate) {
      const field = projectField(item, 'Estimate');
      await pacedWrite(() => editItem(item, field, ['--number', String(plan.estimate)]));
      log(`${plan.id}: Estimate ${item.estimate ?? '(unset)'} → ${plan.estimate}h`);
    }
  }
  const verified = readItemsOf(pending.map((plan) => plan.number));
  const unverified = [];
  let removed = 0;
  for (const plan of pending) {
    const onTarget = verified.get(plan.number).find((item) => item.projectNumber === plan.to);
    const right =
      onTarget &&
      (plan.status === null || onTarget.status === plan.status) &&
      (plan.estimate === null || onTarget.estimate === plan.estimate);
    if (!right) {
      unverified.push(plan.id);
      continue;
    }
    for (const source of plan.from) {
      const projectId = projects.get(source.projectNumber).id;
      await pacedWrite(() => gh(deleteItemArgs(projectId, source.itemId)));
      removed += 1;
      log(`${plan.id}: removed from Project ${source.projectNumber}`);
    }
  }
  return { added, removed, unverified };
}

const show = (value) => (value === null ? '(unset)' : String(value));

export function describePlacement(plan) {
  const from = plan.from.map((source) => source.projectNumber).join(', ') || '(none)';
  const labels = [
    ...plan.addLabels.map((label) => `+${label}`),
    ...plan.removeLabels.map((label) => `-${label}`),
  ];
  return [
    `${plan.id} (#${plan.number})`,
    `from Project ${from}`,
    `to Project ${plan.to}${plan.add ? '' : ' (already there)'}`,
    `Status ${show(plan.status)}`,
    `Estimate ${show(plan.estimate)}`,
    labels.length ? `labels ${labels.join(' ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

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
    // No '/', '_' or '-', and both a digit and a letter: a path, URL, branch name or SCREAMING_CASE constant is what a comment cites, and a token has none of those.
    // A github.com or app.asana.com link is blanked first; a bare git SHA is exactly 40 hex characters.
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

// Sync — an issue's title and body are its entry's heading and text, and its Estimate the heading's hours (claude-docs/task-tracking.md, "Sync").

const BLOB = `https://github.com/${REPO}/blob/staging/`;

/**
 * The entry's text as an issue body: a relative link points at the doc on
 * staging, since an issue page resolves it against nothing. Code spans are
 * left alone, where `](` is text rather than a link.
 */
export function issueBodyOf(body, path) {
  const base = new URL(path, BLOB);
  return body
    .split(/(`[^`\n]*`)/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(/\]\(([^)\s]+)\)/g, (link, href) =>
            /^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href) ? link : `](${new URL(href, base)})`,
          ),
    )
    .join('');
}

/**
 * The edits that bring `issue` to `entry`: a title and a body, each only where it differs. A title that would not open with the id is refused, as `find` could not reach it.
 */
export function planSync(issue, entry) {
  if (!matchesId(entry.title, entry.id)) {
    throw new BoardError(`${entry.id}'s heading does not open with "${titlePrefix(entry.id)}".`);
  }
  const body = issueBodyOf(entry.body, entry.path);
  const plan = {};
  if (issue.title !== entry.title) plan.title = entry.title;
  if ((issue.body ?? '').trim() !== body) plan.body = body;
  return plan;
}

export function syncIssue(issue, entry) {
  const { body: current } = ghJson(['api', `repos/${REPO}/issues/${issue.number}`]);
  const plan = planSync({ title: issue.title, body: current }, entry);
  const hit = plan.body === undefined ? null : findSecret(plan.body);
  if (hit) {
    throw new BoardError(
      `Refused: ${entry.id}'s entry looks like it carries a ${hit.name}, and an issue is public.`,
    );
  }
  const args = ['issue', 'edit', String(issue.number), '--repo', REPO];
  if (plan.title !== undefined) args.push('--title', plan.title);
  if (plan.body !== undefined) gh([...args, '--body-file', '-'], { input: plan.body });
  else if (plan.title !== undefined) gh(args);
  const estimate = entry.hours === undefined ? null : setEstimate(issue, entry.hours);
  return { ...plan, estimate };
}

const USAGE = `usage: node scripts/task-board.mjs <command> …

  find <ID>                  the tracked issue titled "<ID> — …", as JSON
  status <ID> "<Status>"     move the Project Status forward (${STATUSES.join(' → ')})
  estimate <ID> <hours>      set the Project Estimate
  comment <ID> "<text>"      comment on the issue; refused if the text looks like a value
  sync <ID> [<ID> …]         bring each issue's title, body and Estimate to its entry
  list                       every tracked issue, as a JSON array
  renumber <OLD> <NEW> [<OLD> <NEW> …]
                             retitle each open issue from its old id to the new one its entry is headed by, then sync it
  reorder [--project N] [--apply] [--limit N]
                             the moves that put each Project's open waves in execution order; --apply makes them
  move <ID> --after <ID> | --last
                             place the task within its milestone: after the named task, or last
  milestone <ID> "<title>"   move the issue to the open milestone titled exactly so, and onto its Project
  retire <ID>                close the issue as not planned, on "${RETIRED_MILESTONE}"
  place <ID> [<ID> …] | --all [--apply]
                             put each issue on its milestone's Project alone, carrying Status and Estimate;
                             a dry run unless --apply`;

const COMMANDS = {
  find([id]) {
    if (!id) throw new BoardError(USAGE);
    const issue = findIssue(id);
    const item = readItem(issue);
    const project = item?.projectNumber ?? null;
    console.log(JSON.stringify({ ...issue, project, status: item?.status ?? null }, null, 2));
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
  sync(ids) {
    if (ids.length === 0) throw new BoardError(USAGE);
    const issues = listTracked();
    for (const id of ids.map((raw) => raw.toUpperCase())) {
      const entry = findEntry(id);
      if (!entry)
        throw new BoardError(`No entry in claude-docs/tasks/ is headed "${titlePrefix(id)}…".`);
      const issue = findIssue(id, issues);
      const { title, body, estimate } = syncIssue(issue, entry);
      const changed = [
        title && 'title',
        body && 'body',
        estimate?.changed && `estimate ${estimate.to}h`,
      ];
      const note = changed.filter(Boolean).join(', ') || 'already in sync';
      console.log(`${id}: #${issue.number} ${note}`);
    }
  },
  list() {
    console.log(JSON.stringify(listTracked(), null, 2));
  },
  // A closed task keeps its id: its merged PR's title names the old one, and the tally counts it by that.
  renumber(args) {
    if (args.length === 0 || args.length % 2) throw new BoardError(USAGE);
    const issues = listTracked();
    for (let i = 0; i < args.length; i += 2) {
      const [from, to] = [args[i].toUpperCase(), args[i + 1].toUpperCase()];
      const entry = findEntry(to);
      if (!entry)
        throw new BoardError(`No entry in claude-docs/tasks/ is headed "${titlePrefix(to)}…".`);
      const renamed = issues.some((issue) => matchesId(issue.title, to));
      const issue = findIssue(renamed ? to : from, issues);
      if (issue.state === 'CLOSED') {
        throw new BoardError(`#${issue.number} is closed; a closed task keeps its id.`);
      }
      const { title, body, estimate } = syncIssue(issue, entry);
      const changed = [
        title && 'title',
        body && 'body',
        estimate?.changed && `estimate ${estimate.to}h`,
      ];
      const note = changed.filter(Boolean).join(', ') || 'already in sync';
      console.log(`${from} → ${to}: #${issue.number} ${note}`);
    }
  },
  async reorder(args) {
    const at = args.indexOf('--limit');
    const limit = at === -1 ? Infinity : Number(args[at + 1]);
    if (limit !== Infinity && !(Number.isInteger(limit) && limit > 0)) throw new BoardError(USAGE);
    const named = args.indexOf('--project');
    const projects = named === -1 ? PROJECTS : [projectByNumber(args[named + 1])];
    const plans = readReorderPlans(projects);
    plans.forEach(printReorderPlan);
    const moves = plans.reduce((sum, plan) => sum + plan.moves.length, 0);
    if (!args.includes('--apply') || moves === 0) return;
    console.log(`\nApplying${limit === Infinity ? '' : ` the first ${limit}`}…`);
    let made = 0;
    try {
      for (const plan of plans) {
        await applyReorder(plan, {
          limit: limit - made,
          onMove: (move) => {
            made += 1;
            console.log(`  Project ${plan.project}: ${move.id} → after ${move.after}`);
          },
        });
      }
    } catch (error) {
      console.error(
        `Stopped after ${made} move(s). Re-run \`reorder --apply\`: the plan is recomputed from the live order.`,
      );
      throw error;
    }
    console.log(`${made} move(s) made. Reading the order again…\n`);
    readReorderPlans(projects).forEach(printReorderPlan);
  },
  move(args) {
    const { id, after, last } = parseMoveArgs(args);
    const issues = listTracked();
    const project = projectOfMilestone(findIssue(id, issues).milestone) ?? PROJECTS[0];
    const { projectId, move } = planPlacement({
      issues,
      listing: listItems(project.number),
      id,
      after,
      last,
    });
    if (!move) {
      console.log(`${id.toUpperCase()}: already in place`);
      return;
    }
    gh(reorderMutationArgs(projectId, move));
    console.log(`${move.id} → after ${move.after}`);
  },
  async milestone([id, title, ...rest]) {
    if (!id || !title || rest.length) throw new BoardError(USAGE);
    const issue = findIssue(id);
    const target = findMilestone(title, listMilestones());
    if (issue.milestone === target.title) {
      console.log(`${id.toUpperCase()}: already on "${target.title}"`);
      return;
    }
    gh(issueEditArgs(issue, { milestone: target.number }));
    console.log(`${id.toUpperCase()}: ${issue.milestone ?? '(none)'} → ${target.title}`);
    // A milestone on the same Project changes nothing on the board, and costs no read.
    if (projectOfMilestone(issue.milestone) === projectOfMilestone(target.title)) return;
    const plans = readPlacementPlans([{ ...issue, milestone: target.title }]);
    if (plans.length === 0) return;
    console.log(describePlacement(plans[0]));
    await applyPlacementsReported(plans);
  },
  async place(args) {
    const all = args.includes('--all');
    const ids = args.filter((arg) => !arg.startsWith('--'));
    if (
      all === ids.length > 0 ||
      args.some((arg) => arg.startsWith('--') && !['--all', '--apply'].includes(arg))
    ) {
      throw new BoardError(USAGE);
    }
    const issues = listTracked();
    const chosen = all ? issues : ids.map((id) => findIssue(id, issues));
    const plans = readPlacementPlans(chosen);
    console.log(
      `${plans.length} issue(s) off their milestone's Project${plans.length ? ':' : '.'}`,
    );
    for (const plan of plans) console.log(`  ${describePlacement(plan)}`);
    if (!args.includes('--apply') || plans.length === 0) return;
    await applyPlacementsReported(plans);
  },
  retire([id, ...rest]) {
    if (!id || rest.length) throw new BoardError(USAGE);
    const issue = findIssue(id);
    if (issue.state === 'CLOSED' && issue.stateReason === 'COMPLETED') {
      throw new BoardError(
        `#${issue.number} is closed as completed; retire is for a task not done.`,
      );
    }
    // The retired milestone may be closed, so a closed one matches too.
    const target = findMilestone(RETIRED_MILESTONE, listMilestones(), { open: false });
    if (issue.state === 'CLOSED' && issue.milestone === target.title) {
      console.log(`${id.toUpperCase()}: already retired`);
      return;
    }
    gh(
      issueEditArgs(issue, {
        milestone: target.number,
        state: 'closed',
        state_reason: 'not_planned',
      }),
    );
    console.log(`${id.toUpperCase()}: closed as not planned, on "${target.title}"`);
  },
};

async function applyPlacementsReported(plans) {
  console.log('\nApplying…');
  const result = await applyPlacements(plans, { log: (line) => console.log(`  ${line}`) });
  console.log(`${result.added} added, ${result.removed} removed.`);
  if (result.unverified.length) {
    throw new BoardError(
      `Not verified, so left on their old Project too: ${result.unverified.join(', ')}. Re-run \`place --apply\` to finish them.`,
    );
  }
}

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
    if (error instanceof BoardError || error instanceof ProjectConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  });
}
