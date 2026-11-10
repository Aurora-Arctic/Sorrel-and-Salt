import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

const SRC = fromRoot('src');

const sourceFiles = readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter((file) =>
  /\.tsx?$/.test(file),
);

const PAUSE_SERVICES = [
  'modules/identity/services/access-pause.ts',
  'modules/coven/services/member-pause.ts',
  'modules/support/services/timeouts.ts',
];

describe('pause validation', () => {
  it('spells the end-time sentence once under src/', () => {
    expect(sourceFiles.length).toBeGreaterThan(100);
    const holders = sourceFiles.filter((file) =>
      readFileSync(`${SRC}/${file}`, 'utf8').includes('Choose a time in the future'),
    );
    expect(holders).toEqual(['lib/pause-message.ts']);
  });

  it('has each pause service use the shared end and note parsers', () => {
    for (const file of PAUSE_SERVICES) {
      const source = readFileSync(`${SRC}/${file}`, 'utf8');
      expect(source).toContain('parsePauseEnd');
      expect(source).toContain('parsePauseNote');
    }
  });
});
