// `npm run setup`: copies each committed example file to the git-ignored file the stack reads, only where that file is absent.
// It never overwrites, so a second run, or a run over a configured checkout, changes nothing (claude-docs/day-1.md, "The first hour").
import { constants, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface SetupResult {
  from: string;
  to: string;
  outcome: 'copied' | 'kept';
}

function pairs(root: string): [from: string, to: string][] {
  const vscode = existsSync(join(root, '.vscode'))
    ? readdirSync(join(root, '.vscode'))
        .filter((name) => name.endsWith('.example.json'))
        .sort()
        .map((name): [string, string] => [
          `.vscode/${name}`,
          `.vscode/${name.replace(/\.example\.json$/, '.json')}`,
        ])
    : [];
  return [['.env.example', '.env.local'], ['Docker/.env.example', 'Docker/.env'], ...vscode];
}

/** Copies every absent target from its example and prints one line per file. @throws {Error} an example is missing. */
export function setup(root: string, print: (line: string) => void = console.log): SetupResult[] {
  return pairs(root).map(([from, to]) => {
    let outcome: SetupResult['outcome'] = 'copied';
    try {
      // COPYFILE_EXCL makes the copy itself refuse an existing target, so nothing between a check and the copy can overwrite.
      copyFileSync(join(root, from), join(root, to), constants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      outcome = 'kept';
    }
    print(outcome === 'copied' ? `copied ${from} to ${to}` : `kept   ${to}`);
    return { from, to, outcome };
  });
}

if (import.meta.main) {
  setup(join(import.meta.dirname, '..'));
}
