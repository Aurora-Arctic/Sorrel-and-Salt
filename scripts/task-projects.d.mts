export interface Project {
  number: number;
  title: string;
  slug: string;
  bugfixes: string;
  default?: boolean;
  autoAdd?: boolean;
  label?: string;
  milestones: string[];
}
export const PROJECTS: Project[];
export const NEUTRAL_MILESTONES: string[];
export const DEFAULT_PROJECT: Project;
export class ProjectConfigError extends Error {}
export function projectByNumber(number: number | string, projects?: Project[]): Project;
export function projectBySlug(slug: string, projects?: Project[]): Project | null;
export function projectOfMilestone(title: string | null, projects?: Project[]): Project | null;
export function projectOfWave(number: number, projects?: Project[]): Project;
