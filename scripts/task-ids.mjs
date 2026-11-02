// How a merged PR names the tasks it finishes, read by the project-progress tally. Only the id-first form counts: an id mentioned
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
