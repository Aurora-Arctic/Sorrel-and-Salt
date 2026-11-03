// What a job's run may hold. The SDK keeps a run's arguments in the job's event log, so a run carries ids and the few values a
// step cannot read back from a row, and never an address, a subject, a body or a token (claude-docs/email.md, "Sending").

/** Thrown before a run starts whose arguments hold a value outside the allow-list. Names where the value is, never the value. */
export class RunArgumentRefused extends Error {
  override name = 'RunArgumentRefused';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A kind names which mail or move a run is: a lower-case word or hyphenated words, and only under `kind` or `how`. */
const KEYWORD = /^[a-z]+(?:-[a-z]+)*$/;
const KEYWORD_KEYS = new Set(['kind', 'how']);

/** The site origin or Better Auth's base under it: http or https, with no credentials, query or fragment to carry a secret. */
function isSiteUrl(value: string): boolean {
  if (!/^https?:\/\//.test(value)) return false;
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

/** A path on this site to return to: one leading slash, and no space or `@` to hold an address. */
function isReturnPath(value: string): boolean {
  return /^\/(?![/\\])/.test(value) && !/[\s@]/.test(value);
}

function allowedString(value: string, key: string | undefined): boolean {
  if (value.includes('@')) return false;
  if (key !== undefined && KEYWORD_KEYS.has(key)) return KEYWORD.test(value);
  return UUID.test(value) || isSiteUrl(value) || isReturnPath(value);
}

function check(value: unknown, path: string, key: string | undefined): void {
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value === 'string' && allowedString(value, key)) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => check(item, `${path}[${index}]`, undefined));
    return;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [name, item] of Object.entries(value)) check(item, `${path}.${name}`, name);
    return;
  }
  throw new RunArgumentRefused(`a job's run may not hold the value at args${path}`);
}

/**
 * Refuses `args` unless each value is an id, a kind under `kind` or `how`, a site origin, a return path, a finite number, a
 * boolean or null, in plain objects and arrays.
 *
 * @throws {RunArgumentRefused} naming the first refused value's place.
 */
export function assertRunArguments(args: readonly unknown[]): void {
  args.forEach((arg, index) => check(arg, `[${index}]`, undefined));
}
