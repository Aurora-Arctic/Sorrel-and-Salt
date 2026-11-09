// The board's GitHub Projects, the one place a Project number is written (claude-docs/task-tracking.md, "The board").
// A milestone belongs to the Project that lists it, or else to the one Project marked `default`.

export const PROJECTS = [
  {
    number: 1,
    title: 'Sorrel & Salt',
    // The directory under claude-docs/tasks/ and claude-docs/waves/ holding this Project's entries.
    slug: 'v1',
    bugfixes: 'Z. Bugfixes',
    default: true,
    // Its own auto-add workflow places a `tracked` issue; the script never adds one here.
    autoAdd: true,
    milestones: [],
  },
  {
    number: 4,
    title: 'Sorrel & Salt V1.Next',
    slug: 'v1-next',
    bugfixes: 'Z. Bugfixes — V1.Next',
    // Project 1's auto-add filter excludes this label, the only qualifier it can tell the two apart by.
    label: 'v1-next',
    autoAdd: false,
    milestones: [
      'Wave 18 — Privacy',
      'Wave 19 — Compendium ethics',
      'Wave 20 — Ethical warnings',
      'Wave 21 — Billing and memberships',
      'Wave 22 — Email consent and notifications',
      'Z. Deferred',
      'Z. Outside the Website',
      'Z. Bugfixes — V1.Next',
    ],
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

/** The Project a milestone's issues sit on; null for no milestone or a neutral one. */
export function projectOfMilestone(title, projects = PROJECTS) {
  if (!title || NEUTRAL_MILESTONES.includes(title)) return null;
  const listed = projects.filter((project) => project.milestones.includes(title));
  if (listed.length > 1) {
    throw new ProjectConfigError(`"${title}" is listed under more than one Project.`);
  }
  return listed[0] ?? projects.find((project) => project.default);
}

const WAVE = /^Wave (\d+) /;

/** The Project a wave row's milestone, `Wave NN — …`, belongs to. */
export function projectOfWave(number, projects = PROJECTS) {
  const listed = projects.find((project) =>
    project.milestones.some((title) => Number(WAVE.exec(title)?.[1]) === Number(number)),
  );
  return listed ?? projects.find((project) => project.default);
}
