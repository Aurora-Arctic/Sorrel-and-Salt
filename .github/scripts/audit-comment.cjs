// The audit leg's own report, under actions/github-script: a warning on a step
// that passed, which the pr-comment action's pass/fail outcome cannot say, so
// it renders through the shared layout itself. `PR_NUMBER` is optional — the
// summary is always written, the comment only with a PR (under `act` there is none).
module.exports = async ({ github, context, core }) => {
  const fs = require('fs');
  const { fixCell } = require('/app/.github/scripts/lib/audit-fix.cjs');
  const {
    renderComment,
    runOf,
    upsertComment,
  } = require('/app/.github/scripts/lib/pr-comment.cjs');
  const marker = '<!-- ci-audit -->';
  const run = runOf(context);

  const severityOrder = ['critical', 'high', 'moderate', 'low', 'info'];
  const severityRank = (severity) => {
    const i = severityOrder.indexOf(severity);
    return i === -1 ? severityOrder.length : i;
  };
  let result;
  try {
    const data = JSON.parse(fs.readFileSync('/app/audit-results.json', 'utf8'));
    const vulns = data.metadata?.vulnerabilities ?? {};
    // The installed version a suggested fix is compared against, to tell a
    // downgrade from a fix.
    const lockPackages =
      JSON.parse(fs.readFileSync('/app/package-lock.json', 'utf8')).packages ?? {};
    const installed = (fix) => lockPackages[`node_modules/${fix?.name}`]?.version;
    const total = vulns.total ?? 0;

    if (total === 0) {
      result = { status: 'passed', summary: '0 vulnerabilities.' };
    } else {
      const severityTable = [
        '| Severity | Count |',
        '| --- | --- |',
        ...severityOrder.map((s) => `| ${s[0].toUpperCase()}${s.slice(1)} | ${vulns[s] ?? 0} |`),
      ].join('\n');

      const packages = Object.values(data.vulnerabilities ?? {}).sort((a, b) => {
        const rankDiff = severityRank(a.severity) - severityRank(b.severity);
        return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
      });

      const max = 20;
      const rows = packages
        .slice(0, max)
        .map(
          (p) =>
            `| ${p.name} | ${p.severity} | ${fixCell(p.fixAvailable, installed(p.fixAvailable))} |`,
        );
      const packageTable = [
        '| Package | Severity | Fix Available |',
        '| --- | --- | --- |',
        ...rows,
      ].join('\n');
      const more =
        packages.length > max
          ? `\n\n*…and ${packages.length - max} more — run \`npm audit\` locally for the rest.*`
          : '';

      const label = total === 1 ? 'vulnerability' : 'vulnerabilities';
      result = {
        status: 'warning',
        summary: `${total} ${label} found.`,
        details:
          `${severityTable}` +
          `\n\n<details><summary>Vulnerable Packages</summary>\n\n${packageTable}${more}\n\n</details>`,
      };
    }
  } catch (error) {
    result = { status: 'warning', summary: `Could not parse the audit output (${error.message}).` };
  }

  const report = {
    title: 'npm Audit',
    ...result,
    footer: { sha: run.sha, notes: ['Non-Blocking'], runUrl: run.url },
  };

  // Summary first: the one place the result shows on a run with no PR.
  await core.summary.addRaw(renderComment(report), true).write();

  const prNumber = Number(process.env.PR_NUMBER);
  if (!prNumber) {
    core.info('No PR number — job summary written, PR comment skipped.');
    return;
  }

  const { owner, repo } = context.repo;
  await upsertComment(
    github,
    { owner, repo, issue_number: prNumber },
    marker,
    renderComment({ marker, ...report }),
  );
};
