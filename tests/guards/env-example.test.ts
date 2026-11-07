import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, inject, it } from 'vitest';

import { setup } from '../../scripts/setup';

// .env.example names every variable src/ and scripts/ read and nothing else (claude-docs/secrets.md, "Every variable").

// Set by the tool that runs the code (Next, Vercel, GitHub Actions, a test runner), never by a developer, so a key in .env.example would only shadow it.
const TOOL_SET = [/^NODE_ENV$/, /^PORT$/, /^CI$/, /^VERCEL_/, /^GITHUB_/];
// Files that read a variable through a name held in a table, so every quoted variable name in them counts as a read.
const NAME_MAP_READERS = ['src/lib/social-providers-config.ts'];
// The one helper that reads `process.env[name]` for a name its callers pass as a literal, which the scan reads at the call.
const ENV_HELPER = 'src/lib/env.ts';
// Variables whose name says they hold a credential. The example leaves each blank, bar the documented local auth secret.
const CREDENTIAL = /SECRET|TOKEN|_KEY$|_PAT$/;
const LOCAL_VALUES: Record<string, string> = { BETTER_AUTH_SECRET: 'local-dev-not-a-real-secret' };

const SOURCE = /^(src|scripts)\/.*\.(ts|tsx|mts|cts|js|mjs|cjs)$/;
const PROPERTY_READ = /\benv\.([A-Z_][A-Z0-9_]*)\b/g;
const LITERAL_INDEX_READ = /\benv\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g;
const DYNAMIC_INDEX_READ = /\benv\[\s*(?!['"])/;
const HELPER_READ = /\brequiredInProduction\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\)/g;
const QUOTED_NAME = /['"]([A-Z][A-Z0-9]*_[A-Z0-9_]+)['"]/g;

const sources = () =>
  inject('repoFiles')
    .filter((file) => SOURCE.test(file) && existsSync(file))
    .map((file) => ({ file, text: readFileSync(file, 'utf8') }));

function readsInCode(): Set<string> {
  const reads = new Set<string>();
  for (const { file, text } of sources()) {
    const patterns = [PROPERTY_READ, LITERAL_INDEX_READ, HELPER_READ];
    if (NAME_MAP_READERS.includes(file)) patterns.push(QUOTED_NAME);
    for (const pattern of patterns) {
      for (const [, name] of text.matchAll(pattern)) reads.add(name);
    }
  }
  return reads;
}

function exampleEntries(): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of readFileSync('.env.example', 'utf8').split('\n')) {
    const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line);
    if (match) entries.set(match[1], match[2]);
  }
  return entries;
}

const toolSet = (name: string) => TOOL_SET.some((pattern) => pattern.test(name));

describe('the root .env.example', () => {
  it('names every variable src/ and scripts/ read, bar the tool-set ones', () => {
    const reads = readsInCode();
    const keys = exampleEntries();

    // Preconditions: each of the three ways a read is found finds one, so an empty scan cannot pass.
    expect(reads).toContain('DATABASE_URL'); // process.env.X
    expect(reads).toContain('ADMIN_BOOTSTRAP_EMAIL'); // requiredInProduction('X')
    expect(reads).toContain('GOOGLE_CLIENT_SECRET'); // a name map
    expect(reads).toContain('NODE_ENV'); // a tool-set read the allow-list excuses

    expect([...reads].filter((name) => !toolSet(name) && !keys.has(name)).sort()).toEqual([]);
  });

  it('names nothing the code does not read, and no tool-set variable', () => {
    const reads = readsInCode();
    const keys = [...exampleEntries().keys()];

    expect(keys.length).toBeGreaterThan(10);
    expect(keys.filter((name) => !reads.has(name))).toEqual([]);
    expect(keys.filter(toolSet)).toEqual([]);
  });

  it('is read by a computed name only in the files the scan knows how to read', () => {
    const dynamic = sources()
      .filter(({ text }) => DYNAMIC_INDEX_READ.test(text))
      .map(({ file }) => file);

    // Precondition: the pattern sees the helper's own `process.env[name]`.
    expect(dynamic).toContain(ENV_HELPER);
    expect(
      dynamic.filter((file) => file !== ENV_HELPER && !NAME_MAP_READERS.includes(file)),
    ).toEqual([]);
  });

  it('leaves every credential blank, bar the documented local auth secret', () => {
    const entries = exampleEntries();
    const credentials = [...entries.keys()].filter((name) => CREDENTIAL.test(name));

    expect(credentials).toContain('BETTER_AUTH_SECRET');
    expect(credentials).toContain('RESEND_API_KEY');
    expect(credentials.filter((name) => entries.get(name) !== (LOCAL_VALUES[name] ?? ''))).toEqual(
      [],
    );
  });

  it('is not ignored by git, while the copy setup makes of it is', () => {
    // `--no-index` asks the ignore rules alone, so a file already tracked still answers.
    const ignored = (file: string) =>
      spawnSync('git', ['-c', 'safe.directory=*', 'check-ignore', '-q', '--no-index', file]).status;

    expect(ignored('.env.local')).toBe(0);
    expect(ignored('.env.example')).toBe(1);
  });
});

describe('setup()', () => {
  let root: string;

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const EXAMPLES: Record<string, string> = {
    '.env.example': 'ROOT=1\n',
    'Docker/.env.example': 'DOCKER=1\n',
    '.vscode/launch.example.json': '{"launch":1}\n',
    '.vscode/tasks.example.json': '{"tasks":1}\n',
  };
  const TARGETS: Record<string, string> = {
    '.env.example': '.env.local',
    'Docker/.env.example': 'Docker/.env',
    '.vscode/launch.example.json': '.vscode/launch.json',
    '.vscode/tasks.example.json': '.vscode/tasks.json',
  };

  function tree(): string {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'));
    for (const [file, text] of Object.entries(EXAMPLES)) {
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      writeFileSync(join(dir, file), text);
    }
    return dir;
  }

  it('copies the four examples when their targets are absent', () => {
    root = tree();
    // Precondition: no target exists yet.
    expect(Object.values(TARGETS).filter((file) => existsSync(join(root, file)))).toEqual([]);

    const results = setup(root, () => {});

    expect(results.map(({ to, outcome }) => [to, outcome]).sort()).toEqual(
      Object.values(TARGETS)
        .map((to) => [to, 'copied'])
        .sort(),
    );
    for (const [from, to] of Object.entries(TARGETS)) {
      expect(readFileSync(join(root, to), 'utf8')).toBe(EXAMPLES[from]);
    }
  });

  it('keeps all four on a second run, never overwriting an edited target', () => {
    root = tree();
    setup(root, () => {});
    for (const to of Object.values(TARGETS)) writeFileSync(join(root, to), 'edited\n');

    const lines: string[] = [];
    const results = setup(root, (line) => lines.push(line));

    expect(results.map(({ outcome }) => outcome)).toEqual(['kept', 'kept', 'kept', 'kept']);
    expect(lines).toHaveLength(4);
    for (const to of Object.values(TARGETS)) {
      expect(readFileSync(join(root, to), 'utf8')).toBe('edited\n');
    }
  });
});
