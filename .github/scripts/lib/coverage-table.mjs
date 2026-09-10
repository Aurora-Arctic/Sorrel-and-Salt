// Ported from resume-2026/.github/scripts/lib/coverage-table.mjs (M1.14).
// Shared by summarize-vitest.mjs and summarize-playwright.mjs — both
// @vitest/coverage-v8 and monocart-coverage-reports' `json-summary` report
// emit the same istanbul-style coverage-summary.json shape: a `total` key
// plus one key per file, each holding
// { lines, statements, functions, branches: { total, covered, skipped, pct } }.
import fs from 'node:fs';
import path from 'node:path';

const METRICS = ['lines', 'branches', 'functions', 'statements'];
const MAX_ROWS = 15;

function formatPct(pct) {
  return typeof pct === 'number' ? `${pct}%` : '—';
}

// Builds the short coverage stat (for the `summary` output) and a collapsible
// per-file coverage table (for the `details` output) from a coverage-summary.json
// at `summaryPath`. Returns null if the file doesn't exist (the run step may not
// have gotten far enough to produce one).
//
// File keys aren't always absolute filesystem paths — @vitest/coverage-v8 uses
// them (e.g. /app/src/pages/404.tsx), but monocart-coverage-reports' V8-derived
// keys are webpack-namespaced instead (e.g. sorrel-and-salt/src/pages/404.tsx) —
// so only paths under repoRoot get relativized; anything else is left as-is.
export function buildCoverageSection(summaryPath, repoRoot) {
  if (!fs.existsSync(summaryPath)) return null;

  const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const { total, ...files } = data;

  const stat = METRICS.map((metric) => `${formatPct(total[metric].pct)} ${metric}`).join(', ');

  const rows = Object.entries(files)
    .map(([file, metrics]) => ({
      file: path.isAbsolute(file) ? path.relative(repoRoot, file) : file,
      metrics,
    }))
    // Skip files with nothing to measure (e.g. ambient .d.ts declarations) —
    // they always show a meaningless 100%.
    .filter(({ metrics }) => METRICS.some((m) => metrics[m].total > 0))
    .sort((a, b) => {
      const aPct = typeof a.metrics.lines.pct === 'number' ? a.metrics.lines.pct : 0;
      const bPct = typeof b.metrics.lines.pct === 'number' ? b.metrics.lines.pct : 0;
      return aPct - bPct;
    });

  const header = `| File | ${METRICS.map((m) => `${m[0].toUpperCase()}${m.slice(1)}`).join(' | ')} |`;
  const divider = `|---|${METRICS.map(() => '---').join('|')}|`;
  const totalRow = `| **Total** | ${METRICS.map((m) => `**${formatPct(total[m].pct)}**`).join(' | ')} |`;
  const fileRows = rows
    .slice(0, MAX_ROWS)
    .map(
      ({ file, metrics }) =>
        `| \`${file}\` | ${METRICS.map((m) => formatPct(metrics[m].pct)).join(' | ')} |`,
    );

  const lines = [
    '<details><summary>Coverage by file</summary>',
    '',
    header,
    divider,
    totalRow,
    ...fileRows,
  ];
  if (rows.length > MAX_ROWS) {
    lines.push(
      '',
      `*…and ${rows.length - MAX_ROWS} more — see the coverage artifact for the full report.*`,
    );
  }
  lines.push('', '</details>');

  return { stat, table: lines.join('\n') };
}
