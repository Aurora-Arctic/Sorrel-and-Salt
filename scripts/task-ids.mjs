// How a merged PR names the tasks it finishes, read by the project-progress tally
// and by the PR title check. Only the id-first form counts: an id mentioned
// mid-sentence ("the check M1.5 added") is a reference, not a completion.

import { ID } from './tasks-md.mjs';

/** `Merge pull request #156 from org/feature/m2.6-build-…` names its task in the branch. */
export const BRANCH =
  /from [^/\s]+\/(?:feature|hotfix)\/(?:backlog-)?(m[a-z]*[0-9]*(?:\.[a-z0-9]+)+?)-/i;

/** `M2.4/M2.5/M0.27 — OAuth provider wiring…` names its tasks at the start. */
export const LEAD = new RegExp(String.raw`^((?:${ID})(?:\s*/\s*${ID})*)\s+[—-]\s`);

/** The ids a PR title or commit line opens with, as written (not case-normalised). */
export function leadIds(line) {
  const m = LEAD.exec(line);
  return m ? m[1].split(/\s*[,/]\s*/) : [];
}

/** The issue numbers a PR body closes, by the same keywords `close-task-on-merge.yml` reads. */
export function closedIssueNumbers(body) {
  const numbers = new Set();
  const closing =
    /\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved):? +#([0-9]+)/gi;
  for (const m of (body ?? '').matchAll(closing)) numbers.add(Number(m[1]));
  return [...numbers].sort((a, b) => a - b);
}

/** The task id an issue title opens with (`<ID> — `), or null. */
export function idOfIssueTitle(title) {
  return new RegExp(String.raw`^(${ID}) — `).exec(title)?.[1] ?? null;
}

/**
 * The ids a PR must add to its title: every id it closes that the title does not open with.
 * A PR closing one task passes untitled when its branch (`feature/<id>-…`) already names it.
 */
export function missingIds({ title, headRef, ids }) {
  const named = new Set(leadIds(title).map((id) => id.toUpperCase()));
  const wanted = [...new Set(ids)];
  if (
    wanted.length === 1 &&
    BRANCH.exec(`from o/${headRef}`)?.[1].toUpperCase() === wanted[0].toUpperCase()
  )
    return [];
  return wanted.filter((id) => !named.has(id.toUpperCase()));
}

/**
 * The ids a merge commit names outside the tally's tail form: its branch, and the
 * id-first form in its subject or in the first line of its body, which is where
 * GitHub writes the PR title.
 */
export function idsNamedByMerge(subject, body) {
  const firstBodyLine = (body ?? '').split('\n', 1)[0];
  const branch = BRANCH.exec(subject)?.[1];
  return [...(branch ? [branch] : []), ...leadIds(subject), ...leadIds(firstBodyLine)];
}
