import { RuleTester } from 'oxlint/plugins-dev';
import { REPO_ROOT } from '../support/paths';
// @ts-expect-error -- the lint plugin is plain JavaScript, with no declaration file
import { rules } from '../../lint/source-sweeps.js';

// The tree is the rules' real test: `npm run lint` (claude-docs/testing/layer-ownership.md, "What a test may assert", rule 8).

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
    {
      filename: at('src/db/repository/spells.ts'),
      cwd: REPO_ROOT,
      code: 'export const visibilityIn = (values) => inArray(spells.visibility, values);',
    },
  ],
  invalid: [
    {
      filename: at('src/modules/grimoire/services/spells.ts'),
      cwd: REPO_ROOT,
      code: 'const rows = query.where(eq(spells.visibility, "workspace"));',
      errors: 2,
    },
    {
      // Only those two helpers are allowed beside it, not any other export.
      filename: at('src/db/repository/spells.ts'),
      cwd: REPO_ROOT,
      code: 'export const other = (values) => inArray(spells.visibility, values);',
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
      // The spell builder saves on close rather than asking; its hook calls
      // useLeaveGuard for the tab close.
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

tester.run('in-app-link-through-pending-link', rules['in-app-link-through-pending-link'], {
  valid: [
    {
      filename: at('src/components/Nav/index.tsx'),
      cwd: REPO_ROOT,
      code: `import { PendingLink } from '@/lib/navigation';
export const Nav = () => <PendingLink href="/spells">Spells</PendingLink>;`,
    },
    {
      // The link status hook draws nothing and navigates nowhere.
      filename: at('src/components/LinkHint/use-link-pending.ts'),
      cwd: REPO_ROOT,
      code: `import { useLinkStatus } from 'next/link';
export const useLinkPending = () => useLinkStatus().pending;`,
    },
    {
      filename: at('src/components/Nav/index.tsx'),
      cwd: REPO_ROOT,
      code: `import type { LinkProps } from 'next/link';
export type NavProps = LinkProps;`,
    },
    {
      // PendingLink is the one wrapper every in-app link goes through.
      filename: at('src/lib/navigation/pending-link.tsx'),
      cwd: REPO_ROOT,
      code: `import Link from 'next/link';
export const PendingLink = (props) => <Link {...props} />;`,
    },
    {
      filename: at('src/components/Nav/index.stories.tsx'),
      cwd: REPO_ROOT,
      code: `import Link from 'next/link';
export const Story = () => <Link href="/spells">Spells</Link>;`,
    },
  ],
  invalid: [
    {
      filename: at('src/components/Nav/index.tsx'),
      cwd: REPO_ROOT,
      code: `import Link from 'next/link';
export const Nav = () => <Link href="/spells">Spells</Link>;`,
      errors: 1,
    },
    {
      filename: at('src/app/(shell)/somewhere/page.tsx'),
      cwd: REPO_ROOT,
      code: `import NextLink, { useLinkStatus } from 'next/link';
export default function Page() { return <NextLink href="/spells">Spells</NextLink>; }`,
      errors: 1,
    },
    {
      // A listed file that no longer imports next/link is reported, so the list cannot outgrow its reasons.
      filename: at('src/lib/navigation/pending-link.tsx'),
      cwd: REPO_ROOT,
      code: 'export const PendingLink = () => null;',
      errors: 1,
    },
  ],
});

tester.run('full-page-load-reports-leaving', rules['full-page-load-reports-leaving'], {
  valid: [
    {
      filename: at('src/components/SignOut/index.tsx'),
      cwd: REPO_ROOT,
      code: `const out = () => { reportLeaving(); window.location.assign('/'); };`,
    },
    {
      filename: at('src/components/SignOut/index.tsx'),
      cwd: REPO_ROOT,
      code: `function again() { reportLeaving(); location.reload(); }`,
    },
    {
      filename: at('src/components/SignOut/index.tsx'),
      cwd: REPO_ROOT,
      code: `const away = () => { reportLeaving(); window.location.replace('/elsewhere'); };`,
    },
    {
      // Neither is a page load: a soft navigation and an object merge.
      filename: at('src/components/SignOut/index.tsx'),
      cwd: REPO_ROOT,
      code: `const go = () => { navigate('/x'); Object.assign(target, source); };`,
    },
  ],
  invalid: [
    {
      filename: at('src/components/SignOut/index.tsx'),
      cwd: REPO_ROOT,
      code: `const out = () => window.location.assign('/');`,
      errors: 1,
    },
    {
      filename: at('src/components/SignOut/index.tsx'),
      cwd: REPO_ROOT,
      code: `function again() { location.reload(); }`,
      errors: 1,
    },
    {
      // Too late: the bar has already missed the load.
      filename: at('src/components/SignOut/index.tsx'),
      cwd: REPO_ROOT,
      code: `const out = () => { window.location.assign('/'); reportLeaving(); };`,
      errors: 1,
    },
    {
      // Reported in the outer function, but the load runs later, in a callback of its own.
      filename: at('src/components/SignOut/index.tsx'),
      cwd: REPO_ROOT,
      code: `const out = () => { reportLeaving(); mutate({ onSuccess: () => window.location.assign('/') }); };`,
      errors: 1,
    },
  ],
});
