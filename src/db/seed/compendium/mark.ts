import { parseDocument } from 'yaml';
import { parseEntryFile } from './parse-entry';

// `npm run seed:mark <file>`: writes `seedUpdate: <hash>` into the file's frontmatter, the hash of the file as it stands, so the seed applies the change only
// while the file stays as read. Through yaml's `parseDocument`, so comments and key order survive; the body is kept byte for byte.

export type MarkResult = { text: string; hash: string } | { issue: string };

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/**
 * `text` with `seedUpdate` set to its own hash, or the one issue that stops
 * it: a file that does not parse, or one that is not `approved`, since the
 * seed never writes another status and a mark on it would only go stale.
 */
export function markFile(path: string, text: string): MarkResult {
  const parsed = parseEntryFile(path, text);
  if (!parsed.file) return { issue: parsed.issues.join('\n') };
  if (parsed.file.status !== 'approved') {
    return {
      issue: `${path} is ${parsed.file.status}: only an approved file is marked for update.`,
    };
  }
  const match = FRONTMATTER.exec(text);
  if (!match) return { issue: `${path} has no frontmatter.` };
  const document = parseDocument(match[1]);
  document.set('seedUpdate', parsed.file.hash);
  const frontmatter = document.toString({ lineWidth: 0 });
  return {
    text: `---\n${frontmatter}---\n${text.slice(match[0].length)}`,
    hash: parsed.file.hash,
  };
}
