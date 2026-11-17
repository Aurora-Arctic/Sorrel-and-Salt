// Hand-written beside the script, because `allowJs` is off.

export const TEST_BUDGET_MS: number;

export interface TestTiming {
  file: string;
  title: string;
  ms: number;
}

export function collectTimings(report: unknown): TestTiming[];
