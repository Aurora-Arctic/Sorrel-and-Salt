import { readdirSync, readFileSync } from 'node:fs';
import { fromRoot } from './paths';
import type { BrowserFlows, Story, UnknownTag } from './types';

// Which e2e specs walk each story in the browser, from their `@story-N` tags.
// A scan of the spec files' text rather than `playwright test --list`: the
// story list is already read from DESIGN.md on disk the same way, and a scan
// needs no Playwright config, browser or server. A tag inside a comment counts
// too; review holds the tags as it holds the describe names (MB.224).

const E2E_DIR = 'tests/e2e';
const TAG = /@story-(\d+)/g;

/** Every spec under tests/e2e/, as a repo-relative path. */
function specFiles(): string[] {
  return readdirSync(fromRoot(E2E_DIR), { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith('.spec.ts'))
    .map((entry) => `${E2E_DIR}/${entry}`);
}

/** The specs tagged with each known story, and the tags naming any other number. */
export function scanBrowserFlows(stories: readonly Story[]): BrowserFlows {
  const known = new Set(stories.map((story) => story.id));
  const byStory = new Map<number, Set<string>>();
  const unknown = new Map<string, UnknownTag>();

  for (const file of specFiles()) {
    const text = readFileSync(fromRoot(file), 'utf8');
    for (const match of text.matchAll(TAG)) {
      const id = Number(match[1]);
      if (known.has(id)) {
        byStory.set(id, (byStory.get(id) ?? new Set()).add(file));
      } else {
        unknown.set(`${id} ${file}`, { id, file });
      }
    }
  }

  return {
    byStory: new Map([...byStory].map(([id, files]) => [id, [...files].sort()])),
    unknown: [...unknown.values()].sort((a, b) => a.file.localeCompare(b.file) || a.id - b.id),
  };
}
