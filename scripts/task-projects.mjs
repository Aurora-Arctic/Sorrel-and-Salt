// The board's GitHub Projects, the one place a Project number is written (claude-docs/task-tracking.md, "The board").
// A milestone belongs to the Project whose `milestonePrefix` starts its title, or else to the one Project marked `default`.
// A task id belongs to the Project whose `prefix` letter starts it.

export const PROJECTS = [
  {
    number: 1,
    title: 'Sorrel & Salt',
    // The directory under claude-docs/tasks/ and claude-docs/waves/ holding this Project's entries.
    slug: 'v1',
    // Its ids: M<milestone>.<n>, MB.<n> for bugs and gaps, MW.<n> for wave close-outs.
    prefix: 'M',
    milestonePrefix: '',
    bugfixes: 'Z. Bugfixes',
    default: true,
    // Its own auto-add workflow places a `tracked` issue; the script never adds one here.
    autoAdd: true,
  },
  {
    number: 4,
    title: 'Sorrel & Salt V1.Next',
    slug: 'v1-next',
    // Its ids: N<wave>.<n>, ND.<n> on N · Z. Deferred, NO.<n> on N · Z. Outside the Website, NB.<n> for bugs.
    prefix: 'N',
    milestonePrefix: 'N · ',
    bugfixes: 'N · Z. Bugfixes',
    // Project 1's auto-add filter is `is:issue label:tracked -label:v1-next`; a new Project's label joins it as one more `-label:` term.
    label: 'v1-next',
    autoAdd: false,
  },
];

/** Milestones that say nothing about a Project: a retired task stays on the Project it was retired from. */
export const NEUTRAL_MILESTONES = ['Retired — not done'];

export const DEFAULT_PROJECT = PROJECTS.find((project) => project.default);

export class ProjectConfigError extends Error {}

export function projectByNumber(number, projects = PROJECTS) {
  const project = projects.find((candidate) => String(candidate.number) === String(number));
  if (!project) {
    const known = projects.map((candidate) => candidate.number).join(', ');
    throw new ProjectConfigError(`Project ${number} is not configured; configured: ${known}.`);
  }
  return project;
}

export function projectBySlug(slug, projects = PROJECTS) {
  return projects.find((candidate) => candidate.slug === slug) ?? null;
}

const byPrefix = (projects, test) => {
  const listed = projects.filter((project) => project.milestonePrefix && test(project));
  return listed[0] ?? projects.find((project) => project.default);
};

/** The Project a milestone's issues sit on; null for no milestone or a neutral one. */
export function projectOfMilestone(title, projects = PROJECTS) {
  if (!title || NEUTRAL_MILESTONES.includes(title)) return null;
  return byPrefix(projects, (project) => title.startsWith(project.milestonePrefix));
}

/** The Project a task id belongs to, by its first letter. */
export function projectOfId(id, projects = PROJECTS) {
  const letter = id.slice(0, 1).toUpperCase();
  return (
    projects.find((project) => project.prefix === letter) ??
    projects.find((project) => project.default)
  );
}

/** The Project of a wave row in TASKS.md: `**7 — …**` is the default's, `**N · 01 — …**` the Project whose prefix is N. */
export function projectOfWave(wave, projects = PROJECTS) {
  return byPrefix(projects, (project) => project.prefix === wave.letter);
}

/** The milestone title a wave row names, up to its own name: `Wave 07`, `N · Wave 01`. */
export const waveTitle = (wave, project = projectOfWave(wave)) =>
  `${project.milestonePrefix}Wave ${String(wave.number).padStart(2, '0')}`;

/** The letters every Project's ids and branches start with, for a pattern. */
export const ID_LETTERS = PROJECTS.map((project) => project.prefix).join('');
