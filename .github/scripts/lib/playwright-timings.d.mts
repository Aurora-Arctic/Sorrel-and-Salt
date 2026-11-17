// Hand-written beside the script, because `allowJs` is off.

export const TEST_BUDGET_MS: number;

export interface TestTiming {
  file: string;
  title: string;
  ms: number;
}

export function perFileRows(
  timings: TestTiming[],
): { name: string; startTime: number; endTime: number; assertionResults: number[] }[];

export function overBudgetWarnings(timings: TestTiming[]): string[];

export function collectTimings(report: unknown): TestTiming[];
