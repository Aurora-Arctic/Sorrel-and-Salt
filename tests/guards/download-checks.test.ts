import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// The image build fetches its review tools from release pages, so a tampered or swapped release must
// fail the build rather than land in the container: every download goes through the Dockerfile's
// `fetch` helper, which takes the file's SHA-256 and checks it.

const SHELL_FILE =
  /^(?:Docker\/[^/]+|\.devcontainer\/[^/]+|\.github\/workflows\/[^/]+\.ya?ml|scripts\/.+\.sh|package\.json)$/;
const DOCKERFILE = /^Docker\/Dockerfile[^/]*$/;
const PIPED_INTO_SHELL = /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z|da)?sh\b/;
// A command line, not a package name such as `apk add curl`: the tool followed by a flag or a URL.
const DOWNLOAD = /\b(?:curl|wget)\s+(?:-|["']?(?:https?:|\$))/;
const FETCH_DEFINITION = /^\s*fetch\(\)\s*\{/;
const FETCH_CALL = /^\s*fetch\s+\S/;
const SHA256 = /\b[0-9a-f]{64}\b/;

function linesOf(files: string[]) {
  return files.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .map((text, index) => ({ file, line: index + 1, text }))
      .filter(({ text }) => !/^\s*#/.test(text)),
  );
}

describe('downloads at image build and container create', () => {
  const files = inject('repoFiles').filter((file) => SHELL_FILE.test(file));
  const dockerLines = linesOf(files.filter((file) => DOCKERFILE.test(file)));

  it('never pipes a download into a shell', () => {
    // Precondition: the scan read the files that run shell commands.
    expect(files).toEqual(
      expect.arrayContaining(['Docker/Dockerfile.node', '.devcontainer/devcontainer.json']),
    );
    expect(linesOf(files).filter(({ text }) => PIPED_INTO_SHELL.test(text))).toEqual([]);
  });

  it('downloads in a Dockerfile only through the fetch helper', () => {
    const definitions = dockerLines.filter(({ text }) => FETCH_DEFINITION.test(text));

    // Precondition: the helper exists, so the rule below has something to hold every download to.
    expect(definitions.length).toBeGreaterThan(0);
    expect(
      dockerLines.filter(({ text }) => DOWNLOAD.test(text) && !FETCH_DEFINITION.test(text)),
    ).toEqual([]);
  });

  it('gives every fetch a pinned SHA-256', () => {
    const calls = dockerLines.filter(({ text }) => FETCH_CALL.test(text));

    // Precondition: the three glibc libraries, difftastic, Plannotator and its .sha256 file.
    expect(calls.length).toBeGreaterThanOrEqual(6);
    expect(calls.filter(({ text }) => !SHA256.test(text))).toEqual([]);
  });
});
