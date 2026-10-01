// Hand-written beside the script: `allowJs` is off, so a test importing the
// `.mjs` reads its shape from here (the same arrangement as .ladle/config.d.mts).

import type { TasksMd } from './tasks-md.mjs';

export const REPO: string;
export const OWNER: string;
export const PROJECT: string;
export const STATUSES: string[];
export const TRACKED_LABEL: string;

export class BoardError extends Error {}

export function gh(args: string[], options?: { input?: string }): string;
export function ghJson(args: string[], options?: { input?: string }): unknown;

export interface TrackedIssue {
  number: number;
  title: string;
  state: string;
  stateReason: string | null;
  url: string;
  milestone: string | null;
  labels: string[];
}

export interface ProjectFieldRef {
  id: string;
  name: string;
  options?: { id: string; name: string }[];
}

export interface ProjectItem {
  id: string;
  projectId: string;
  fields: ProjectFieldRef[];
  status: string | null;
  estimate: number | null;
}

export function titlePrefix(id: string): string;
export function matchesId(title: string, id: string): boolean;
export function shapeIssue(issue: Record<string, unknown>): TrackedIssue;
export function shapeTracked(pages: Record<string, unknown>[][]): TrackedIssue[];
export function listTracked(): TrackedIssue[];
export function findIssue(id: string, issues?: TrackedIssue[]): TrackedIssue;

export function shapeItem(nodes: Record<string, unknown>[], number?: string): ProjectItem | null;
export function readItem(issue: Pick<TrackedIssue, 'number'>, number?: string): ProjectItem | null;
export function requireItem(
  issue: Pick<TrackedIssue, 'number'>,
  item?: ProjectItem | null,
): ProjectItem;
export function projectField(item: ProjectItem, name: string): ProjectFieldRef;

export interface Change<T> {
  from: T | null;
  to: T;
  changed: boolean;
}

export function setStatus(
  issue: Pick<TrackedIssue, 'number'>,
  target: string,
  options?: { force?: boolean; item?: ProjectItem | null },
): Change<string>;
export function setEstimate(
  issue: Pick<TrackedIssue, 'number'>,
  hours: number | string,
  options?: { item?: ProjectItem | null },
): Change<number>;

export function idOf(title: string): string | null;

export interface Milestone {
  number: number;
  title: string;
  state: string;
  openIssues: number;
  closedIssues: number;
  description: string;
}
export function shapeMilestone(milestone: Record<string, unknown>): Milestone;
export function listMilestones(): Milestone[];

export interface ItemListing {
  projectId: string | null;
  items: { id: string; number: number | null }[];
}
export function shapeItems(pages: Record<string, unknown>[]): ItemListing;
export function listItems(number?: string): ItemListing;

export interface TargetEntry {
  id: string;
  itemId: string;
  position: number;
}
export interface Move {
  id: string;
  itemId: string;
  after: string;
  afterId: string;
}
export function planMoves(target: TargetEntry[]): Move[];

export interface ReorderPlan {
  projectId: string | null;
  skipped: string[];
  missing: string[];
  unlisted: string[];
  misplaced: string[];
  descriptions: string[];
  target: string[];
  considered: number;
  moves: Move[];
}
export function planReorder(input: {
  issues: TrackedIssue[];
  milestones: Milestone[];
  listing: ItemListing;
  tasks: TasksMd;
}): ReorderPlan;
export function readReorderPlan(): ReorderPlan;
export function reorderMutationArgs(projectId: string, move: Move): string[];
export function pacedWrite<T>(fn: () => T): Promise<T>;
export function applyReorder(
  plan: ReorderPlan,
  options?: { limit?: number; onMove?: (move: Move) => void },
): Promise<number>;

export const SECRET_PATTERNS: {
  name: string;
  pattern: RegExp;
  prepare?: (text: string) => string;
  reject?: (match: string) => boolean;
}[];
export function findSecret(text: string): { name: string; match: string } | null;
export function postComment(issue: Pick<TrackedIssue, 'number'>, text: string): void;

export function main(argv?: string[]): Promise<void>;
