export const BRANCH: RegExp;
export const LEAD: RegExp;
export function leadIds(line: string): string[];
export function closedIssueNumbers(body: string | null | undefined): number[];
export function idOfIssueTitle(title: string): string | null;
export function missingIds(pr: { title: string; headRef: string; ids: string[] }): string[];
export function idsNamedByMerge(subject: string, body: string): string[];
