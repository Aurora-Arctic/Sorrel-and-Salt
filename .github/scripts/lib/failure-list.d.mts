// Hand-written beside the script, because `allowJs` is off.

export const MAX_DETAILS: number;
export const FLAKY_NOTE: string;

export function stripAnsi(str: string): string;

export interface Failure {
  file: string;
  title: string;
  message: string;
  tags?: string[];
  flaky?: boolean;
}

export function formatFailures(
  failures: Failure[],
  options?: { heading?: string; tagPattern?: RegExp },
): string;
