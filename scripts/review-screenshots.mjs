#!/usr/bin/env node
// A design review's screenshots: every page a review names, at two phone
// widths, in both themes, full page, so the curator can compare a section's
// states side by side without opening each one by hand. It drives the remote
// browser the e2e runner uses (`PLAYWRIGHT_WS_ENDPOINT`), since no browser is
// installed in the devcontainer, which is why the app is reached as
// http://devcontainer:<port> rather than localhost. Untested: it is a tool
// for the agents running a review, not a requirement of the app
// (claude-docs/workshop.md, "Review screenshots").
//
// usage: node scripts/review-screenshots.mjs --out .reports/<task>-screenshots
//          [--base http://devcontainer:8000] [--storage-state <file>]
//          (--pages <file.json> | --pages '<json>')
//
// The pages are a JSON list of `{ "path": "/sign-in", "name": "sign-in" }`,
// in a file or inline. Each is shot as `<name>-<width>-<theme>.png`.
// `--storage-state` is a Playwright storage-state file holding a signed-in
// session's cookies, for the pages behind sign-in.
//
// Both widths are touch sign-offs: each context is a touch phone,
// `hasTouch` and `isMobile`, so the page's `(hover: none)` query holds as it
// does on a phone. Without it a desktop browser at phone width would draw
// what no phone shows: the impersonation banner tucked away until a pointer
// nears the top, where a touch screen keeps it in the page's flow, shown in
// full.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

// A small phone and a large one, the widths a section signs off at.
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 412, height: 915 },
];
const THEMES = ['dark', 'light'];

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://devcontainer:8000' },
    out: { type: 'string' },
    pages: { type: 'string' },
    'storage-state': { type: 'string' },
  },
});

if (!values.out || !values.pages) {
  console.error('usage: node scripts/review-screenshots.mjs --out <dir> --pages <file|json>');
  process.exit(2);
}

const endpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;
if (!endpoint) {
  console.error('PLAYWRIGHT_WS_ENDPOINT is not set: there is no browser to connect to.');
  process.exit(2);
}

// A path that exists is a file; anything else is the list itself.
const pages = JSON.parse(
  existsSync(values.pages) ? readFileSync(values.pages, 'utf8') : values.pages,
);
if (!Array.isArray(pages) || pages.some((page) => !page?.path || !page?.name)) {
  console.error('--pages must be a JSON list of { "path", "name" }.');
  process.exit(2);
}

mkdirSync(values.out, { recursive: true });

const browser = await chromium.connect(endpoint);
try {
  for (const viewport of VIEWPORTS) {
    // A touch phone, so `(hover: none)` holds as it does on one (header).
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
      isMobile: true,
      ...(values['storage-state'] ? { storageState: values['storage-state'] } : {}),
    });
    const page = await context.newPage();
    for (const { path, name } of pages) {
      for (const colorScheme of THEMES) {
        // The app follows `prefers-color-scheme` until a viewer picks a theme.
        await page.emulateMedia({ colorScheme });
        const url = new URL(path, values.base);
        // A workshop story (`/iframe.html?id=...`) takes its theme from
        // Storybook's `theme` global, not the media query: without one the
        // preview sets its configured default (dark) on the document, which the
        // app's stylesheet then obeys.
        if (
          url.pathname.endsWith('/iframe.html') &&
          url.searchParams.has('id') &&
          !url.searchParams.has('globals')
        ) {
          url.searchParams.set('globals', `theme:${colorScheme}`);
        }
        await page.goto(url.href, { waitUntil: 'networkidle' });
        const file = join(values.out, `${name}-${viewport.width}-${colorScheme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(file);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
