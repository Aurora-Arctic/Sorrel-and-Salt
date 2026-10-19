#!/usr/bin/env node
// Lighthouse's SEO category on the three public page kinds (MB.84): the home
// page, the compendium list and one current entry, signed out. Exits non-zero
// unless every SEO audit that applies passes. Run by hand; it is no part of CI,
// `test:coverage`, `test:stories` or `e2e`.
//
// ONLY MEANS ANYTHING AGAINST A PRODUCTION-ENV SERVER (`VERCEL_ENV=production`
// at run time). Off production the app answers `X-Robots-Tag: noindex` and
// robots.txt disallows all, so the "Page isn't blocked from indexing" and
// "robots.txt is valid" audits correctly fail, and so does every Vercel
// preview. A failure against staging or a preview is the site working.
//
// usage: node scripts/lighthouse-seo.mjs <base-url> [--port <chrome-debugging-port>]
//   <base-url>  where the production-env server answers, e.g. http://localhost:8001
//   --port      use a Chrome already listening for DevTools on this port; without
//               it a local Chrome is launched headless with `chrome-launcher`,
//               which needs Chrome installed on the machine running this. The
//               devcontainer has none, and its remote Playwright browser gave no
//               DevTools port that could be reached (MB.84).
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const USAGE =
  'usage: node scripts/lighthouse-seo.mjs <base-url> [--port <chrome-debugging-port>]\n' +
  'Only meaningful against a server running with VERCEL_ENV=production: off production\n' +
  'the noindex header and the disallow-all robots.txt make the crawlability audits fail.';

const args = process.argv.slice(2);
const portAt = args.indexOf('--port');
const port = portAt === -1 ? undefined : Number(args.splice(portAt, 2)[1]);
const [base] = args;
if (!base || args.length !== 1 || (portAt !== -1 && !Number.isInteger(port))) {
  console.error(USAGE);
  process.exit(2);
}
const origin = new URL(base).origin;

/** The first entry the list links to: any current slug will do. */
async function firstEntryPath() {
  const html = await (await fetch(`${origin}/compendium`)).text();
  const match = /href="(\/compendium\/ingredients\/[^"]+)"/.exec(html);
  if (!match) throw new Error(`${origin}/compendium links to no entry`);
  return match[1];
}

const paths = ['/', '/compendium', await firstEntryPath()];

const chrome = port
  ? undefined
  : await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] }).catch((error) => {
      console.error(`Could not start Chrome (${error.message}). Pass --port for a running one.`);
      process.exit(2);
    });

let failed = false;
try {
  for (const path of paths) {
    const { lhr } = await lighthouse(`${origin}${path}`, {
      port: port ?? chrome.port,
      onlyCategories: ['seo'],
      output: 'json',
      logLevel: 'error',
    });
    // Audits that apply: scored ones. `manual`, `informative` and `notApplicable`
    // carry no pass or fail.
    const scored = Object.values(lhr.audits).filter(
      (audit) => audit.scoreDisplayMode === 'binary' || audit.scoreDisplayMode === 'numeric',
    );
    const failures = scored.filter((audit) => audit.score !== 1);
    console.log(
      `${path}  SEO ${Math.round((lhr.categories.seo.score ?? 0) * 100)}  ` +
        `${scored.length - failures.length}/${scored.length} audits pass`,
    );
    for (const audit of failures) {
      failed = true;
      console.log(`  FAIL ${audit.id}: ${audit.title}`);
    }
  }
} finally {
  await chrome?.kill();
}
process.exit(failed ? 1 : 0);
