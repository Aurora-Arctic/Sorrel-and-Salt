// What one compendium seed run did, entry by entry, and the lines it
// prints. The seed builds the report; `scripts/db-seed.ts` prints it and
// exits 1 when anything was refused, which fails the deploy's seed step and
// posts the `REFUSED` block on the pull request (migrate.yml).

/** One entry the run met, by its file's path, with the fields the file and the row disagree on. */
export interface EntryOutcome {
  /** The entry file's path under the compendium root. */
  where: string;
  /** The top-level fields that differ between the file and the row, `description` or `categories`; empty when none. */
  differs: string[];
}

/** An entry the run refused to update, with the reason in the words the run prints. */
export interface RefusedEntry extends EntryOutcome {
  reason: string;
}

/** A citation or source a person edited whose provenance the file restates differently: kept as the person left it, reported, never refused. */
export interface KeptCitation {
  /** The entry file citing it; `null` for a source's own mark, which no one entry owns. */
  where: string | null;
  /** The work's handle in the works list; a vocabulary source's citation. */
  source: string;
  /** `nameBasis`, `supports` or `scholarly`: what the file says differently. */
  differs: string[];
}

export interface SeedCompendiumReport {
  /** Entries absent before the run and inserted whole. */
  inserted: number;
  /** Of those inserted, how many landed hidden for want of a category. */
  hidden: number;
  /** Entries whose stored hash equals the file's and whose row matches it: nothing to do. */
  skipped: number;
  /** Entries whose marked update was applied. */
  updated: string[];
  /** Entries whose file and row disagree but whose file is not marked for update, or whose mark is stale, with what differs. */
  pending: EntryOutcome[];
  /** Entries a curator soft-deleted, which the seed never revives. */
  retired: string[];
  /** Rows with no stored hash that took the conversion manifest's hash as their baseline. */
  adopted: EntryOutcome[];
  refused: RefusedEntry[];
  kept: KeptCitation[];
}

export function emptyReport(): SeedCompendiumReport {
  return {
    inserted: 0,
    hidden: 0,
    skipped: 0,
    updated: [],
    pending: [],
    retired: [],
    adopted: [],
    refused: [],
    kept: [],
  };
}

/** Whether the run should exit 1: a refused entry is the one outcome that is an error. */
export function hasRefusals(report: SeedCompendiumReport): boolean {
  return report.refused.length > 0;
}

/**
 * The run's lines: one per `UPDATED`, `PENDING`, `RETIRED` and `REFUSED` entry (the last two followed by the fields that differ), one per `KEPT` citation or source and a totals line.
 * `ADOPTED` lines print only under `adopt`, which the deploy passes and `db:seed:compendium -- --adopt --dry-run` previews.
 */
export function formatReport(
  report: SeedCompendiumReport,
  { adopt = false }: { adopt?: boolean } = {},
): string {
  const lines: string[] = [];
  for (const where of report.updated) lines.push(`UPDATED ${where}`);
  for (const { where, differs } of report.pending) {
    lines.push(`PENDING ${where}`);
    if (differs.length > 0) lines.push(`  differs: ${differs.join(', ')}`);
  }
  for (const where of report.retired) lines.push(`RETIRED ${where}`);
  if (adopt) {
    for (const { where, differs } of report.adopted) {
      lines.push(`ADOPTED ${where}`);
      if (differs.length > 0) lines.push(`  differs: ${differs.join(', ')}`);
    }
  }
  for (const { where, reason, differs } of report.refused) {
    lines.push(`REFUSED ${where}: ${reason}`);
    if (differs.length > 0) lines.push(`  differs: ${differs.join(', ')}`);
  }
  lines.push(...keptLines(report.kept));
  lines.push(
    `inserted ${report.inserted}, hidden ${report.hidden}, skipped ${report.skipped}, updated ${report.updated.length}, pending ${report.pending.length}, retired ${report.retired.length}, adopted ${report.adopted.length}, refused ${report.refused.length}`,
  );
  return lines.join('\n');
}

/** Two lines per `KEPT` citation or source: which, and what the file or list says differently. Never an error: no run exits 1 for one. */
export function keptLines(kept: readonly KeptCitation[]): string[] {
  return kept.flatMap(({ where, source, differs }) => [
    `KEPT ${where === null ? source : `${where}: ${source}`} (edited on the site)`,
    `  differs: ${differs.join(', ')}`,
  ]);
}
