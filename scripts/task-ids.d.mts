export const BRANCH_NAME: string;
export const BRANCH: RegExp;
export const LEAD: RegExp;
export function leadIds(line: string): string[];
export function idsNamedByMerge(subject: string, body: string): string[];
