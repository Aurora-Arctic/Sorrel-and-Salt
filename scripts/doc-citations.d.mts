// Hand-written beside the script, as task-board.d.mts is: `allowJs` is off.

export const DOCS: string;
export const CITATION: RegExp;
export const SECTION: RegExp;
export function sectionOf(path: string): RegExp;
export function unwrap(section: string): string;
export function citingFiles(root: string): string[];
export function citationsIn(text: string): string[];
export function sectionCitesIn(text: string): { path: string; section: string }[];
export function isSplitIndex(root: string, path: string): boolean;
