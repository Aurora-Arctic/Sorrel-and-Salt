export type SpecialServer = 'configured-providers' | 'compendium-cache';

/** The specs only a special server serves, as the paths a command-line filter is matched against. */
const SPECIAL_SPECS: Record<SpecialServer, string> = {
  'configured-providers': 'tests/e2e/sign-in-configured-providers.spec.ts',
  'compendium-cache': 'tests/e2e/compendium-cache.spec.ts',
};

const ALL = Object.keys(SPECIAL_SPECS) as SpecialServer[];

// Options that change how a run reports and never which tests it selects.
const HARMLESS_OPTION =
  /^(--(reporter|workers|retries|timeout|repeat-each|trace|max-failures)=.*|--(headed|quiet))$/;

/**
 * Which of the special servers a run needs, read from the command line: the files it names. A run that names
 * no file, uses any option that could select more (`--project`, `--grep`, `--last-failed`, `--ui`), or is
 * not `playwright test` at all gets both, so a doubt starts a server rather than leaving a spec without one.
 * A filter is a pattern matched against the spec's path, as Playwright reads it, with a `:line` suffix dropped.
 */
export function specialServersFor(argv: string[]): SpecialServer[] {
  const command = argv.indexOf('test');
  if (command === -1) return ALL;

  const args = argv.slice(command + 1);
  if (args.length === 0 || args.some((arg) => arg.startsWith('-') && !HARMLESS_OPTION.test(arg)))
    return ALL;
  const filters = args.filter((arg) => !arg.startsWith('-'));
  if (filters.length === 0) return ALL;

  try {
    const patterns = filters.map((filter) => new RegExp(filter.replace(/(:\d+){1,2}$/, '')));
    return ALL.filter((server) => patterns.some((pattern) => pattern.test(SPECIAL_SPECS[server])));
  } catch {
    return ALL;
  }
}
