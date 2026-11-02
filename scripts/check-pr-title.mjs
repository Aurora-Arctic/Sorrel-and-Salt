#!/usr/bin/env node
// Fails a PR whose title does not open with every task id its body closes, so the
// merge commit carries them and the progress tally counts them. The title, body
// and branch arrive as env vars, never as arguments or interpolated text: a PR
// body is untrusted.
//
// env: PR_TITLE, PR_BODY, PR_HEAD_REF, REPO, GH_TOKEN

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { closedIssueNumbers, idOfIssueTitle, missingIds } from './task-ids.mjs';

const issueTitle = (repo, n) =>
  JSON.parse(
    execFileSync('gh', ['issue', 'view', String(n), '--repo', repo, '--json', 'title'], {
      encoding: 'utf8',
    }),
  ).title;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { PR_TITLE = '', PR_BODY = '', PR_HEAD_REF = '', REPO = '' } = process.env;
  const ids = closedIssueNumbers(PR_BODY).flatMap((n) => {
    const id = idOfIssueTitle(issueTitle(REPO, n));
    return id ? [id] : [];
  });
  const missing = missingIds({ title: PR_TITLE, headRef: PR_HEAD_REF, ids });
  if (missing.length) {
    console.error(
      `The PR title must open with every task id the body closes. Missing: ${missing.join(', ')}.`,
    );
    console.error(`Example: "${ids.join('/')} — Short title".`);
    process.exit(1);
  }
  console.log(ids.length ? `The title names ${ids.join(', ')}.` : 'The PR closes no task.');
}
