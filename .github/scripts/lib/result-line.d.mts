// Hand-written beside the script, because `allowJs` is off.

export function formatRun(ms: number): string;

export const NO_FAILED_TEST: string;

export function resultLine(options: {
  counts: string;
  ms?: number;
  over?: number;
  budget: 'file' | 'test';
  unexplained?: boolean;
}): string;
