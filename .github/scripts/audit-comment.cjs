// The audit leg's own report, under actions/github-script: a [!WARNING] on a
// step that passed, which the job-summary and pr-comment actions' pass/fail
// vocabulary cannot say. `PR_NUMBER` is optional — the summary is always
// written, the comment only with a PR (under `act` there is none).
module.exports = async ({ github, context, core }) => {
  const fs = require('fs');
  const marker = '<!-- ci-audit -->';
  const shortSha = context.sha.slice(0, 7);
  const runUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
  const meta = [`\`${shortSha}\``, 'non-blocking', `[view run](${runUrl})`].join(' · ');

  const severityOrder = ['critical', 'high', 'moderate', 'low', 'info'];
  const severityRank = (severity) => {
    const i = severityOrder.indexOf(severity);
    return i === -1 ? severityOrder.length : i;
  };
  const fixCell = (fixAvailable) => {
    if (fixAvailable === true) return 'Yes';
    if (fixAvailable === false) return 'No';
    if (fixAvailable && typeof fixAvailable === 'object') {
      const { name, version, isSemVerMajor } = fixAvailable;
      return `Yes (${name}@${version}${isSemVerMajor ? ', major' : ''})`;
    }
    return 'No';
  };

  let report;
  try {
    const data = JSON.parse(fs.readFileSync('/app/audit-results.json', 'utf8'));
    const vulns = data.metadata?.vulnerabilities ?? {};
    const total = vulns.total ?? 0;

    if (total === 0) {
      report = `> [!NOTE]\n> ✅ **npm audit passed** — 0 vulnerabilities · ${meta}`;
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
        .map((p) => `| ${p.name} | ${p.severity} | ${fixCell(p.fixAvailable)} |`);
      const packageTable = [
        '| Package | Severity | Fix available |',
        '| --- | --- | --- |',
        ...rows,
      ].join('\n');
      const more =
        packages.length > max
          ? `\n\n*…and ${packages.length - max} more — run \`npm audit\` locally for the rest.*`
          : '';

      const label = total === 1 ? 'vulnerability' : 'vulnerabilities';
      report =
        `> [!WARNING]\n> ⚠️ **npm audit found ${total} ${label}** · ${meta}` +
        `\n\n${severityTable}` +
        `\n\n<details><summary>Vulnerable packages</summary>\n\n${packageTable}${more}\n\n</details>`;
    }
  } catch (error) {
    report = `> [!WARNING]\n> ⚠️ **npm audit: could not parse audit output** (${error.message}) · ${meta}`;
  }

  // Summary first: the one place the result shows on a run with no PR.
  await core.summary.addRaw(report, true).write();

  const prNumber = Number(process.env.PR_NUMBER);
  if (!prNumber) {
    core.info('No PR number — job summary written, PR comment skipped.');
    return;
  }

  const body = `${marker}\n${report}`;
  const { owner, repo } = context.repo;
  const comments = await github.rest.issues.listComments({ owner, repo, issue_number: prNumber });
  const existing = comments.data.find((comment) => comment.body.includes(marker));

  if (existing) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
  }
};
