import { describe, expect, it } from 'vitest';

import {
  NEUTRAL_MILESTONES,
  PROJECTS,
  projectByNumber,
  projectOfMilestone,
  projectOfWave,
} from '../../scripts/task-projects.mjs';

const projects = [
  { number: 1, title: 'One', slug: 'one', bugfixes: 'Z. Bugfixes', default: true, milestones: [] },
  {
    number: 4,
    title: 'Four',
    slug: 'four',
    bugfixes: 'Z. Bugfixes — Four',
    label: 'four',
    milestones: ['Wave 18 — Testwort', 'Z. Deferred', 'Z. Bugfixes — Four'],
  },
];

describe('the Project config', () => {
  it('has exactly one default Project, and unique numbers, slugs and labels', () => {
    expect(PROJECTS.filter((project) => project.default)).toHaveLength(1);
    for (const key of ['number', 'slug', 'title'] as const) {
      const values = PROJECTS.map((project) => project[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
    const labels = PROJECTS.flatMap((project) => ('label' in project ? [project.label] : []));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('gives every Project but the default a label, so the default auto-add can exclude it', () => {
    for (const project of PROJECTS.filter((candidate) => !candidate.default)) {
      expect(project.label, project.title).toMatch(/^[a-z0-9.-]+$/);
    }
  });

  it("lists each milestone under one Project, and puts each Project's bug milestone on it", () => {
    const listed = PROJECTS.flatMap((project) => project.milestones);
    expect(new Set(listed).size).toBe(listed.length);
    for (const project of PROJECTS) {
      expect(projectOfMilestone(project.bugfixes)?.number, project.bugfixes).toBe(project.number);
    }
  });
});

describe('projectOfMilestone', () => {
  it('answers the Project listing the milestone, else the default', () => {
    expect(projectOfMilestone('Z. Deferred', projects)?.number).toBe(4);
    expect(projectOfMilestone('Z. Bugfixes — Four', projects)?.number).toBe(4);
    expect(projectOfMilestone('Z. Bugfixes', projects)?.number).toBe(1);
    expect(projectOfMilestone('Wave 03 — Testwort', projects)?.number).toBe(1);
  });

  it('answers null for no milestone or a neutral one, so a retired task stays put', () => {
    expect(projectOfMilestone(null, projects)).toBeNull();
    for (const title of NEUTRAL_MILESTONES) expect(projectOfMilestone(title, projects)).toBeNull();
  });

  it('refuses a milestone two Projects list', () => {
    const doubled = [
      projects[0],
      { ...projects[1], milestones: [] },
      { ...projects[1], number: 5 },
    ];
    doubled[1].milestones = ['Z. Deferred'];
    doubled[2].milestones = ['Z. Deferred'];
    expect(() => projectOfMilestone('Z. Deferred', doubled)).toThrow(/more than one/);
  });
});

describe('projectOfWave', () => {
  it("answers the Project listing the wave's milestone, else the default", () => {
    expect(projectOfWave(18, projects).number).toBe(4);
    expect(projectOfWave(3, projects).number).toBe(1);
    expect(projectOfWave(8, projects).number).toBe(1);
  });
});

describe('projectByNumber', () => {
  it('finds a configured Project and refuses any other number', () => {
    expect(projectByNumber('4', projects).slug).toBe('four');
    expect(() => projectByNumber(2, projects)).toThrow(/not configured/);
  });
});
