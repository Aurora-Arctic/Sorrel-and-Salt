import { RuleTester } from 'oxlint/plugins-dev';
import { REPO_ROOT } from '../support/paths';
// @ts-expect-error -- the lint plugin is plain JavaScript, with no declaration file
import { rules } from '../../lint/source-sweeps.js';

// Each rule of lint/source-sweeps.js, once passing and once failing
// (claude-docs/testing/layer-ownership.md, "What a test may assert", rule 8).
// The rules replace seven Vitest guards (M14.27); the whole tree is their
// real test, since `npm run lint` fails on any file that breaks one.

const at = (file: string) => file;
const tester = new RuleTester();

tester.run('no-bare-router-navigation', rules['no-bare-router-navigation'], {
  valid: [
    {
      filename: at('src/components/Nav/index.tsx'),
      cwd: REPO_ROOT,
      code: 'const go = () => navigate("/spells");',
    },
  ],
  invalid: [
    {
      filename: at('src/components/Nav/index.tsx'),
      cwd: REPO_ROOT,
      code: 'const go = () => router.push("/spells");',
      errors: 1,
    },
  ],
});

tester.run('form-shown-through-form-label', rules['form-shown-through-form-label'], {
  valid: [
    {
      filename: at('src/components/Variant/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const V = ({ variant }) => <span>{formLabel(variant.form)}</span>;',
    },
  ],
  invalid: [
    {
      filename: at('src/components/Variant/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const V = ({ variant }) => <span>{variant.form}</span>;',
      errors: 1,
    },
  ],
});

tester.run('spell-visibility-read-in-one-place', rules['spell-visibility-read-in-one-place'], {
  valid: [
    {
      filename: at('src/db/repository/spells.ts'),
      cwd: REPO_ROOT,
      code: 'export function readableSpells() { return eq(spells.visibility, "workspace"); }',
    },
  ],
  invalid: [
    {
      filename: at('src/modules/grimoire/services/spells.ts'),
      cwd: REPO_ROOT,
      code: 'const rows = query.where(eq(spells.visibility, "workspace"));',
      errors: 2,
    },
  ],
});

tester.run('compendium-review-mark-switch-only', rules['compendium-review-mark-switch-only'], {
  valid: [
    {
      filename: at('src/modules/ingredients/services/compendium.ts'),
      cwd: REPO_ROOT,
      code: 'export async function setCompendiumEntryReviewed() { await setReviewInCompendium(tx); }',
    },
  ],
  invalid: [
    {
      filename: at('src/modules/ingredients/services/compendium.ts'),
      cwd: REPO_ROOT,
      code: 'export async function editEntry() { await setReviewInCompendium(tx); }',
      errors: 1,
    },
  ],
});

tester.run('modal-focus-return-through-modal', rules['modal-focus-return-through-modal'], {
  valid: [
    {
      filename: at('src/components/Pick/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const P = () => <Modal returnTo={ref}>x</Modal>;',
    },
  ],
  invalid: [
    {
      filename: at('src/components/Pick/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const P = () => <Modal onClose={() => opener.focus()}>x</Modal>;',
      errors: 1,
    },
  ],
});

tester.run('long-form-guards-leaving', rules['long-form-guards-leaving'], {
  valid: [
    {
      filename: at('src/components/SpellForm/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export function SpellForm() { useDiscardGuard(dirty); return <form />; }',
    },
    {
      // The spell builder saves on close rather than asking (M10.12); its
      // hook calls useLeaveGuard for the tab close.
      filename: at('src/components/SpellForm/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export function SpellForm() { useSaveOnClose(dirty, save); return <form />; }',
    },
  ],
  invalid: [
    {
      filename: at('src/components/SpellForm/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export function SpellForm() { return <form />; }',
      errors: 1,
    },
  ],
});

tester.run('e2e-chained-tests-serial', rules['e2e-chained-tests-serial'], {
  valid: [
    {
      filename: at('tests/e2e/chain.spec.ts'),
      cwd: REPO_ROOT,
      code: `let held = '';
test.describe.configure({ mode: 'serial' });
test('a', async () => { held = 'x'; });
test('b', async () => { use(held); });`,
    },
  ],
  invalid: [
    {
      filename: at('tests/e2e/chain.spec.ts'),
      cwd: REPO_ROOT,
      code: `let held = '';
test('a', async () => { held = 'x'; });
test('b', async () => { use(held); });`,
      errors: 1,
    },
  ],
});
