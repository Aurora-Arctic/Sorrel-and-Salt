// Tells a coverage artifact that was never uploaded from one that was
// uploaded and could not be downloaded. A suite that did not run has no
// artifact, and the merge leaves it out. An artifact that exists in this run
// but failed to download would leave the merge with partial or no data and a
// stale PR comment, so it is reported as missing and the job fails.
//
// Reads ARTIFACTS, a JSON list of { name, outcome }, where `outcome` is the
// download step's outcome. Only a failed download is looked up. Sets the
// `missing` output: the names that exist but could not be downloaded, comma
// separated, empty when there are none. A lookup that itself fails counts as
// missing, since existence cannot be told.
import fs from 'node:fs';

export async function findMissing(artifacts, listByName) {
  const missing = [];
  for (const { name, outcome } of artifacts) {
    if (outcome !== 'failure') continue;
    try {
      const found = await listByName(name);
      if (found.some((artifact) => !artifact.expired)) missing.push(name);
      else console.log(`${name}: no artifact in this run, left out of the merge`);
    } catch (error) {
      console.log(`${name}: could not look the artifact up (${error.message})`);
      missing.push(name);
    }
  }
  return missing;
}

async function listFromApi(name) {
  const {
    GITHUB_API_URL = 'https://api.github.com',
    GITHUB_REPOSITORY,
    GITHUB_RUN_ID,
  } = process.env;
  const url = `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/artifacts?name=${encodeURIComponent(name)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).artifacts ?? [];
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const missing = await findMissing(JSON.parse(process.env.ARTIFACTS ?? '[]'), listFromApi);
  if (missing.length > 0) {
    console.log(
      `::error::Coverage artifact ${missing.join(', ')} exists in this run but could not be downloaded. Re-run this job.`,
    );
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `missing=${missing.join(',')}\n`);
  }
}
