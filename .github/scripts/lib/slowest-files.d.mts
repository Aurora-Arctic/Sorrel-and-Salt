// Hand-written beside the script, because `allowJs` is off.

export const BUDGET_MS: number;

export interface SlowFile {
  file: string;
  tests: number;
  ms: number;
}

export interface VitestFileResult {
  name: string;
  startTime?: number;
  endTime?: number;
  assertionResults?: unknown[];
}

export function buildSlowestFilesSection(
  testResults: VitestFileResult[] | undefined,
  repoRoot: string,
  options?: { budgetMs?: number },
): { over: SlowFile[]; block: string } | null;
