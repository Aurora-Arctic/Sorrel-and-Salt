#!/usr/bin/env node
// Lighthouse's SEO category on the three public page kinds: the home
// page, the compendium list and one current entry, signed out (or the entries
// named with `--path`). Exits non-zero
// unless every SEO audit that applies passes. Run by hand; it is no part of CI,
// `test:coverage`, `test:stories` or `e2e`.
//
// ONLY MEANS ANYTHING AGAINST A PRODUCTION-ENV SERVER (`VERCEL_ENV=production`
// at run time). Off production the app answers `X-Robots-Tag: noindex` and
// robots.txt disallows all, so the "Page isn't blocked from indexing" and
// "robots.txt is valid" audits correctly fail, and so does every Vercel
// preview. A failure against staging or a preview is the site working.
//
// usage: node scripts/lighthouse-seo.mjs <base-url> [--host <name>] [--port <chrome-debugging-port>] [--path <path>]...
//   <base-url>  where the production-env server answers, e.g. http://localhost:8001
//               (from the devcontainer's own side, a server it runs is
//               http://devcontainer:<port> to the browser)
//   --port      use a Chrome already listening for DevTools on this port; without
//               it a local Chrome is launched headless with `chrome-launcher`,
//               which needs Chrome installed on the machine running this. The
//               devcontainer has none, and the Playwright servers open no
//               DevTools port (they launch Chromium over a pipe), so it uses the
//               `lighthouse-chrome` container instead (`make lighthouse-up` on
//               the host). .devcontainer/docker-compose.yml sets
//               LIGHTHOUSE_CDP_HOST and LIGHTHOUSE_CDP_PORT, which are the
//               defaults here, so there `--host` and `--port` are not needed.
//   --host      the machine that Chrome's port is on (default localhost).
//   --path      a page to audit besides `/` and `/compendium`, starting with `/`;
//               repeat it for more. Given any, they stand in for the entry the
//               script would pick itself, because the first entry on the list
//               is one page and says little about the rest; a caller sampling
//               entries picks them (say, at random from /sitemap.xml) and
//               passes them here, so the script holds no list of its own.
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { lookup } from 'node:dns/promises';

const USAGE =
  'usage: node scripts/lighthouse-seo.mjs <base-url> [--host <name>] [--port <chrome-debugging-port>] [--path <path>]...\n' +
  'Only meaningful against a server running with VERCEL_ENV=production: off production\n' +
  'the noindex header and the disallow-all robots.txt make the crawlability audits fail.';

const args = process.argv.slice(2);
/** Removes `flag value` from `args` and returns the value. */
function takeOption(flag) {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args.splice(at, 2)[1];
}
/** Removes every `--path value` from `args` and returns the values. */
function takePaths() {
  const found = [];
  for (let at = args.indexOf('--path'); at !== -1; at = args.indexOf('--path')) {
    found.push(args.splice(at, 2)[1]);
  }
  return found;
}
const extraPaths = takePaths();
const hostName = takeOption('--host') ?? process.env.LIGHTHOUSE_CDP_HOST;
const portText = takeOption('--port') ?? process.env.LIGHTHOUSE_CDP_PORT;
const port = portText === undefined ? undefined : Number(portText);
const [base] = args;
if (
  !base ||
  args.length !== 1 ||
  (port !== undefined && !Number.isInteger(port)) ||
  extraPaths.some((path) => !path?.startsWith('/'))
) {
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

const paths = ['/', '/compendium', ...(extraPaths.length ? extraPaths : [await firstEntryPath()])];

// An IP, not the name: Chrome answers DevTools requests only when the Host
// header is an IP or `localhost`, and it builds the WebSocket address it
// hands back from that same header. Lighthouse sends the `hostname` flag as
// the Host header, so a name like `lighthouse-chrome` would be refused.
const hostname = port && hostName ? (await lookup(hostName, { family: 4 })).address : undefined;

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
      ...(hostname && { hostname }),
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
      const why = [audit.explanation, audit.displayValue].filter(Boolean).join(' | ');
      console.log(`  FAIL ${audit.id}: ${audit.title}${why ? ` (${why})` : ''}`);
    }
  }
} finally {
  await chrome?.kill();
}
process.exit(failed ? 1 : 0);
