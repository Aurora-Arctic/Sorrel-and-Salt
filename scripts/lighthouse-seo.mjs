#!/usr/bin/env node
// Lighthouse's SEO category on the public page kinds, signed out; exits non-zero unless every applicable
// audit passes. Run by hand, only meaningful against a `VERCEL_ENV=production` server.
// Usage: node scripts/lighthouse-seo.mjs <base-url> [--host <name>] [--port <port>] [--path <path>]...
// (claude-docs/commands.md, "Lighthouse SEO")
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

// An IP, not the name: Chrome answers DevTools requests only when the Host header is an IP or `localhost`
// (claude-docs/commands.md, "Lighthouse SEO").
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
