import { describe, expect, it } from 'vitest';
import { readSource, sourceFiles } from '../support/repo-scan';

// The uuid check, the token hash, the not-blank CHECK, the one-field refusal and the message-then-send mail start each have
// one home. A second copy would have to change with the first and nothing would say so.

const sources = () => sourceFiles({ under: 'src/' });

/** Every `file:line` in `files` where `pattern` (global) starts a match, `except` the file that defines the shared piece. */
function hitsOf(files: string[], pattern: RegExp, except?: string): string[] {
  return files
    .filter((file) => file !== except)
    .flatMap((file) => {
      const source = readSource(file);
      return [...source.matchAll(pattern)].map(
        (match) => `${file}:${source.slice(0, match.index).split('\n').length}`,
      );
    });
}

const VALIDATION = 'src/lib/validation.ts';
const TOKENS = 'src/db/repository/tokens.ts';
const SCHEMA_PARTS = 'src/db/schema-parts.ts';
const ERRORS = 'src/lib/errors.ts';
const MAIL_JOB = 'src/lib/mail-job.ts';

// The token copies hashed one argument to hex. The seed content hash passes an encoding and the cron check takes a
// binary digest, so neither is this shape and neither is a token.
const TOKEN_HASH =
  /createHash\(\s*['"]sha256['"]\s*\)\s*\.update\(\s*[^,()]+\)\s*\.digest\(\s*['"]hex['"]\s*\)/g;

// Exactly what fieldRefusal builds: one issue on a one-name path whose sentence is also the error's message.
const ONE_FIELD_REFUSAL =
  /new ValidationError\(\s*\[\s*\{\s*path:\s*\[\s*(?:'[^']*'|"[^"]*")\s*\]\s*,\s*(?:message\s*,?\s*\}\s*,?\s*\]\s*,\s*message|message\s*:\s*([\w.]+|'[^'\\]*')\s*,?\s*\}\s*,?\s*\]\s*,\s*\1)\s*\)/g;

// The try-once body startMessageMail writes: build the message, send it if there is one, and nothing more.
const MESSAGE_THEN_SEND =
  /startMailJob\([^;]*?async\s*\(\)\s*=>\s*\{\s*const\s+(\w+)\s*=\s*await\s+[\w.]+\([^()]*\);\s*if\s*\(\1\)\s*await\s+send\(\1\);?\s*\}\s*\)/g;

/** The text of each `check(...)` call in `source`, to its balancing parenthesis. */
function checkCalls(source: string): { index: number; text: string }[] {
  return [...source.matchAll(/\bcheck\(/g)].map((match) => {
    let depth = 0;
    let end = match.index;
    for (; end < source.length; end += 1) {
      if (source[end] === '(') depth += 1;
      if (source[end] === ')' && --depth === 0) break;
    }
    return { index: match.index, text: source.slice(match.index, end + 1) };
  });
}

describe('service shared pieces', () => {
  it('checks a row id through isRowId, never RowId.safeParse', () => {
    const files = sources();

    // Precondition: the definition is scanned and still calls it, so the pattern matches real code.
    expect(hitsOf([VALIDATION], /RowId\.safeParse\(/g)).toHaveLength(1);
    expect(hitsOf(files, /RowId\.safeParse\(/g, VALIDATION)).toEqual([]);
  });

  it('builds a uuid schema only in src/lib/validation.ts', () => {
    const files = sources();

    expect(hitsOf([VALIDATION], /\bz\.guid\(/g).length).toBeGreaterThan(0);
    expect(hitsOf(files, /\bz\.(?:guid|uuid)\(/g, VALIDATION)).toEqual([]);
  });

  it('hashes a token only in src/db/repository/tokens.ts', () => {
    const files = sources();

    // Preconditions: the definition is the shape, and the legitimate hashes beside it are scanned and are not.
    expect(hitsOf([TOKENS], TOKEN_HASH)).toHaveLength(1);
    expect(files).toEqual(
      expect.arrayContaining(['src/db/seed/compendium/content-hash.ts', 'src/lib/cron-request.ts']),
    );
    expect(hitsOf(files, TOKEN_HASH, TOKENS)).toEqual([]);
  });

  it('writes a not-blank CHECK only through notBlank and notBlankIfSet', () => {
    const files = sources().filter((file) => /^src\/modules\/[^/]+\/schema\//.test(file));
    const checks = files.flatMap((file) =>
      checkCalls(readSource(file)).map((call) => ({ file, ...call })),
    );
    const copies = checks
      .filter(({ text }) => /\bbtrim\(/.test(text))
      .map(({ file, index }) => `${file}:${readSource(file).slice(0, index).split('\n').length}`);

    // Preconditions: the scan found CHECKs, the helpers are used in them, and the helpers hold the btrim.
    expect(checks.length).toBeGreaterThan(20);
    expect(checks.filter(({ text }) => /\bnotBlank(?:IfSet)?\(/.test(text)).length).toBeGreaterThan(
      10,
    );
    expect(readSource(SCHEMA_PARTS)).toMatch(/export function notBlank\b[^]*btrim\(/);
    expect(copies).toEqual([]);
  });

  it('refuses one field through fieldRefusal, not an inline ValidationError of the same shape', () => {
    const files = sources();

    // Preconditions: the pattern matches both spellings of the shape, and not a multi-issue array or a nested path.
    const shorthand = "new ValidationError([{ path: ['role'], message }], message)";
    const named = "new ValidationError([\n  { path: ['role'], message: PAUSED },\n], PAUSED)";
    expect(shorthand.match(ONE_FIELD_REFUSAL)).toHaveLength(1);
    expect(named.match(ONE_FIELD_REFUSAL)).toHaveLength(1);
    expect(
      "new ValidationError([{ path: ['a'], message: A }], B)".match(ONE_FIELD_REFUSAL),
    ).toBeNull();
    expect(
      "new ValidationError([{ path: [...at, 'form'], message: A }], A)".match(ONE_FIELD_REFUSAL),
    ).toBeNull();
    expect(
      "new ValidationError([{ path: ['a'], message: A }, { path: ['b'], message: A }], A)".match(
        ONE_FIELD_REFUSAL,
      ),
    ).toBeNull();
    expect(readSource(ERRORS)).toMatch(/export const fieldRefusal\b/);

    expect(hitsOf(files, ONE_FIELD_REFUSAL, ERRORS)).toEqual([]);
  });

  it('starts a message-then-send mail through startMessageMail, not startMailJob', () => {
    const files = sources();

    // Preconditions: the shared piece is itself the shape, so the pattern matches real code.
    expect(hitsOf([MAIL_JOB], MESSAGE_THEN_SEND)).toHaveLength(1);
    expect(hitsOf(files, MESSAGE_THEN_SEND, MAIL_JOB)).toEqual([]);
  });
});
