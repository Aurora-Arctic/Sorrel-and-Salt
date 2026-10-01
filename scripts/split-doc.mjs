// Splits a claude-docs summary too large to read whole into one file per `## `
// section, and per `### ` subsection the plan names, in a directory of the
// summary's name; the summary becomes their index (claude-docs/README.md,
// "What lives where"). Text moves as is. The only edits are to links: a `../`
// on each relative one, since the files sit a directory down, and an intra-doc
// anchor pointed at the file its heading moved to.
//
//   node scripts/split-doc.mjs <plan.json>
//
// The plan gives, in the summary's order, each section's file and the sentence
// the index gives it, then any subsection to carve out, then the summary:
//   { "sections": [{ "file": "orm-version", "sentence": "…" }, …],
//     "ownFile": [{ "heading": "Fuzzy matching", "file": "fuzzy-matching" }],
//     "doc": "claude-docs/db.md" }
// Code citations are then pointed at the files by repoint-doc-citations.mjs.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slug } from 'github-slugger';

const FENCE = /^\s*```/;

/** Each `##`/`###` heading outside fenced code, with its line index. */
function headings(lines) {
  const out = [];
  let fence = false;
  lines.forEach((line, index) => {
    if (FENCE.test(line)) fence = !fence;
    const match = !fence && /^(#{2,3}) (.*)$/.exec(line);
    if (match) out.push({ level: match[1].length, text: match[2], index });
  });
  return out;
}

/** The preamble, then each `## ` section as its heading and lines. */
function sectionsOf(text) {
  const preamble = [];
  const sections = [];
  let fence = false;
  for (const line of text.split('\n')) {
    if (FENCE.test(line)) fence = !fence;
    if (!fence && line.startsWith('## ')) sections.push({ heading: line.slice(3), lines: [line] });
    else if (sections.length) sections.at(-1).lines.push(line);
    else preamble.push(line);
  }
  return { preamble, sections };
}

const trimEnd = (lines) => lines.join('\n').replace(/\s+$/, '');

/** Hard-wrapped at 80 columns, as the summaries are. */
function wrap(text) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const line = lines.at(-1);
    if (line && line.length + 1 + word.length > 80) lines.push(word);
    else lines[lines.length - 1] = line ? `${line} ${word}` : word;
  }
  return lines.join('\n');
}

/**
 * @param {string} text the summary
 * @param {{ dir: string, sections: { file: string, sentence: string }[],
 *   ownFile?: { heading: string, file: string }[] }} plan
 */
export function splitDoc(text, plan) {
  const ownFile = plan.ownFile ?? [];
  const { preamble, sections } = sectionsOf(text);
  if (sections.length !== plan.sections.length) {
    throw new Error(`${sections.length} sections, ${plan.sections.length} in the plan`);
  }
  for (const { heading } of ownFile) {
    const held = sections.some((section) =>
      headings(section.lines).some((h) => h.level === 3 && h.text.startsWith(heading)),
    );
    if (!held) throw new Error(`no ### heading starts "${heading}"`);
  }

  // Carve each named subsection out, bottom up so earlier indexes hold, and
  // leave a marker the pointer replaces once links are rewritten.
  const files = [];
  const index = [];
  sections.forEach((section, i) => {
    const { file, sentence } = plan.sections[i];
    const lines = [...section.lines];
    const subs = [];
    const marks = headings(lines).filter((h) => h.level === 3);
    for (const mark of marks) {
      const own = ownFile.find(({ heading }) => mark.text.startsWith(heading));
      subs.push({ heading: mark.text, own: own?.file });
    }
    for (let k = marks.length - 1; k >= 0; k--) {
      const own = ownFile.find(({ heading }) => marks[k].text.startsWith(heading));
      if (!own) continue;
      const end = k + 1 < marks.length ? marks[k + 1].index : lines.length;
      const moved = lines.splice(marks[k].index, end - marks[k].index, `\0${own.file}\0`, '');
      moved[0] = `## ${marks[k].text}`;
      files.push({ name: own.file, lines: moved, pointer: marks[k].text });
    }
    files.push({ name: file, lines });
    index.push({ heading: section.heading, file, sentence, subs });
  });

  // Every heading's anchor and the file it now lives in.
  const home = new Map();
  for (const { name, lines } of files) {
    for (const h of headings(lines)) {
      const anchor = slug(h.text);
      if (home.has(anchor)) throw new Error(`#${anchor} is two headings' anchor`);
      home.set(anchor, { name, top: h.index === 0 });
    }
  }

  const relink = (body, name) =>
    body.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
      if (/^[a-z]+:/.test(target)) return whole;
      if (!target.startsWith('#')) return `](../${target})`;
      const hit = home.get(target.slice(1));
      if (!hit) throw new Error(`${target} in ${name}.md names no heading`);
      if (hit.name === name) return whole;
      return `](${hit.name}.md${hit.top ? '' : target})`;
    });

  const pointers = new Map(
    files.filter((f) => f.pointer).map((f) => [f.name, f.pointer.replace(/ \([^)]*\)$/, '')]),
  );
  const out = files.map(({ name, lines }) => ({
    name,
    text:
      relink(trimEnd(lines), name).replace(
        /\0([^\0]+)\0/g,
        (_, own) => `**${pointers.get(own)}** has a file of its own: [\`${own}.md\`](${own}.md).`,
      ) + '\n',
  }));

  const dir = plan.dir;
  const lead = ownFile.length ? ', as is each subsection large enough to read alone' : '';
  const intro =
    `**Every section is a file under \`${dir}/\`**, moved there whole${lead}. This page ` +
    'keeps each `## ` and `### ` heading with a link to where it lives; a citation in ' +
    'code names that file, not this page.';
  const page = [trimEnd(preamble), '', wrap(intro), ''];
  for (const { heading, file, sentence, subs } of index) {
    const path = `${dir}/${file}.md`;
    page.push(`## ${heading}`, '', `${sentence} [\`${path}\`](${path})`, '');
    for (const sub of subs) {
      const line = sub.own
        ? `[\`${dir}/${sub.own}.md\`](${dir}/${sub.own}.md)`
        : `In [\`${path}\`](${path}#${slug(sub.heading)}).`;
      page.push(`### ${sub.heading}`, '', line, '');
    }
  }
  return { files: out, index: trimEnd(page) + '\n' };
}

function main([planPath]) {
  if (!planPath) throw new Error('usage: node scripts/split-doc.mjs <plan.json>');
  const { doc, ...plan } = JSON.parse(readFileSync(planPath, 'utf8'));
  const dir = basename(doc, '.md');
  const outDir = join(dirname(doc), dir);
  if (existsSync(outDir)) throw new Error(`${outDir} exists; the split writes it whole`);

  const { files, index } = splitDoc(readFileSync(doc, 'utf8'), { ...plan, dir });
  mkdirSync(outDir);
  for (const { name, text } of files) writeFileSync(join(outDir, `${name}.md`), text);
  writeFileSync(doc, index);
  execFileSync('npx', ['prettier', '--write', doc], { stdio: 'inherit' });
  console.log(`${files.length} files in ${outDir}; ${doc} is their index.`);
}

// Runs the CLI only when invoked directly; the test imports splitDoc.
const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) main(process.argv.slice(2));
