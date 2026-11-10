export const REPO: string;
export const RETIRED_MILESTONE: string;
export class BoardError extends Error {}

export interface Issue {
  number: number;
  title: string;
  milestone: string | null;
  state?: string;
  stateReason?: string | null;
}
export interface Milestone {
  number: number;
  title: string;
  state: string;
}
export interface Listing {
  projectId: string | null;
  items: { id: string; number: number | null }[];
}
export interface Move {
  id?: string;
  itemId: string;
  after?: string;
  afterId: string;
}

export function findIssue<T extends Issue>(id: string, issues?: T[]): T;
export function findMilestone<T extends Milestone>(
  title: string,
  milestones: T[],
  options?: { open?: boolean },
): T;
export function issueEditArgs(
  issue: { number: number },
  fields: Record<string, string | number>,
): string[];
export function parseMoveArgs(args: string[]): { id: string; after?: string; last?: true };
export function planPlacement(options: {
  issues: Issue[];
  listing: Listing;
  id: string;
  after?: string;
  last?: boolean;
}): { projectId: string | null; move: Move | null };
export function reorderMutationArgs(projectId: string, move: Move): string[];
export function main(argv?: string[]): Promise<void>;
export function graphqlArgs(
  query: string,
  variables?: Record<string, string | number>,
  flags?: string[],
): string[];
export function addItemArgs(projectId: string, contentId: string): string[];
export function deleteItemArgs(projectId: string, itemId: string): string[];
