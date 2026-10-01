// Hand-written beside the script, as task-board.d.mts is: `allowJs` is off.

export function words(text: string): string[];

export function overlap(
  docs: { path: string; text: string }[],
  n?: number,
): { files: number; shared: number; pairs: { a: string; b: string; runs: number }[] };

export function passages(a: string, b: string, n?: number): string[];

export function isLiveDoc(path: string): boolean;
