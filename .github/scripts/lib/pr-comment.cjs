// The one layout every CI comment on a pull request uses, and the code that
// posts it. CommonJS because actions/github-script loads it with `require`.
//
// A sectioned comment (Vitest, Playwright) is written by several jobs at once,
// and GitHub's comment API has no conditional update, so each job writes only
// its own section, then re-reads the comment and writes again if a concurrent
// write dropped it (claude-docs/ci/pr-comments.md).
const fs = require('node:fs');
const crypto = require('node:crypto');

const STATUSES = {
  passed: { mark: '✅', word: 'Passed' },
  failed: { mark: '❌', word: 'Failed' },
  running: { mark: '⏳', word: 'Running' },
  skipped: { mark: '⏭️', word: 'Skipped' },
  warning: { mark: '⚠️', word: 'Warning' },
};

const LAYOUTS = {
  vitest: {
    title: 'Vitest',
    column: 'Part',
    sections: [
      { key: 'dom', label: 'DOM (`dom`)' },
      { key: 'node', label: 'Node (`unit`, `rsc`)' },
      { key: 'db', label: 'Database (`db`, `db-mocking`, `workflow`)' },
      { key: 'result', label: 'Merged Result and Coverage' },
    ],
  },
  playwright: {
    title: 'Playwright',
    column: 'Suite',
    sections: [
      { key: 'gate', label: 'Gate Specs' },
      { key: 'stories', label: 'Stories' },
      { key: 'coverage', label: 'Coverage' },
    ],
  },
};

const LOG_LINES = 100;
// GitHub refuses a comment over 65,536 characters; a sectioned comment holds
// up to four sections, so each gets a smaller share.
const LIMITS = {
  single: { details: 40000, log: 20000 },
  section: { details: 12000, log: 6000 },
};
const VERIFY_DELAY_MS = 3000;
const VERIFY_JITTER_MS = 2000;
const MAX_ATTEMPTS = 5;

function heading(level, status, title) {
  const { mark, word } = STATUSES[status];
  return `${'#'.repeat(level)} ${mark} ${title} · ${word}`;
}

function footer({ sha, duration, notes = [], runUrl } = {}) {
  const parts = [];
  if (sha) parts.push(`Commit \`${sha.slice(0, 7)}\``);
  if (duration) parts.push(duration);
  parts.push(...notes);
  if (runUrl) parts.push(`[View Run](${runUrl})`);
  return parts.length ? `<sub>${parts.join(' · ')}</sub>` : '';
}

function logBlock(log) {
  const longestRun = Math.max(0, ...(log.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `<details><summary>Output</summary>\n\n${fence}text\n${log}\n${fence}\n\n</details>`;
}

function capped(text, max, what) {
  if (!text || text.length <= max) return text;
  return `*The ${what} is too long for a comment; the job summary has it in full.*`;
}

function tail(log, maxChars) {
  const lines = log.split('\n').slice(-LOG_LINES).join('\n');
  return lines.length <= maxChars ? lines : lines.slice(-maxChars);
}

function join(blocks) {
  return blocks.filter(Boolean).join('\n\n');
}

// The single-result layout: a lint, a typecheck, the branch rules, a deploy.
function renderComment({ marker, title, status, summary, details, log, footer: meta }) {
  return join([
    marker,
    heading(3, status, title),
    summary,
    capped(details, LIMITS.single.details, 'breakdown'),
    log ? logBlock(tail(log, LIMITS.single.log)) : '',
    footer(meta),
  ]);
}

const STATE_PATTERN = /<!-- ci-state (.*?) -->/s;

// JSON never holds `--` outside a string, so escaping it inside one keeps the
// state from closing its HTML comment early.
function encodeState(state) {
  return `<!-- ci-state ${JSON.stringify(state).replace(/--/g, '-\\u002d')} -->`;
}

function blockPattern(key) {
  return new RegExp(
    `<!-- ci-section:${key} -->\\n\\n([\\s\\S]*?)\\n\\n<!-- /ci-section:${key} -->`,
  );
}

function parseSectioned(body, layout) {
  const match = body.match(STATE_PATTERN);
  if (!match) return null;
  let state;
  try {
    state = JSON.parse(match[1]);
  } catch {
    return null;
  }
  const blocks = {};
  for (const { key } of layout.sections) {
    const block = body.match(blockPattern(key));
    if (block) blocks[key] = block[1];
  }
  return { state, blocks };
}

function overallStatus(statuses) {
  for (const status of ['failed', 'running', 'warning', 'passed']) {
    if (statuses.includes(status)) return status;
  }
  return 'skipped';
}

function cell(text) {
  return (text ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|');
}

function renderSectioned({ marker, layout, title, state, blocks }) {
  const present = layout.sections.filter(({ key }) => state.sections[key]);
  const table = [
    `| ${layout.column} | Status | Result |`,
    '| --- | --- | --- |',
    ...present.map(({ key, label }) => {
      const { status, summary } = state.sections[key];
      const { mark, word } = STATUSES[status];
      return `| ${label} | ${mark} ${word} | ${cell(summary)} |`;
    }),
  ].join('\n');
  return join([
    `${marker}\n${encodeState(state)}`,
    heading(3, overallStatus(present.map(({ key }) => state.sections[key].status)), title),
    table,
    ...present
      .filter(({ key }) => blocks[key])
      .map(
        ({ key }) => `<!-- ci-section:${key} -->\n\n${blocks[key]}\n\n<!-- /ci-section:${key} -->`,
      ),
    footer({ sha: state.sha, runUrl: state.url }),
  ]);
}

function sectionBlock(label, { status, details, log }) {
  const content = [
    capped(details, LIMITS.section.details, 'breakdown'),
    log ? logBlock(tail(log, LIMITS.section.log)) : '',
  ];
  if (!content.some(Boolean)) return '';
  return join([heading(4, status, label), ...content]);
}

// What one write does to a sectioned comment, from its current body (null when
// none exists). `write` is a reset ({ reset, skipped }) or one section's result
// ({ key, status, summary, details, log }). The action is `write`, `none` (post
// nothing) or `stale` (the comment belongs to a newer run).
function planSectionWrite(
  body,
  { layout, title = layout.title, marker, run, mergeQueue, write, token },
) {
  const parsed = body ? parseSectioned(body, layout) : null;
  const prior = parsed?.state ?? null;
  if (prior && prior.run > run.id) return { action: 'stale' };

  const keys = layout.sections.map(({ key }) => key);
  const fresh = (status) => ({ status, summary: '', token, attempt: run.attempt });
  const state = { v: 1, run: run.id, sha: run.sha, url: run.url, reset: null, sections: {} };
  const blocks = {};
  const sameRun = prior?.run === run.id;

  if (write.reset) {
    if (mergeQueue) return { action: 'none' };
    const skipped = new Set(write.skipped);
    if (!body && keys.every((key) => skipped.has(key))) return { action: 'none' };
    state.reset = token;
    for (const key of keys) {
      const reported = sameRun ? prior.sections[key] : null;
      // Normally the reset lands first; one that arrives after a section of its
      // own attempt has reported must not put that section back to running.
      if (reported?.reported && reported.attempt >= run.attempt) {
        state.sections[key] = reported;
        if (parsed.blocks[key]) blocks[key] = parsed.blocks[key];
      } else {
        state.sections[key] = fresh(skipped.has(key) ? 'skipped' : 'running');
      }
    }
  } else {
    const section = layout.sections.find(({ key }) => key === write.key);
    if (!section) throw new Error(`The ${title} comment has no section "${write.key}".`);
    if (mergeQueue && !body && write.status !== 'failed') return { action: 'none' };
    if (sameRun) {
      state.reset = prior.reset;
      Object.assign(state.sections, prior.sections);
      Object.assign(blocks, parsed.blocks);
    } else if (!mergeQueue) {
      for (const key of keys) state.sections[key] = fresh('running');
    }
    state.sections[write.key] = {
      status: write.status,
      summary: write.summary ?? '',
      token,
      attempt: run.attempt,
      reported: true,
    };
    const block = sectionBlock(section.label, write);
    if (block) blocks[write.key] = block;
    else delete blocks[write.key];
  }

  return { action: 'write', body: renderSectioned({ marker, layout, title, state, blocks }) };
}

// Whether a write survived: `yes`, `no` (a concurrent write dropped it), or
// `stale` (a newer run has taken the comment over).
function sectionLanded(body, { layout, run, write, token }) {
  const state = body ? parseSectioned(body, layout)?.state : null;
  if (!state || state.run < run.id) return 'no';
  if (state.run > run.id) return 'stale';
  const landed = write.reset ? state.reset === token : state.sections[write.key]?.token === token;
  return landed ? 'yes' : 'no';
}

function inputsFromEnv(env) {
  return {
    checkName: env.CHECK_NAME ?? '',
    slug: env.MARKER_SLUG ?? '',
    prNumber: env.PR_NUMBER ?? '',
    mergeQueue: env.MERGE_QUEUE === 'true',
    outcome: env.OUTCOME ?? '',
    logFile: env.LOG_FILE ?? '',
    successMode: env.SUCCESS_MODE || 'minimize',
    summary: env.SUMMARY ?? '',
    details: env.DETAILS ?? '',
    duration: env.DURATION ?? '',
    section: env.SECTION ?? '',
    reset: env.RESET === 'true',
    skippedSections: (env.SKIPPED_SECTIONS ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean),
  };
}

function runOf(context) {
  return {
    id: Number(context.runId),
    attempt: Number(context.runAttempt ?? process.env.GITHUB_RUN_ATTEMPT ?? 1),
    sha: context.payload?.pull_request?.head?.sha ?? context.sha,
    url: `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
  };
}

// Every comment carrying the marker, oldest first; the oldest is the one kept.
async function markedComments(github, { owner, repo, issue_number }, marker) {
  const all = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
    per_page: 100,
  });
  return all.filter((comment) => comment.body?.includes(marker)).sort((a, b) => a.id - b.id);
}

async function upsertComment(github, where, marker, body) {
  const [existing] = await markedComments(github, where, marker);
  if (existing) {
    await github.rest.issues.updateComment({ ...where, comment_id: existing.id, body });
  } else {
    await github.rest.issues.createComment({ ...where, body });
  }
}

function readLog(readFile, logFile) {
  try {
    return readFile(logFile);
  } catch {
    return `No output was captured at ${logFile || '(no log file named)'}.`;
  }
}

async function postSingle({ github, where, marker, title, inputs, run, readFile }) {
  const [existing] = await markedComments(github, where, marker);
  const passed = inputs.outcome === 'success';
  if (passed && inputs.mergeQueue) return 'none';

  if (passed && inputs.successMode === 'minimize') {
    if (!existing) return 'none';
    const body = renderComment({
      marker,
      title,
      status: 'passed',
      summary: inputs.summary ? `${inputs.summary} (previously failed)` : 'Previously failed.',
      footer: { sha: run.sha, duration: inputs.duration, runUrl: run.url },
    });
    await github.rest.issues.updateComment({ ...where, comment_id: existing.id, body });
    await github.graphql(
      `mutation($id: ID!) {
        minimizeComment(input: { subjectId: $id, classifier: RESOLVED }) {
          minimizedComment { isMinimized }
        }
      }`,
      { id: existing.node_id },
    );
    return 'resolved';
  }

  const body = renderComment({
    marker,
    title,
    status: passed ? 'passed' : 'failed',
    summary: inputs.summary,
    details: inputs.details,
    log: passed ? '' : readLog(readFile, inputs.logFile),
    footer: { sha: run.sha, duration: inputs.duration, runUrl: run.url },
  });
  if (existing) {
    // An earlier pass may have hidden it; the latest result must show.
    try {
      await github.graphql(
        `mutation($id: ID!) {
          unminimizeComment(input: { subjectId: $id }) {
            unminimizedComment { isMinimized }
          }
        }`,
        { id: existing.node_id },
      );
    } catch {
      // It was not hidden.
    }
    await github.rest.issues.updateComment({ ...where, comment_id: existing.id, body });
  } else {
    await github.rest.issues.createComment({ ...where, body });
  }
  return 'written';
}

function sectionStatus(outcome) {
  if (outcome === 'success') return 'passed';
  if (outcome === 'skipped') return 'skipped';
  return 'failed';
}

async function postSectioned(options) {
  const { github, core, where, marker, title, inputs, run, readFile, sleep, random } = options;
  const layout = LAYOUTS[inputs.slug];
  if (!layout) throw new Error(`No sectioned comment is named "${inputs.slug}".`);
  const status = sectionStatus(inputs.outcome);
  const write = inputs.reset
    ? { reset: true, skipped: inputs.skippedSections }
    : {
        key: inputs.section,
        status,
        summary: inputs.summary,
        details: inputs.details,
        log: status === 'failed' ? readLog(readFile, inputs.logFile) : '',
      };
  const token = crypto.randomUUID();
  const plan = (body) =>
    planSectionWrite(body, {
      layout,
      title,
      marker,
      run,
      mergeQueue: inputs.mergeQueue,
      write,
      token,
    });

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    const [target] = await markedComments(github, where, marker);
    const { action, body } = plan(target?.body ?? null);
    if (action !== 'write') {
      core.info(`The ${title} comment needs no write (${action}).`);
      return action;
    }
    let created = null;
    if (target) {
      await github.rest.issues.updateComment({ ...where, comment_id: target.id, body });
    } else {
      created = (await github.rest.issues.createComment({ ...where, body })).data.id;
    }

    // Long enough for a write that read the comment before this one to land.
    await sleep(VERIFY_DELAY_MS + random() * VERIFY_JITTER_MS);
    const [kept] = await markedComments(github, where, marker);
    if (created !== null && kept && kept.id !== created) {
      await github.rest.issues.deleteComment({ ...where, comment_id: created });
      continue;
    }
    const landed = sectionLanded(kept?.body ?? null, { layout, run, write, token });
    if (landed === 'yes') return 'written';
    if (landed === 'stale') return 'stale';
    core.info(`A concurrent write dropped this section of the ${title} comment; writing it again.`);
  }
  core.warning(
    `The ${title} comment could not be confirmed after ${options.maxAttempts} attempts.`,
  );
  return 'unconfirmed';
}

async function postComment({
  github,
  context,
  core,
  inputs,
  readFile = (file) => fs.readFileSync(file, 'utf8'),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random = Math.random,
  maxAttempts = MAX_ATTEMPTS,
}) {
  const where = {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: Number(inputs.prNumber),
  };
  const slug = inputs.mergeQueue ? `${inputs.slug}-mergequeue` : inputs.slug;
  const marker = `<!-- ci-${slug} -->`;
  const sectioned = Boolean(inputs.section) || inputs.reset;
  const baseTitle = sectioned
    ? (LAYOUTS[inputs.slug]?.title ?? inputs.checkName)
    : inputs.checkName;
  const title = inputs.mergeQueue ? `${baseTitle} (Merge Queue)` : baseTitle;
  const run = runOf(context);
  const options = {
    github,
    core,
    where,
    marker,
    title,
    inputs,
    run,
    readFile,
    sleep,
    random,
    maxAttempts,
  };
  return sectioned ? postSectioned(options) : postSingle(options);
}

module.exports = {
  LAYOUTS,
  STATUSES,
  renderComment,
  planSectionWrite,
  sectionLanded,
  inputsFromEnv,
  runOf,
  upsertComment,
  postComment,
};
