// Hand-written beside the script, as task-board.d.mts is: `allowJs` is off.

export const TASKS_MD: string;
export const ID: string;
export const HEADING: RegExp;
export const WAVE_ROW: RegExp;
export const ID_ONLY: RegExp;
export const ID_RANGE: RegExp;

export interface Wave {
  number: number;
  name: string;
  cell: string;
  ids: string[];
}

export interface TasksMd {
  order: string[];
  hours: Map<string, number>;
  retired: Set<string>;
  waves: Wave[];
  unresolved: string[];
}

export function expandIds(cell: string, order: string[]): { ids: string[]; unresolved: string[] };
export function readTasksMd(text: string): TasksMd;
export function loadTasksMd(): TasksMd;
