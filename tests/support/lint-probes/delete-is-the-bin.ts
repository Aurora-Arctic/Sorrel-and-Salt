import type { ProbeSet } from '../types';

// The probes of tests/guards/lint-delete-is-the-bin.test.ts: a Delete is the delete icon, never a
// text button, bar Delete Coven, a named red control (.claude/rules/components.md, "Destructive
// controls"). Written and linted once by unit-global-setup.ts.

export const DELETE_RULE = 'sorrel(delete-is-the-bin)';

const PROBE_DIR = 'src/components/__lint-probe-delete__';

export const redTextProbe = `${PROBE_DIR}/red-text.tsx`;
export const nounTextProbe = `${PROBE_DIR}/noun-text.tsx`;
export const quietTextProbe = `${PROBE_DIR}/quiet-text.tsx`;
export const allowedProbe = `${PROBE_DIR}/allowed.tsx`;

export const deleteIsTheBin: ProbeSet = {
  name: 'lint-delete-is-the-bin',
  probes: new Map([
    [
      redTextProbe,
      'export const Probe = () => (\n  <button type="button" className="btn btn--destructive">\n    Delete Guide\n  </button>\n);\n',
    ],
    [
      nounTextProbe,
      'export const Probe = ({ noun }: { noun: string }) => (\n  <button type="button" className="btn btn--destructive form__aside">\n    {`Delete ${noun}`}\n  </button>\n);\n',
    ],
    [
      quietTextProbe,
      'export const Probe = () => (\n  <button type="button" className="btn btn--quiet">\n    Delete Guide\n  </button>\n);\n',
    ],
    [
      allowedProbe,
      [
        "import ConfirmedAction from '../ConfirmedAction';",
        "import { BinButton } from '../IconTip';",
        'export const Probe = ({ go }: { go: () => Promise<void> }) => (',
        '  <>',
        '    <ConfirmedAction label="Delete Coven" accessibleName="Delete Coven" openClass="btn btn--destructive" title="Delete Coven" confirmLabel="Delete" confirmClass="btn btn--destructive" onConfirm={go} />',
        '    <span className="btn btn--destructive btn--pending">Delete Coven</span>',
        '    <BinButton verb="Delete Guide" name="" onClick={go} />',
        '  </>',
        ');',
        '',
      ].join('\n'),
    ],
  ]),
  directories: [PROBE_DIR],
  files: [],
};
