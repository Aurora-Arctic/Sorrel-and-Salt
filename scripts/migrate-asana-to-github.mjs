#!/usr/bin/env node
// One-off move of the Asana board onto GitHub Issues and the org Project
// (MB.89). Every step is idempotent and resumable: `apply` looks each object
// up before writing it, so a run that stops can be started again and picks
// up where it left off. It has to, because GitHub's secondary rate limit for
// content creation is about 80 writes a minute and 500 an hour, and the board
// is several hundred issues plus their comments — a full `apply` spans
// several invocations. claude-docs/task-tracking.md, "Migration".
//
// The export JSON is the one artefact between steps; the scratchpad is where
// it belongs, since it carries every note and comment the board ever held.
//
// usage: ASANA_PAT=… node scripts/migrate-asana-to-github.mjs export [--file <path>]
//        node scripts/migrate-asana-to-github.mjs plan   [--file <path>]
//        node scripts/migrate-asana-to-github.mjs scan   [--file <path>]
//        node scripts/migrate-asana-to-github.mjs apply  --project <number> [--file <path>] [--skip-scan]
//        node scripts/migrate-asana-to-github.mjs verify --project <number> [--file <path>]

import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
  BoardError,
  OWNER,
  PROJECT,
  REPO,
  TRACKED_LABEL,
  findSecret,
  gh,
  ghJson,
  listTracked,
  matchesId,
  pacedWrite,
  readItem,
  setEstimate,
  setStatus,
} from './task-board.mjs';
import { ID, TASKS_MD, readTasksMd } from './tasks-md.mjs';

const ASANA_API = 'https://app.asana.com/api/1.0';
const ASANA_PROJECT = '1218814916390986';
// The free plan allows 150 requests a minute; 450 ms apart stays under it.
const ASANA_INTERVAL_MS = 450;
const HOTFIX_LABEL = 'hotfix';

// `▶ M2.6 — Title`, `◔ M2.6 - Title`: the marker was Asana's status column.
const MARKER = /^[▶◔✓]\s+/;
const ISSUE_NAME = new RegExp(String.raw`^(${ID})\s+[—-]\s+(.*)$`);
const TIMESTAMP_BRACKET = /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC\]/;

// ---------------------------------------------------------------------------
// export

async function asanaGet(path, pat) {
  for (;;) {
    await sleep(ASANA_INTERVAL_MS);
    const response = await fetch(`${ASANA_API}${path}`, {
      headers: { Authorization: `Bearer ${pat}`, Accept: 'application/json' },
    });
    if (response.status === 429) {
      const wait = Number(response.headers.get('retry-after') ?? '60');
      console.error(`Asana 429; waiting ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    if (!response.ok) throw new BoardError(`Asana ${response.status} on ${path}`);
    return response.json();
  }
}

async function asanaList(path, pat) {
  const separator = path.includes('?') ? '&' : '?';
  const rows = [];
  let offset = null;
  do {
    const page = await asanaGet(
      `${path}${separator}limit=100${offset ? `&offset=${offset}` : ''}`,
      pat,
    );
    rows.push(...page.data);
    offset = page.next_page?.offset ?? null;
  } while (offset);
  return rows;
}

const TASK_FIELDS =
  'opt_fields=gid,name,notes,completed,num_subtasks,memberships.section.name,permalink_url';
const STORY_FIELDS = 'opt_fields=type,text,created_at,resource_subtype';

async function exportBoard(file) {
  const pat = process.env.ASANA_PAT;
  if (!pat) throw new BoardError('export needs ASANA_PAT in the environment.');
  const tasks = [];
  const walk = async (rows, parent) => {
    for (const row of rows) {
      const task = {
        gid: row.gid,
        name: row.name,
        notes: row.notes ?? '',
        completed: Boolean(row.completed),
        permalink_url: row.permalink_url,
        section: row.memberships?.[0]?.section?.name ?? null,
        parent,
        comments: [],
      };
      tasks.push(task);
      console.error(`task ${task.name}`);
      const stories = await asanaList(`/tasks/${row.gid}/stories?${STORY_FIELDS}`, pat);
      task.comments = stories
        .filter((story) => story.type === 'comment')
        .map((story) => ({ text: story.text ?? '', created_at: story.created_at }));
      if (row.num_subtasks > 0) {
        await walk(await asanaList(`/tasks/${row.gid}/subtasks?${TASK_FIELDS}`, pat), row.gid);
      }
    }
  };
  await walk(await asanaList(`/projects/${ASANA_PROJECT}/tasks?${TASK_FIELDS}`, pat), null);
  const board = { exportedAt: new Date().toISOString(), project: ASANA_PROJECT, tasks };
  writeFileSync(file, JSON.stringify(board, null, 2));
  console.log(
    `${tasks.length} tasks, ${tasks.reduce((n, t) => n + t.comments.length, 0)} comments → ${file}`,
  );
}

// ---------------------------------------------------------------------------
// plan

const stripMarker = (name) => name.replace(MARKER, '');

const bracketFor = (createdAt) => {
  const d = new Date(createdAt);
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return `[${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC]`;
};

export function buildPlan(rawBoard, tasksMd) {
  // Asana can list a task twice across pages; a gid identifies it once.
  const board = {
    ...rawBoard,
    tasks: [...new Map(rawBoard.tasks.map((t) => [t.gid, t])).values()],
  };
  const plan = readTasksMd(tasksMd);
  const byGid = new Map(board.tasks.map((task) => [task.gid, task]));
  // GitHub lists milestones alphabetically and nothing else, so the wave number
  // is padded to two digits or Wave 10 sorts between Wave 1 and Wave 2.
  const padWave = (name) => name.replace(/^Wave (\d)(?=\D)/, 'Wave 0$1');
  const classify = (task) => {
    const name = stripMarker(task.name);
    const m = ISSUE_NAME.exec(name);
    return m
      ? { kind: 'issue', id: m[1], title: `${m[1]} — ${m[2]}` }
      : { kind: 'milestone', name: padWave(name) };
  };
  const kinds = new Map(board.tasks.map((task) => [task.gid, classify(task)]));

  const milestones = new Map();
  for (const task of board.tasks) {
    const c = kinds.get(task.gid);
    if (c.kind !== 'milestone') continue;
    milestones.set(c.name, {
      name: c.name,
      description: task.notes,
      closed: task.completed,
      issues: [],
    });
  }
  // A wave in TASKS.md's table names the card the board already has when one
  // does; the table only decides for an issue with no parent card.
  const waveName = (wave) =>
    [...milestones.keys()].find((name) =>
      name.startsWith(`Wave ${String(wave.number).padStart(2, '0')} `),
    ) ?? `Wave ${String(wave.number).padStart(2, '0')} — ${wave.name}`;
  const waveOf = new Map();
  for (const wave of plan.waves) for (const id of wave.ids) waveOf.set(id, waveName(wave));

  const issues = [];
  const unplaced = [];
  const hotfixInNotes = [];
  const missingFromTasksMd = [];
  for (const task of board.tasks) {
    const c = kinds.get(task.gid);
    if (c.kind !== 'issue') continue;
    let ancestor = task.parent ? byGid.get(task.parent) : null;
    let parentIssue = null;
    if (ancestor && kinds.get(ancestor.gid).kind === 'issue') {
      parentIssue = kinds.get(ancestor.gid).id;
      while (ancestor && kinds.get(ancestor.gid).kind === 'issue') {
        ancestor = ancestor.parent ? byGid.get(ancestor.parent) : null;
      }
    }
    let milestone = ancestor ? kinds.get(ancestor.gid).name : (waveOf.get(c.id) ?? null);
    if (milestone && !milestones.has(milestone)) {
      milestones.set(milestone, { name: milestone, description: '', closed: false, issues: [] });
    }
    if (!milestone) unplaced.push(c.id);
    if (!plan.hours.has(c.id) && !plan.retired.has(c.id)) missingFromTasksMd.push(c.id);
    if (/hotfix/i.test(task.notes) && !/hotfix/i.test(task.name)) hotfixInNotes.push(c.id);
    const retired = /\[RETIRED\]/.test(c.title);
    const marker = task.name.match(MARKER)?.[0]?.trim() ?? '';
    const issue = {
      id: c.id,
      title: c.title,
      body: `${task.notes.trimEnd()}\n\nAsana: ${task.permalink_url}\n`,
      type: c.id.startsWith('MB.') ? 'Bug' : 'Task',
      labels: [TRACKED_LABEL, ...(/hotfix/i.test(task.name) ? [HOTFIX_LABEL] : [])],
      milestone,
      closed: task.completed || retired,
      closeReason: retired ? 'not planned' : task.completed ? 'completed' : null,
      status: task.completed
        ? 'Done'
        : marker === '▶'
          ? 'In Progress'
          : marker === '◔'
            ? 'In Review'
            : 'Not Started',
      estimate: plan.hours.get(c.id) ?? null,
      parent: parentIssue,
      comments: [...task.comments]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(({ text, created_at }) => ({
          created_at,
          body: TIMESTAMP_BRACKET.test(text) ? text : `${bracketFor(created_at)} ${text}`,
        })),
      asana: task.permalink_url,
    };
    if (milestone) milestones.get(milestone).issues.push(c.id);
    issues.push(issue);
  }
  // TASKS.md heading order first, then whatever the board has that it does not.
  const rank = new Map(plan.order.map((id, i) => [id, i]));
  issues.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));

  const seen = new Map();
  for (const issue of issues) seen.set(issue.id, (seen.get(issue.id) ?? 0) + 1);
  const duplicates = [...seen].filter(([, n]) => n > 1).map(([id]) => id);

  return {
    issues,
    milestones: [...milestones.values()],
    unplaced,
    hotfixInNotes,
    missingFromTasksMd,
    duplicates,
    unresolvedRanges: plan.unresolved,
  };
}

function printPlan(plan) {
  const comments = plan.issues.reduce((n, issue) => n + issue.comments.length, 0);
  const closed = plan.issues.filter((issue) => issue.closed).length;
  const retired = plan.issues.filter((issue) => issue.closeReason === 'not planned').length;
  const hotfix = plan.issues.filter((issue) => issue.labels.includes(HOTFIX_LABEL)).length;
  const children = plan.issues.filter((issue) => issue.parent).length;
  console.log(
    `${plan.issues.length} issues (${closed} closed, ${retired} of them retired; ${hotfix} hotfix; ${children} sub-issues), ${comments} comments, ${plan.milestones.length} milestones`,
  );
  console.log('\n| Milestone | State | Issues |\n| --- | --- | ---: |');
  for (const m of plan.milestones) {
    console.log(`| ${m.name} | ${m.closed ? 'closed' : 'open'} | ${m.issues.length} |`);
  }
  const report = (label, ids) => ids.length && console.log(`\n${label}: ${ids.join(', ')}`);
  report('Unplaced (no parent card, no wave row)', plan.unplaced);
  report('Notes mention hotfix, name does not (label by hand if it is one)', plan.hotfixInNotes);
  report('On the board, no TASKS.md heading', plan.missingFromTasksMd);
  report('Duplicate ids on the board', plan.duplicates);
  report('Ranges that did not resolve against TASKS.md', plan.unresolvedRanges);
}

// ---------------------------------------------------------------------------
// scan

const snippet = (text) => text.replace(/\s+/g, ' ').trim().slice(0, 120);

function scan(plan) {
  const hits = [];
  const check = (where, text) => {
    const hit = findSecret(text);
    if (hit) hits.push({ where, name: hit.name, text });
  };
  for (const issue of plan.issues) {
    check(`${issue.id} body`, issue.body);
    issue.comments.forEach((comment, i) => check(`${issue.id} comment ${i + 1}`, comment.body));
  }
  for (const m of plan.milestones) check(`milestone "${m.name}"`, m.description);
  for (const hit of hits) console.log(`${hit.where}  [${hit.name}]  ${snippet(hit.text)}`);
  console.log(hits.length ? `${hits.length} hits` : 'no hits');
  return hits.length;
}

// ---------------------------------------------------------------------------
// apply

const apiPages = (path) =>
  ghJson([
    'api',
    `${path}${path.includes('?') ? '&' : '?'}per_page=100`,
    '--paginate',
    '--slurp',
  ]).flat();

function numberFromUrl(url) {
  const m = /\/issues\/(\d+)\s*$/.exec(url);
  if (!m) throw new BoardError(`Could not read an issue number from "${url.trim()}".`);
  return Number(m[1]);
}

async function apply(plan, projectNumber, { skipScan }) {
  if (!skipScan && scan(plan) > 0) {
    throw new BoardError(
      'scan found hits; read them, then re-run with --skip-scan to accept the text as it is.',
    );
  }
  const counts = {
    labels: 0,
    milestones: 0,
    issues: 0,
    closed: 0,
    comments: 0,
    items: 0,
    parents: 0,
  };

  // Labels first: `gh issue create --label` fails on a label that does not exist.
  const labels = new Set(
    ghJson(['label', 'list', '--repo', REPO, '--json', 'name', '--limit', '200']).map(
      (l) => l.name,
    ),
  );
  const wanted = [
    [TRACKED_LABEL, '1d76db', 'On the board: one task, titled "<ID> — <title>"'],
    [HOTFIX_LABEL, 'b60205', 'Branches off main as hotfix/*'],
  ];
  for (const [name, color, description] of wanted) {
    if (labels.has(name)) continue;
    await pacedWrite(() =>
      gh(['label', 'create', name, '--repo', REPO, '--color', color, '--description', description]),
    );
    counts.labels++;
    console.log(`label ${name} — created`);
  }

  // Milestones open for now: `--milestone <name>` on issue create may not
  // resolve a closed one, so they close in the last step.
  const existingMilestones = new Map(
    apiPages(`repos/${REPO}/milestones?state=all`).map((m) => [m.title, m]),
  );
  for (const m of plan.milestones) {
    const existing = existingMilestones.get(m.name);
    if (!existing) {
      const created = await pacedWrite(() =>
        ghJson(['api', '-X', 'POST', `repos/${REPO}/milestones`, '--input', '-'], {
          input: JSON.stringify({ title: m.name, description: m.description }),
        }),
      );
      existingMilestones.set(m.name, created);
      counts.milestones++;
      console.log(`milestone "${m.name}" — created`);
      continue;
    }
    const patch = {};
    if ((existing.description ?? '') !== m.description) patch.description = m.description;
    if (existing.state === 'closed') patch.state = 'open';
    if (Object.keys(patch).length === 0) {
      console.log(`milestone "${m.name}" — exists`);
      continue;
    }
    await pacedWrite(() =>
      gh(['api', '-X', 'PATCH', `repos/${REPO}/milestones/${existing.number}`, '--input', '-'], {
        input: JSON.stringify(patch),
      }),
    );
    console.log(`milestone "${m.name}" — ${Object.keys(patch).join(', ')} updated`);
  }

  // Issues: the tracked title prefix is the identity, so a re-run finds its own work.
  const tracked = listTracked();
  const numbers = new Map();
  for (const issue of plan.issues) {
    const existing = tracked.filter((candidate) => matchesId(candidate.title, issue.id));
    if (existing.length > 1) {
      throw new BoardError(
        `${issue.id} matches ${existing.length} tracked issues; fix that by hand first.`,
      );
    }
    if (existing.length === 1) {
      numbers.set(issue.id, existing[0]);
      const note =
        existing[0].milestone === issue.milestone
          ? ''
          : ` (milestone differs: "${existing[0].milestone}")`;
      console.log(`issue #${existing[0].number} ${issue.id} — exists${note}`);
      continue;
    }
    const args = [
      'issue',
      'create',
      '--repo',
      REPO,
      '--title',
      issue.title,
      '--body-file',
      '-',
      '--type',
      issue.type,
    ];
    for (const label of issue.labels) args.push('--label', label);
    if (issue.milestone) args.push('--milestone', issue.milestone);
    const url = await pacedWrite(() => gh(args, { input: issue.body }));
    const created = {
      number: numberFromUrl(url),
      url: url.trim(),
      state: 'OPEN',
      milestone: issue.milestone,
    };
    numbers.set(issue.id, created);
    counts.issues++;
    console.log(`issue #${created.number} ${issue.id} — created`);
  }

  // Close state, only where the issue is still open.
  for (const issue of plan.issues) {
    const target = numbers.get(issue.id);
    if (!issue.closed || target.state !== 'OPEN') continue;
    await pacedWrite(() =>
      gh(['issue', 'close', String(target.number), '--repo', REPO, '--reason', issue.closeReason]),
    );
    target.state = 'CLOSED';
    counts.closed++;
    console.log(`issue #${target.number} ${issue.id} — closed (${issue.closeReason})`);
  }

  // Comments, in created_at order, skipping one whose trimmed body is already there.
  for (const issue of plan.issues) {
    if (issue.comments.length === 0) continue;
    const number = numbers.get(issue.id).number;
    const posted = new Set(
      apiPages(`repos/${REPO}/issues/${number}/comments`).map((c) => c.body.trim()),
    );
    let added = 0;
    for (const comment of issue.comments) {
      if (posted.has(comment.body.trim())) continue;
      await pacedWrite(() =>
        gh(['issue', 'comment', String(number), '--repo', REPO, '--body-file', '-'], {
          input: comment.body,
        }),
      );
      posted.add(comment.body.trim());
      added++;
    }
    counts.comments += added;
    console.log(
      `issue #${number} ${issue.id} — ${added} of ${issue.comments.length} comments posted`,
    );
  }

  // Project item, Status and Estimate. `force` because Done is otherwise the
  // merge's. The Project's auto-add workflow places a tracked issue moments
  // after creation; a resumed run does not wait on it, so an item still
  // absent is added here — the one place that adds one by hand.
  for (const issue of plan.issues) {
    const target = numbers.get(issue.id);
    const changes = [];
    let item = readItem(target, String(projectNumber));
    if (!item) {
      const scope = [String(projectNumber), '--owner', OWNER, '--url', target.url];
      await pacedWrite(() => gh(['project', 'item-add', ...scope]));
      item = readItem(target, String(projectNumber));
      changes.push('added');
    }
    if (item.status !== issue.status) {
      await pacedWrite(() => setStatus(target, issue.status, { force: true, item }));
      changes.push(`status ${issue.status}`);
    }
    if (issue.estimate !== null && item.estimate !== issue.estimate) {
      await pacedWrite(() => setEstimate(target, issue.estimate, { item }));
      changes.push(`estimate ${issue.estimate}h`);
    }
    if (changes.length) counts.items++;
    console.log(`item ${issue.id} — ${changes.length ? changes.join(', ') : 'up to date'}`);
  }

  // Sub-issue links.
  for (const issue of plan.issues) {
    if (!issue.parent) continue;
    const child = numbers.get(issue.id);
    const parent = numbers.get(issue.parent);
    if (!parent) {
      console.log(
        `issue #${child.number} ${issue.id} — parent ${issue.parent} is not on the board, skipped`,
      );
      continue;
    }
    const current = ghJson([
      'issue',
      'view',
      String(child.number),
      '--repo',
      REPO,
      '--json',
      'parent',
    ]).parent;
    if (current?.number === parent.number) {
      console.log(`issue #${child.number} ${issue.id} — already under #${parent.number}`);
      continue;
    }
    await pacedWrite(() =>
      gh([
        'issue',
        'edit',
        String(child.number),
        '--repo',
        REPO,
        '--parent',
        String(parent.number),
      ]),
    );
    counts.parents++;
    console.log(
      `issue #${child.number} ${issue.id} — parent set to #${parent.number} ${issue.parent}`,
    );
  }

  // Milestones close last, once their issues are in.
  for (const m of plan.milestones) {
    const existing = existingMilestones.get(m.name);
    if (!m.closed || existing.state === 'closed') continue;
    await pacedWrite(() =>
      gh(['api', '-X', 'PATCH', `repos/${REPO}/milestones/${existing.number}`, '--input', '-'], {
        input: JSON.stringify({ state: 'closed' }),
      }),
    );
    existing.state = 'closed';
    console.log(`milestone "${m.name}" — closed`);
  }

  console.log(
    `\ncreated: ${counts.labels} labels, ${counts.milestones} milestones, ${counts.issues} issues; closed ${counts.closed}; ${counts.comments} comments; ${counts.items} items changed; ${counts.parents} parents set`,
  );
}

// ---------------------------------------------------------------------------
// verify

function verify(plan, projectNumber) {
  const failures = [];
  const compare = (what, expected, actual) => {
    const ok = expected === actual;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}: expected ${expected}, GitHub has ${actual}`);
    if (!ok) failures.push(what);
  };
  // The REST issues endpoint lists PRs too, and carries a comment count the
  // list command does not.
  const rows = apiPages(`repos/${REPO}/issues?state=all&labels=${TRACKED_LABEL}`).filter(
    (row) => !row.pull_request,
  );
  const byId = new Map();
  for (const issue of plan.issues) {
    const match = rows.filter((row) => matchesId(row.title, issue.id));
    if (match.length === 1) byId.set(issue.id, match[0]);
  }
  compare('issues', plan.issues.length, byId.size);
  compare(
    'closed issues',
    plan.issues.filter((i) => i.closed).length,
    [...byId.values()].filter((r) => r.state === 'closed').length,
  );
  compare(
    'comments',
    plan.issues.reduce((n, i) => n + i.comments.length, 0),
    [...byId.values()].reduce((n, r) => n + r.comments, 0),
  );
  const milestones = apiPages(`repos/${REPO}/milestones?state=all`);
  compare(
    'milestones',
    plan.milestones.length,
    plan.milestones.filter((m) => milestones.some((g) => g.title === m.name)).length,
  );
  // One query per issue rather than a listing of every item: the listing is
  // the burst that trips the secondary rate limit.
  let placed = 0;
  for (const row of byId.values()) {
    if (readItem({ number: row.number }, String(projectNumber))) placed++;
  }
  compare('project items', plan.issues.length, placed);
  const missing = plan.issues.filter((i) => !byId.has(i.id)).map((i) => i.id);
  if (missing.length) console.log(`missing: ${missing.join(', ')}`);
  return failures.length;
}

// ---------------------------------------------------------------------------
// CLI

const USAGE = `usage: node scripts/migrate-asana-to-github.mjs <command> [--file <export.json>]

  export                     pull the Asana board (needs ASANA_PAT) into the export file
  plan                       what apply would create, from the export and ${TASKS_MD}
  scan                       every body and comment through the secret patterns; exit 1 on a hit
  apply  --project <number>  create labels, milestones, issues, comments, items, parents [--skip-scan]
  verify --project <number>  export counts against GitHub; exit 1 on a mismatch

The export file defaults to /tmp/asana-export.json; the scratchpad is where it belongs.`;

function option(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

function loadPlan(file) {
  const board = JSON.parse(readFileSync(file, 'utf8'));
  return buildPlan(board, readFileSync(TASKS_MD, 'utf8'));
}

export async function main(argv = process.argv.slice(2)) {
  const [command] = argv;
  const file = option(argv, '--file') ?? '/tmp/asana-export.json';
  const projectNumber = option(argv, '--project') ?? PROJECT;
  switch (command) {
    case 'export':
      return exportBoard(file);
    case 'plan':
      return printPlan(loadPlan(file));
    case 'scan':
      if (scan(loadPlan(file)) > 0) process.exitCode = 1;
      return;
    case 'apply':
      return apply(loadPlan(file), projectNumber, { skipScan: argv.includes('--skip-scan') });
    case 'verify':
      if (verify(loadPlan(file), projectNumber) > 0) process.exitCode = 1;
      return;
    default:
      throw new BoardError(USAGE);
  }
}

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
