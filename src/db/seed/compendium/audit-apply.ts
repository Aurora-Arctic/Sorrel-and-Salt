import type { AuditCandidate } from '../types';
import { parseEntryFile, SECTION_HEADINGS } from './parse-entry';

// The attribution audit's `--apply` on one file's text: the file goes to `needs-review` and each flagged citation gains one block in its
// `#### Questions for the Curator`, opening with a marker so a second run adds nothing. A text edit, so the curator's comments and prose survive; neither is hashed.

export type ApplyResult = { text: string; added: number } | { issue: string };

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/** The marker a candidate's block opens with: `<!-- audit:<source>:<headedAs> -->`. */
export function auditMarker(candidate: Pick<AuditCandidate, 'source' | 'headedAs'>): string {
  return `<!-- audit:${candidate.source}:${candidate.headedAs ?? ''} -->`;
}

/** The question a candidate puts to the curator, after its marker. */
function blockOf(candidate: AuditCandidate): string {
  const where = candidate.citedOn
    .map((on) => (on === 'entry' ? 'the entry' : `the ${on}`))
    .join(', ');
  const heading = candidate.headedAs ? ` under "${candidate.headedAs}"` : '';
  const others =
    candidate.candidates.length > 0
      ? ` It may mean ${candidate.candidates.join(' or ')} instead.`
      : '';
  return [
    auditMarker(candidate),
    `Does ${candidate.source}${heading}, cited on ${where}, describe ${candidate.canonicalName}?${others} The audit found: ${candidate.evidence.join(' ')} Settle it as \`stated\` or \`resolved\` from the source, or replace the citation.`,
  ].join('\n');
}

/**
 * `text` with `candidates` applied: `status: needs-review` unless already there or a `draft`, and one block per candidate whose marker is absent,
 * at the end of the Questions section (made before Edit Notes when absent).
 */
export function applyAudit(
  path: string,
  text: string,
  candidates: readonly AuditCandidate[],
): ApplyResult {
  const before = parseEntryFile(path, text);
  if (!before.file) return { issue: before.issues.join('\n') };
  const frontmatter = FRONTMATTER.exec(text);
  if (!frontmatter) return { issue: `${path} has no frontmatter.` };

  const fresh = candidates.filter((candidate) => !text.includes(auditMarker(candidate)));
  let edited = text;
  if (before.file.status === 'approved' && candidates.length > 0) {
    const head = frontmatter[0].replace(/^status:.*$/m, 'status: needs-review');
    edited = head + edited.slice(frontmatter[0].length);
  }

  if (fresh.length > 0) {
    const blocks = fresh.map(blockOf).join('\n\n');
    const lines = edited.split('\n');
    const notes = lines.findIndex((line) => line.trim() === `#### ${SECTION_HEADINGS.editNotes}`);
    const hasQuestions = lines.some((line) => line.trim() === `#### ${SECTION_HEADINGS.questions}`);
    const insert = hasQuestions ? blocks : `#### ${SECTION_HEADINGS.questions}\n\n${blocks}`;
    if (notes === -1) {
      edited = `${edited.trimEnd()}\n\n${insert}\n`;
    } else {
      const above = lines.slice(0, notes).join('\n').trimEnd();
      const below = lines.slice(notes).join('\n');
      edited = `${above}\n\n${insert}\n\n${below}`;
    }
  }

  const after = parseEntryFile(path, edited);
  if (!after.file)
    return { issue: `${path} would not parse after the audit: ${after.issues.join('\n')}` };
  return { text: edited, added: fresh.length };
}
