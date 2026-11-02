import { describe, expect, it } from 'vitest';
import { emptyReport, formatReport, hasRefusals } from '@/db/seed/compendium/report';
import type { SeedCompendiumReport } from '@/db/seed/compendium/report';

// The run's report is what the deploy prints and what fails its seed
// step, so the line for each outcome and the exit decision are the contract.

const UPDATED = 'ingredients/botanical/updated-wort.md';
const PENDING = 'ingredients/botanical/pending-wort.md';
const RETIRED = 'ingredients/botanical/retired-wort.md';
const ADOPTED = 'ingredients/botanical/adopted-wort.md';
const REFUSED = 'ingredients/botanical/refused-wort.md';
const KEPT = 'ingredients/botanical/kept-wort.md';

/** One of each outcome, so every line the report can print is in play. */
function fullReport(): SeedCompendiumReport {
  return {
    inserted: 3,
    hidden: 2,
    skipped: 4,
    updated: [UPDATED],
    pending: [{ where: PENDING, differs: ['toxic'] }],
    retired: [RETIRED],
    adopted: [{ where: ADOPTED, differs: ['description', 'variants'] }],
    refused: [
      { where: REFUSED, reason: 'curator-reviewed', differs: ['description', 'folkNames'] },
    ],
    kept: [
      { where: KEPT, source: 'ahpa-safety', differs: ['nameBasis', 'supports'] },
      { where: null, source: 'cunningham-herbs', differs: ['scholarly'] },
    ],
  };
}

describe('formatReport', () => {
  it('prints one line for each updated, pending and retired entry', () => {
    const lines = formatReport(fullReport()).split('\n');

    expect(lines).toContain(`UPDATED ${UPDATED}`);
    expect(lines).toContain(`PENDING ${PENDING}`);
    expect(lines).toContain(`RETIRED ${RETIRED}`);
  });

  it('prints a pending entry, then the fields that differ on the next line', () => {
    const lines = formatReport(fullReport()).split('\n');

    const at = lines.indexOf(`PENDING ${PENDING}`);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(lines[at + 1]).toBe('  differs: toxic');
  });

  it('prints a refused entry with its reason, then the fields that differ on the next line', () => {
    const lines = formatReport(fullReport()).split('\n');

    const at = lines.indexOf(`REFUSED ${REFUSED}: curator-reviewed`);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(lines[at + 1]).toBe('  differs: description, folkNames');
  });

  it('prints no differs line for a refusal with nothing that differs', () => {
    const report = emptyReport();
    report.refused.push({ where: REFUSED, reason: 'no baseline', differs: [] });

    const lines = formatReport(report).split('\n');

    expect(lines[0]).toBe(`REFUSED ${REFUSED}: no baseline`);
    expect(lines.some((line) => line.startsWith('  differs'))).toBe(false);
  });

  it('prints a kept citation by entry and source, a kept source by source alone, each then what differs', () => {
    const lines = formatReport(fullReport()).split('\n');

    const link = lines.indexOf(`KEPT ${KEPT}: ahpa-safety (edited on the site)`);
    expect(link).toBeGreaterThanOrEqual(0);
    expect(lines[link + 1]).toBe('  differs: nameBasis, supports');
    const source = lines.indexOf('KEPT cunningham-herbs (edited on the site)');
    expect(source).toBeGreaterThanOrEqual(0);
    expect(lines[source + 1]).toBe('  differs: scholarly');
  });

  it('prints the adopted entries and what differs only when asked to adopt', () => {
    const quiet = formatReport(fullReport()).split('\n');
    expect(quiet.some((line) => line.startsWith('ADOPTED'))).toBe(false);
    expect(quiet).not.toContain('  differs: description, variants');

    const adopting = formatReport(fullReport(), { adopt: true }).split('\n');
    const at = adopting.indexOf(`ADOPTED ${ADOPTED}`);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(adopting[at + 1]).toBe('  differs: description, variants');
  });

  it('prints an adopted entry with nothing that differs as its one line', () => {
    const report = emptyReport();
    report.adopted.push({ where: ADOPTED, differs: [] });

    const lines = formatReport(report, { adopt: true }).split('\n');

    expect(lines[0]).toBe(`ADOPTED ${ADOPTED}`);
    expect(lines[1]).toMatch(/^inserted /);
  });

  it('ends with the counts of every outcome', () => {
    const lines = formatReport(fullReport()).split('\n');

    expect(lines[lines.length - 1]).toBe(
      'inserted 3, hidden 2, skipped 4, updated 1, pending 1, retired 1, adopted 1, refused 1',
    );
  });

  it('prints only the counts for a run that did nothing', () => {
    expect(formatReport(emptyReport())).toBe(
      'inserted 0, hidden 0, skipped 0, updated 0, pending 0, retired 0, adopted 0, refused 0',
    );
  });
});

describe('hasRefusals', () => {
  it('is false for a run that refused nothing', () => {
    expect(hasRefusals(emptyReport())).toBe(false);
  });

  it('is false when the only other outcomes are updates, pending, retired, adopted and kept', () => {
    const report = fullReport();
    report.refused = [];

    expect(hasRefusals(report)).toBe(false);
  });

  it('is true with one refusal', () => {
    const report = emptyReport();
    report.refused.push({ where: REFUSED, reason: 'form in use', differs: [] });

    expect(hasRefusals(report)).toBe(true);
  });
});
