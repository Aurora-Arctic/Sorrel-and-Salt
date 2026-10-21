// The types of what tests/ imports from tasks-md.mjs: tsconfig keeps
// `allowJs` off, so an .mjs import is typed by its sibling declaration or not
// at all. Only the imported exports are declared.

/** One task's entry, as `readEntry` reads it; null when no heading carries the id. */
export function readEntry(
  text: string,
  id: string,
): { id: string; title: string; hours: number | undefined; body: string } | null;
