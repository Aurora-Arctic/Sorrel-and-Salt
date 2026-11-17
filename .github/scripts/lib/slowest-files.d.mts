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

export function budgetLine(options: {
  over: number;
  budgetMs: number;
  budget: 'file' | 'test';
}): string;

export function buildSlowestFilesSection(
  testResults: VitestFileResult[] | undefined,
  repoRoot: string,
  options?: {
    budgetMs?: number;
    budget?: 'file' | 'test';
    fileBudget?: boolean;
    over?: number;
    notes?: string[];
  },
): { over: SlowFile[]; block: string } | null;
