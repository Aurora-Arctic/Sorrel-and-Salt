/** The page an address opens: the pattern as the folders under `src/app` name it, and its dynamic segments' values. */
export type RouteMatch = { pattern: string; params: Record<string, string> };

const dynamicName = (segment: string): string | null => {
  const found = /^\[([^\]]+)\]$/.exec(segment);
  return found ? (found[1] ?? null) : null;
};

const segmentsOf = (path: string): string[] => path.split('/').filter((segment) => segment !== '');

/** Matches one pattern to the address's segments: its params, and a score that is higher the earlier a static segment stands. */
function fit(
  segments: string[],
  address: string[],
): { params: Record<string, string>; score: number[] } | null {
  if (segments.length !== address.length) return null;
  const params: Record<string, string> = {};
  const score: number[] = [];
  for (let at = 0; at < segments.length; at += 1) {
    const segment = segments[at] as string;
    const value = address[at] as string;
    const name = dynamicName(segment);
    if (name) {
      params[name] = value;
      score.push(0);
    } else if (segment === value) {
      score.push(1);
    } else {
      return null;
    }
  }
  return { params, score };
}

const better = (a: number[], b: number[]): boolean => {
  for (let at = 0; at < a.length; at += 1) {
    if (a[at] !== b[at]) return (a[at] as number) > (b[at] as number);
  }
  return false;
};

/**
 * Which of the patterns an address opens, or null when none does. The query string and the hash are
 * dropped, and a static segment beats a dynamic one where both fit, as Next serves it. Next has no
 * client-side matcher for this.
 */
export function matchPattern(patterns: readonly string[], href: string): RouteMatch | null {
  const path = href.split(/[?#]/)[0] ?? href;
  const address = segmentsOf(path);
  let best: { pattern: string; params: Record<string, string>; score: number[] } | null = null;
  for (const pattern of patterns) {
    const segments = segmentsOf(pattern);
    const found = fit(segments, address);
    if (found && (!best || better(found.score, best.score))) best = { pattern, ...found };
  }
  return best && { pattern: best.pattern, params: best.params };
}
