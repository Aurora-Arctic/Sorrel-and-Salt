// Hand-written beside the script, as task-board.d.mts is: `allowJs` is off.

export function repointCitations(
  text: string,
  doc: string,
  headings: { text: string; file: string }[],
): { text: string; count: number };

export function reflowComments(text: string, marker: string): string;
