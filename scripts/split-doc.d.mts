// Hand-written beside the script, as task-board.d.mts is: `allowJs` is off.

export interface SplitPlan {
  dir: string;
  sections: { file: string; sentence: string }[];
  ownFile?: { heading: string; file: string }[];
}

export function splitDoc(
  text: string,
  plan: SplitPlan,
): { files: { name: string; text: string }[]; index: string };
