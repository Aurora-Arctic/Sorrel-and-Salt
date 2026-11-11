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

tester.run('inputs-use-field', rules['inputs-use-field'], {
  valid: [
    {
      filename: at('src/components/PasswordField/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input className="input" />;',
    },
    {
      filename: at('src/components/AdminCards/mint-form.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input className="input" />;',
    },
    {
      filename: at('src/components/Field/text-control.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input className="input" />;',
    },
    {
      filename: at('src/components/Combobox/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input className="combobox__input" />;',
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="checkbox" />;',
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="hidden" name="q" value="x" />;',
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="radio" name="q" />;',
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="file" />;',
    },
    // A honeypot is not typed in by anyone.
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="text" name="website" aria-hidden tabIndex={-1} />;',
    },
    // The named exceptions.
    {
      filename: at('src/components/ChipColorField/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input className="input" />;',
    },
    {
      filename: at('src/components/IngredientForm/references.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input className="input" />;',
    },
    {
      filename: at('src/components/HelpSearchForm/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="search" name="q" />;',
    },
  ],
  invalid: [
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input className="input" />;',
      errors: 1,
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="email" />;',
      errors: 1,
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type={shown ? "text" : "password"} />;',
      errors: 1,
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <textarea />;',
      errors: 1,
    },
    // A listed file that holds no raw text input is reported.
    {
      filename: at('src/components/HelpSearchForm/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="hidden" />;',
      errors: 1,
    },
  ],
});

tester.run('no-number-input', rules['no-number-input'], {
  valid: [
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="text" inputMode="decimal" />;',
    },
    {
      filename: at('src/components/AdminCards/mint-form.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="number" min={1} max={9} />;',
    },
  ],
  invalid: [
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="number" />;',
      errors: 1,
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <TextField type={"number"} />;',
      errors: 1,
    },
    {
      filename: at('src/components/AdminCards/mint-form.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input type="text" />;',
      errors: 1,
    },
  ],
});

tester.run('schema-limits-are-named', rules['schema-limits-are-named'], {
  valid: [
    {
      filename: at('src/modules/support/validation/support.ts'),
      cwd: REPO_ROOT,
      code: "import { z } from 'zod';\nexport const S = z.string().max(SUBJECT_MAX_LENGTH);",
    },
    {
      filename: at('src/modules/support/validation/support.ts'),
      cwd: REPO_ROOT,
      code: "import { z } from 'zod';\nexport const S = z.string().min(1, { error: 'Required' });",
    },
    {
      filename: at('src/modules/support/services/rows.ts'),
      cwd: REPO_ROOT,
      code: 'export const n = Math.max(0, 5);',
    },
    {
      filename: at('src/modules/support/services/rows.ts'),
      cwd: REPO_ROOT,
      code: 'export const n = dates.max(5);',
    },
  ],
  invalid: [
    {
      filename: at('src/modules/support/validation/support.ts'),
      cwd: REPO_ROOT,
      code: "import { z } from 'zod';\nexport const S = z.string().max(254);",
      errors: 1,
    },
    {
      filename: at('src/lib/validation.ts'),
      cwd: REPO_ROOT,
      code: "import { z } from 'zod';\nexport const S = z.number().min(100).max(599);",
      errors: 2,
    },
    {
      filename: at('src/components/BusinessCards/schema.ts'),
      cwd: REPO_ROOT,
      code: "import { z } from 'zod';\nexport const S = z.string().min(3);",
      errors: 1,
    },
  ],
});

tester.run('no-max-length-attribute', rules['no-max-length-attribute'], {
  valid: [
    {
      filename: at('src/components/Field/text-control.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input maxLength={9} />;',
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input />;',
    },
    {
      filename: at('src/components/SignInPanel/two-factor-step.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input maxLength={6} />;',
    },
    {
      filename: at('src/components/PasswordSection/two-factor.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input maxLength={6} />;',
    },
  ],
  invalid: [
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input maxLength={40} />;',
      errors: 1,
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <TextField maxLength={40} />;',
      errors: 1,
    },
  ],
});

tester.run('use-form-renders-error-summary', rules['use-form-renders-error-summary'], {
  valid: [
    {
      filename: at('src/components/GroupForm/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export function F() { const form = useForm(); return <form><FormErrorSummary /></form>; }',
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export function F() { return <form />; }',
    },
    {
      filename: at('src/components/IngredientEntry/coven-choice.tsx'),
      cwd: REPO_ROOT,
      code: 'export function F() { const methods = useForm(); return <form />; }',
    },
  ],
  invalid: [
    {
      filename: at('src/components/GroupForm/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export function F() { const form = useForm<{ a: string }>(); return <form />; }',
      errors: 1,
    },
    // A listed file that now renders the summary, or no longer calls useForm, is reported.
    {
      filename: at('src/components/IngredientEntry/coven-choice.tsx'),
      cwd: REPO_ROOT,
      code: 'export function F() { const m = useForm(); return <FormErrorSummary />; }',
      errors: 1,
    },
    {
      filename: at('src/components/IngredientEntry/coven-choice.tsx'),
      cwd: REPO_ROOT,
      code: 'export function F() { return <form />; }',
      errors: 1,
    },
  ],
});

tester.run('placeholder-is-short', rules['placeholder-is-short'], {
  valid: [
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input placeholder="Add a name" />;',
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input placeholder="Search terms" />;',
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input placeholder="" />;',
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input placeholder={hint} />;',
    },
  ],
  invalid: [
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <input placeholder="Add your email address" />;',
      errors: 1,
    },
    {
      filename: at('src/components/Menu/index.tsx'),
      cwd: REPO_ROOT,
      code: 'export const A = () => <TextField placeholder={"Use letters and digits only"} />;',
      errors: 1,
    },
  ],
});

// A class-name join written by hand: `.filter(Boolean).join(' ')` building a class, or `className` added by a ternary.
// The same join building an `aria-describedby` id list or a sentence is another job, and passes.
tester.run('class-names-joined-through-cx', rules['class-names-joined-through-cx'], {
  valid: [
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "export const P = ({ open, className }) => <div className={cx('panel', open && 'is-open', className)} />;",
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "export const P = ({ hintId, errorId, error }) => <input aria-describedby={[hintId, error && errorId].filter(Boolean).join(' ') || undefined} />;",
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "const describedBy = [hintId, note && noteId, error && errorId].filter(Boolean).join(' ');",
    },
    {
      filename: at('src/components/Panel/supply.ts'),
      cwd: REPO_ROOT,
      code: "const amountLine = [quantity, unit].filter(Boolean).join(' ');",
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "announce([`Added ${name}.`, warning].filter(Boolean).join(' '));",
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "const label = title ? `${title} copy` : 'copy';",
    },
    {
      // An optional modifier inside a template is left alone.
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "export const P = ({ open }) => <li className={`panel${open ? ' is-open' : ''}`} />;",
    },
    {
      // The joiner itself, outside the components and the app.
      filename: at('src/lib/class-names.ts'),
      cwd: REPO_ROOT,
      code: "export const cx = (...parts) => parts.filter(Boolean).join(' ');",
    },
  ],
  invalid: [
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "export const P = ({ open }) => <div className={['panel', open && 'is-open'].filter(Boolean).join(' ')} />;",
      errors: 1,
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "const classes = ['panel', open && 'is-open'];\nexport const P = () => <div className={classes.filter(Boolean).join(' ')} />;",
      errors: 1,
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "const rootClass = ['panel', open && 'is-open'].filter(Boolean).join(' ');",
      errors: 1,
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "const props = { id, className: ['panel', invalid && 'is-invalid'].filter(Boolean).join(' ') };",
      errors: 1,
    },
    {
      // A local joiner function.
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "const classes = (...names) => names.filter(Boolean).join(' ');",
      errors: 1,
    },
    {
      filename: at('src/components/Panel/cells.ts'),
      cwd: REPO_ROOT,
      code: "export function cellClass({ className, corner }) {\n  return [className, corner && 'cell--corner'].filter(Boolean).join(' ') || undefined;\n}",
      errors: 1,
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "export const P = ({ className }) => <p className={className ? `meta ${className}` : 'meta'} />;",
      errors: 1,
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "export const P = ({ className }) => <li className={`jar-line${className ? ` ${className}` : ''}`} />;",
      errors: 1,
    },
    {
      filename: at('src/components/Panel/index.tsx'),
      cwd: REPO_ROOT,
      code: "const headClass = headingClassName ? `head ${headingClassName}` : 'head';",
      errors: 1,
    },
    {
      filename: at('src/app/(shell)/coven/page.tsx'),
      cwd: REPO_ROOT,
      code: "export default function Page() { return <main className={['page', wide && 'page--wide'].filter(Boolean).join(' ')} />; }",
      errors: 1,
    },
  ],
});

// A spell's shown name comes from `spellNameOf`, so the trimming and the fallback are one edit.
tester.run('spell-name-through-spell-name-of', rules['spell-name-through-spell-name-of'], {
  valid: [
    {
      filename: at('src/components/SpellCard/untitled.ts'),
      cwd: REPO_ROOT,
      code: 'export const spellNameOf = (title) => title?.trim() || UNTITLED_SPELL;',
    },
    {
      filename: at('src/components/SpellRecipe/body.tsx'),
      cwd: REPO_ROOT,
      code: 'const name = spellNameOf(title);',
    },
  ],
  invalid: [
    {
      filename: at('src/components/SpellRecipe/body.tsx'),
      cwd: REPO_ROOT,
      code: "const name = (title ?? '').trim() || UNTITLED_SPELL;",
      errors: 1,
    },
    {
      filename: at('src/components/SpellRecipe/deleted-href.ts'),
      cwd: REPO_ROOT,
      code: 'export const name = (title) => title?.trim() ?? UNTITLED_SPELL;',
      errors: 1,
    },
    {
      filename: at('src/app/(shell)/coven/[slug]/grimoire/[id]/page.tsx'),
      cwd: REPO_ROOT,
      code: 'const name = spell.title?.trim() || UNTITLED_SPELL;',
      errors: 1,
    },
  ],
});
