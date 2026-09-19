import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { fromRoot } from '../support/paths';

// The CI images carry no source layer: both Dockerfiles copy the manifests,
// run `npm ci`, and stop, so the checkout is the only source a job sees
// (claude-docs/ci.md, "Composite actions"). A build instruction is unreachable
// from a runtime test, so this parses every `COPY`/`ADD` and checks each
// source against an allowlist rather than a `.` denylist: `COPY src src` is
// as much a source layer as `COPY . .`.

/** The one directory-free copy each image is allowed, by file. */
const ALLOWED_SOURCES: Record<string, readonly string[]> = {
  'Docker/Dockerfile.node': ['package.json', 'package-lock.json'],
  // The `headed` stage copies its entrypoint alone, so a bare `docker run`
  // of that stage works without the bind mount that shadows it at runtime.
  'Docker/Dockerfile.e2e': ['package.json', 'package-lock.json', 'Docker/playwright-entrypoint.sh'],
};

interface CopyInstruction {
  /** The instruction as written, continuations joined, for the failure message. */
  text: string;
  sources: string[];
}

/**
 * Every `COPY`/`ADD` in a Dockerfile, sources split out: continuations joined
 * first, `--flags` dropped, and the last remaining token is the destination.
 */
function copyInstructions(dockerfile: string): CopyInstruction[] {
  return dockerfile
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(COPY|ADD)\s/i.test(line))
    .map((text) => {
      const tokens = text
        .split(/\s+/)
        .slice(1)
        .filter((token) => !token.startsWith('--'));
      return { text, sources: tokens.slice(0, -1) };
    });
}

describe.each(Object.keys(ALLOWED_SOURCES))('MB.42: %s carries no source layer', (file) => {
  const instructions = copyInstructions(readFileSync(fromRoot(file), 'utf8'));
  const allowed = ALLOWED_SOURCES[file];

  // Precondition: an empty parse also copies nothing disallowed, so assert the
  // parser found the dependency layer first.
  it('still copies the manifests, so the parser is reading real instructions', () => {
    const sources = instructions.flatMap((instruction) => instruction.sources);

    expect(sources).toContain('package.json');
    expect(sources).toContain('package-lock.json');
  });

  it('copies nothing outside its allowlist', () => {
    const offending = instructions.flatMap((instruction) =>
      instruction.sources
        .filter((source) => !allowed.includes(source))
        .map((source) => `${file}: \`${instruction.text}\` copies \`${source}\``),
    );

    expect(offending).toEqual([]);
  });
});
