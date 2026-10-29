#!/usr/bin/env node
// Turns the curator's reference books in /app/.library/ into text a research
// lane can grep and read (claude-docs/db/compendium-seed/README.md, "The
// library"). The devcontainer has no poppler, so neither `pdftotext` nor the
// Read tool can open a PDF here; pdfjs-dist is Mozilla's own extractor, pure
// JavaScript. Each PDF page becomes one file, `<page>.txt`, so the file name
// is the page a citation names as its locator. An EPUB is a zip of HTML
// chapters already, so it is unpacked as it is and cited by entry heading.
//
// Everything is written under the library folder, which `.gitignore` keeps out
// of the public repo. A PDF that yields no text is a scan with no text layer:
// it is reported, not OCRed.
//
// Usage:
//   npm run library:text                       # /app/.library/
//   npm run library:text -- --library <dir>    # another folder

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { slugify } from '../src/lib/slugify.ts';

/** Absolute, so a lane in a worktree reads the one copy in /app. */
const DEFAULT_LIBRARY = '/app/.library';

/** The folder a book's text goes in: `text/<slug of its file name>/`. */
export function bookFolder(library: string, file: string): string {
  return join(library, 'text', slugify(basename(file, extname(file))));
}

/** `0007.txt`: zero-padded so a listing sorts in page order. */
export function pageFile(page: number): string {
  return `${String(page).padStart(4, '0')}.txt`;
}

/** Writes one text file per page; returns the page count and how many held text. */
async function extractPdf(path: string, folder: string) {
  const task = getDocument({
    data: new Uint8Array(readFileSync(path)),
    // Text only: no fonts are loaded or rendered, and pdfjs's warnings about
    // the fonts it skips are noise here.
    disableFontFace: true,
    verbosity: 0,
  });
  const pdf = await task.promise;
  mkdirSync(folder, { recursive: true });
  let withText = 0;
  for (let page = 1; page <= pdf.numPages; page++) {
    const content = await (await pdf.getPage(page)).getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : ''))
      .join('');
    if (text.trim()) withText++;
    writeFileSync(join(folder, pageFile(page)), text);
  }
  const pages = pdf.numPages;
  await task.destroy();
  return { pages, withText };
}

async function main() {
  const flag = process.argv.indexOf('--library');
  const library = flag === -1 ? DEFAULT_LIBRARY : process.argv[flag + 1];
  const books = readdirSync(library).filter((file) => /\.(pdf|epub)$/i.test(file));
  if (books.length === 0) throw new Error(`No .pdf or .epub in ${library}`);

  const imageOnly: string[] = [];
  for (const file of books) {
    const folder = bookFolder(library, file);
    if (/\.epub$/i.test(file)) {
      execFileSync('unzip', ['-o', '-q', join(library, file), '-d', folder]);
      console.log(`epub  ${file} → ${folder}/`);
      continue;
    }
    const { pages, withText } = await extractPdf(join(library, file), folder);
    console.log(`pdf   ${file} → ${folder}/ (${withText} of ${pages} pages hold text)`);
    if (withText === 0) imageOnly.push(file);
  }
  if (imageOnly.length > 0) {
    console.log(`\nNo text layer, so no text (a scan; not OCRed):\n  ${imageOnly.join('\n  ')}`);
  }
}

await main();
