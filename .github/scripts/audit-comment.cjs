// Moved verbatim out of .github/workflows/audit.yml's "Comment audit results on
// PR" step when MB.32 collapsed the five check workflows onto checks.yml's one
// matrix. It still builds and upserts its own comment body rather than going
// through the pr-comment composite action: the audit is non-blocking, so it
// reports the vulnerabilities it found as a [!WARNING] on a step that passed,
// which pr-comment's pass/fail vocabulary has no way to say.
//
// Two edits came with the move, both mechanical. The pull request number and
// the duration were GitHub expressions interpolated into the inline script: the
// number is read from the environment instead, and the duration is gone with
// the timer-start/timer-elapsed actions MB.32 deleted.
//
// checks.yml calls this through actions/github-script, which supplies `github`
// and `context`; `PR_NUMBER` arrives as an environment variable.
module.exports = async ({ github, context }) => {
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

  let body;
  try {
    const data = JSON.parse(fs.readFileSync('/app/audit-results.json', 'utf8'));
    const vulns = data.metadata?.vulnerabilities ?? {};
    const total = vulns.total ?? 0;

    if (total === 0) {
      body = `${marker}\n> [!NOTE]\n> ✅ **npm audit passed** — 0 vulnerabilities · ${meta}`;
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
      body =
        `${marker}\n> [!WARNING]\n> ⚠️ **npm audit found ${total} ${label}** · ${meta}` +
        `\n\n${severityTable}` +
        `\n\n<details><summary>Vulnerable packages</summary>\n\n${packageTable}${more}\n\n</details>`;
    }
  } catch (error) {
    body = `${marker}\n> [!WARNING]\n> ⚠️ **npm audit: could not parse audit output** (${error.message}) · ${meta}`;
  }

  const { owner, repo } = context.repo;
  const prNumber = Number(process.env.PR_NUMBER);
  const comments = await github.rest.issues.listComments({ owner, repo, issue_number: prNumber });
  const existing = comments.data.find((comment) => comment.body.includes(marker));

  if (existing) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
  }
};
