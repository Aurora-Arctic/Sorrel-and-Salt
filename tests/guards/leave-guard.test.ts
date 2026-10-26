import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

import { fromRoot } from '../support/paths';

// M13.14's guard (story 32): a form that holds what someone typed asks before
// a tab close, a reload or a link leaves it unsaved. The mechanism is
// `useLeaveGuard` (src/lib/navigation/leave-guard.tsx), which
// `useDiscardGuard` calls for every form already guarded in a modal, so a
// later form that forgets both fails here, in its own diff.
//
// What is scanned: every component in `src` that draws a `<form>`, renders
// `FormActions` or calls react-hook-form's `useForm`, comments and stories left
// out. Each must call `useDiscardGuard` or `useLeaveGuard` unless this list
// says why not. An entry that no longer needs its place fails too, so the list
// can only shrink.

const IS_A_FORM = /<form\b|<FormActions\b|\buseForm\s*[<(]/;
const GUARDED = /\buse(?:Discard|Leave)Guard\s*\(/;
const COMMENTS = /\/\*[\s\S]*?\*\/|(^|[^:'"`])\/\/.*$/gm;

/** Forms left unguarded, with why. */
const ALLOWED: Record<string, string> = {
  'src/components/NameForm/index.tsx': 'one short field, the account name (M13.14)',
  'src/components/EmailForm/index.tsx': 'one short field, the account address (M13.14)',
  'src/components/FilterForm/index.tsx':
    'a list filter that applies as it changes: nothing typed waits on a Save',
  'src/components/IngredientForm/reference-panel.tsx':
    'a panel inside IngredientForm, which it tells of its changes (`useReportPanelChanges`) and whose guard holds them',
  'src/components/IngredientEntry/coven-choice.tsx':
    'a single select inside a confirmation, a form only because SelectField is react-hook-form’s; nothing is submitted through it',
};

const isUnguardedForm = (code: string): boolean => IS_A_FORM.test(code) && !GUARDED.test(code);

function unguardedForms(): { forms: string[]; unguarded: string[] } {
  const forms: string[] = [];
  const unguarded: string[] = [];
  for (const file of inject('repoFiles')) {
    if (!/^src\/.*\.tsx$/.test(file) || /\.stories\.tsx$/.test(file)) continue;
    const code = readFileSync(fromRoot(file), 'utf8').replace(COMMENTS, '$1');
    if (!IS_A_FORM.test(code)) continue;
    forms.push(file);
    if (isUnguardedForm(code)) unguarded.push(file);
  }
  return { forms, unguarded };
}

describe('M13.14: every long form guards leaving it', () => {
  const { forms, unguarded } = unguardedForms();

  it('finds the forms it scans, so a clean result is not a blind scan', () => {
    expect(forms).toEqual(
      expect.arrayContaining([
        'src/components/CreateWorkspaceForm/index.tsx',
        'src/components/IngredientForm/index.tsx',
        'src/components/InviteDialog/index.tsx',
        'src/components/NameForm/index.tsx',
      ]),
    );
  });

  it('flags a new form with FormActions or useForm and no guard, and passes it with one', () => {
    const withActions = `export function NewForm() {
  return <form><FormActions noun="Spell" dirty={dirty} /></form>;
}`;
    const withUseForm = `const methods = useForm<Values>({ defaultValues });`;
    // Named in prose only: a comment is no guard.
    const guardedInComment = `// useDiscardGuard(dirty) belongs here\n${withActions}`;
    expect(isUnguardedForm(withActions)).toBe(true);
    expect(isUnguardedForm(withUseForm)).toBe(true);
    expect(isUnguardedForm(guardedInComment.replace(COMMENTS, '$1'))).toBe(true);

    expect(isUnguardedForm(`const discard = useDiscardGuard(isDirty);\n${withActions}`)).toBe(
      false,
    );
    expect(isUnguardedForm(`useLeaveGuard(isDirty, ask);\n${withUseForm}`)).toBe(false);
  });

  it('holds no unguarded form outside the list', () => {
    expect(unguarded.filter((file) => !(file in ALLOWED))).toEqual([]);
  });

  it('lists no form that no longer needs its place', () => {
    expect(Object.keys(ALLOWED).filter((file) => !unguarded.includes(file))).toEqual([]);
  });
});
