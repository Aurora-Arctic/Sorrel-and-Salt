// Points each code citation of a split summary's section at the file the
// section lives in, since the guard fails one named through the index
// (claude-docs/README.md, "Comments in code"), then rewraps a comment the
// longer path pushes past the print width. Run after split-doc.mjs; a dry run
// unless --write.
//
//   node scripts/repoint-doc-citations.mjs claude-docs/db.md [--write]

import { readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { citationsIn, citingFiles, sectionOf, unwrap } from './doc-citations.mjs';

const WIDTH = 100;
// Their usage examples name a summary; they are not citing it.
const TOOLS = ['scripts/split-doc.mjs', 'scripts/repoint-doc-citations.mjs'];
// A comment a tool reads ends a paragraph: rewrapping must never move it.
const DIRECTIVE = /^(?:oxlint-|eslint-|@ts-|prettier-ignore|istanbul |c8 |v8 )/;

/**
 * @param {string} text a citing file
 * @param {string} doc the split summary, `claude-docs/db.md`
 * @param {{ text: string, file: string }[]} headings every heading under the
 *   summary's directory, inline-code marks dropped, with the file it is in
 */
export function repointCitations(text, doc, headings) {
  let count = 0;
  const out = text.replace(sectionOf(doc), (_, tail, quoted) => {
    const section = unwrap(quoted);
    const files = [
      ...new Set(headings.filter((h) => h.text.startsWith(section)).map((h) => h.file)),
    ];
    if (files.length !== 1) throw new Error(`"${section}" → ${files.join(', ') || 'nothing'}`);
    count++;
    return `${files[0]}${tail}`;
  });
  return { text: out, count };
}

function wrapWords(words, prefix, width) {
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${prefix}${line} ${word}`.length > width) {
      lines.push(prefix + line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(prefix + line);
  return lines;
}

/**
 * Rewraps each comment line past the print width that carries `marker`, from
 * that line to the end of its paragraph, at the width the paragraph's other
 * lines keep (80 at least). A one-line doc comment opens into a block.
 */
export function reflowComments(text, marker) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length <= WIDTH || !line.includes(marker)) continue;

    const doc = /^(\s*)\/\*\* (.*) \*\/$/.exec(line);
    if (doc) {
      const body = wrapWords(doc[2].split(' '), `${doc[1]} * `, 80);
      lines.splice(i, 1, `${doc[1]}/**`, ...body, `${doc[1]} */`);
      continue;
    }
    const prefix = /^(\s*(?:\/\/|\*) )/.exec(line)?.[1];
    if (!prefix) continue;

    const continues = (next) => {
      if (!next.startsWith(prefix)) return false;
      const body = next.slice(prefix.length);
      return body.trim() !== '' && !body.startsWith('/') && !DIRECTIVE.test(body);
    };
    let end = i + 1;
    while (end < lines.length && continues(lines[end])) end++;

    const around = [...lines.slice(Math.max(0, i - 3), i), ...lines.slice(i + 1, end)]
      .filter((l) => l.startsWith(prefix))
      .map((l) => l.length);
    const width = Math.min(WIDTH, Math.max(80, ...around));
    const words = lines
      .slice(i, end)
      .flatMap((l) => l.slice(prefix.length).split(/\s+/))
      .filter(Boolean);
    lines.splice(i, end - i, ...wrapWords(words, prefix, width));
  }
  return lines.join('\n');
}

/** Every heading under a split summary's directory, as the guard reads them. */
function headingsUnder(root, dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const file = `${dir}/${name}`;
    return [...readFileSync(join(root, file), 'utf8').matchAll(/^#+\s+(.*)$/gm)].map(
      ([, text]) => ({ text: text.replace(/`/g, ''), file }),
    );
  });
}

function main([doc, flag]) {
  if (!doc?.endsWith('.md')) {
    throw new Error(
      'usage: node scripts/repoint-doc-citations.mjs claude-docs/<summary>.md [--write]',
    );
  }
  const write = flag === '--write';
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dir = join(dirname(doc), basename(doc, '.md'));
  const headings = headingsUnder(root, dir);

  let total = 0;
  const plain = [];
  for (const file of citingFiles(root)) {
    const before = readFileSync(join(root, file), 'utf8');
    const { text, count } = repointCitations(before, doc, headings);
    if (count) {
      total += count;
      console.log(`${String(count).padStart(3)}  ${file}`);
      if (write) writeFileSync(join(root, file), reflowComments(text, `${dir}/`));
    }
    if (citationsIn(text).includes(doc) && !TOOLS.includes(file)) plain.push(file);
  }
  console.log(`${total} citation(s) ${write ? 'repointed' : 'to repoint; --write applies them'}.`);
  if (plain.length) {
    console.log(`\n${doc} is still named without a section in these; point any that mean one`);
    console.log(`section at its file by hand:\n  ${plain.join('\n  ')}`);
  }
}

// Runs the CLI only when invoked directly; the test imports the helpers.
const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) main(process.argv.slice(2));
