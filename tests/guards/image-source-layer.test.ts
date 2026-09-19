import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { fromRoot } from '../support/paths';

// MB.42 — the CI images carry no source layer.
//
// `Docker/Dockerfile.node` and `Docker/Dockerfile.e2e` copy in the manifests,
// run `npm ci`, and stop. The source arrives from outside the image: every
// compose service and the devcontainer bind-mount `..:/app` over it, and CI's
// `.github/actions/checkout-to-app` lays the PR checkout into `/app` with
// `cp -a`. Nothing reads a baked-in tree.
//
// Why a baked layer was a bug rather than dead weight, and why the first fix
// (`git clean` after the copy) was replaced:
// claude-docs/design-decisions/mb.42-no-source-layer.md.
//
// The mechanism is a build instruction, so it is unreachable from any runtime
// test: a `COPY . .` re-added tomorrow fails nothing until CI next runs against
// a deleted file. The guard parses every `COPY`/`ADD` in both files and checks
// each source against an allowlist rather than a `.` denylist, for the reason
// lint-db-client-boundary.test.ts pins its exemption set instead of matching a
// pattern: `COPY src src` is as much a source layer as `COPY . .`, so a new
// COPY is a decision, not a convenience.

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
 * Every `COPY`/`ADD` in a Dockerfile, with its sources split out. Backslash
 * continuations are joined first so a multi-line instruction is one
 * instruction; `--flags` (`--chown=`, `--from=`, `--link`) are dropped, and
 * the last remaining token is the destination.
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

  // The precondition. An empty parse also copies nothing disallowed — a
  // renamed file, a regex that matches neither keyword, a Dockerfile that
  // stopped copying its manifests — and that is the one green result that
  // proves nothing. Assert the parser found the dependency layer first.
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
