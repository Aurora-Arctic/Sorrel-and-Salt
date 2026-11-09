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

export interface BoardItem {
  id: string;
  projectId?: string;
  projectNumber: number;
  status: string | null;
  estimate: number | null;
}
export interface PlacementPlan {
  id: string;
  number: number;
  to: number;
  itemId: string | null;
  from: { projectNumber: number; itemId: string }[];
  add: boolean;
  status: string | null;
  estimate: number | null;
  addLabels: string[];
  removeLabels: string[];
}
export function shapeItem(nodes: unknown[], number?: number | string): BoardItem | null;
export function planProjectPlacement(
  issue: {
    number: number;
    title: string;
    milestone: string | null;
    labels?: string[];
    nodeId?: string;
  },
  items: BoardItem[],
): PlacementPlan | null;
export function planReorder(options: {
  issues: Issue[];
  milestones: (Milestone & { openIssues: number; description: string })[];
  listing: Listing;
  tasks: { order: string[]; waves: { number: number; ids: string[] }[] };
  project: unknown;
}): { target: string[]; missing: string[]; moves: Move[] };
