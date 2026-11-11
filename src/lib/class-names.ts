/** Joins the class names that are set, in order, with one space; `''` when none is, so a caller can fall back with `|| undefined`. */
export function cx(...parts: readonly (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
