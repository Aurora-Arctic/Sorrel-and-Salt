#!/usr/bin/env node
// A design review's screenshots: every named page at two phone widths in both themes, through the remote
// browser the e2e runner uses (claude-docs/workshop.md, "Review screenshots").
// Usage: node scripts/review-screenshots.mjs --out <dir> [--base <url>] [--storage-state <file>] (--pages
// <file.json> | --pages '<json>')
// Each context is a touch phone, so the page's `(hover: none)` query holds as on a phone.

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
        // A workshop story takes its theme from Storybook's `theme` global, not the media query.
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
