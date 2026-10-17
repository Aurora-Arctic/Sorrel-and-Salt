'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { covenSlugOf } from '../../lib/coven-path';
import type { ShellWorkspace } from '../../lib/types';
import IngredientForm from '../IngredientForm';
import type { SavedIngredient } from '../IngredientForm/types';
import Modal from '../Modal';
import AddIngredientMenu from './add-ingredient-menu';
import type { AddDestination, AddIngredientButtonProps } from './types';

// The bar's one global action (MB.7, M8.16). The places a new ingredient can go
// are the compendium, for someone who curates, and each coven they may write
// to. One place is a plain button; two or more make it a split button, the
// main part opening the default place and the chevron a menu of them all. The
// dialog for a coven names it in its head and cannot change it.
// claude-docs/components/modal.md, "Add Ingredient".

const LABEL = 'Add Ingredient';
// The solid green at the medium size (the owner's call, M8.16): the bar's one
// action, taller than a small button and shorter than a field.
const CLASSES = 'btn btn--solid btn--medium app-shell__add';
const MORE_CLASSES = `${CLASSES} app-shell__add--more`;

/**
 * A sentence for what a save left behind. The form's own Saved notice goes
 * with the form when the modal closes, so the button announces the save.
 */
function savedMessage(saved: SavedIngredient): string {
  const jars = (saved.stock ?? []).map(
    ({ variant, quantityOnHand, unit }) =>
      `the jar of ${variant.form} holding ${
        quantityOnHand === null ? 'an unmeasured amount' : `${quantityOnHand} ${unit ?? ''}`.trim()
      }`,
  );
  if (jars.length === 0) return `Saved ${saved.name}`;
  // Plain joining: the compiler’s library has no Intl.ListFormat.
  const list =
    jars.length > 1 ? `${jars.slice(0, -1).join(', ')} and ${jars[jars.length - 1]}` : jars[0];
  return `Saved ${saved.name}, with ${list}`;
}

/** The form for one coven. */
function AddIngredientBody({
  workspace,
  close,
  onSaved,
}: {
  workspace: ShellWorkspace;
  close: () => void;
  onSaved: (saved: SavedIngredient) => void;
}): ReactElement {
  return (
    <IngredientForm
      workspaceId={workspace.id}
      onSaved={(saved, next) => {
        if (next !== 'open') return;
        onSaved(saved);
        close();
      }}
      onCancel={close}
      // A coven's ingredient page is M8.19's; until then a near match links
      // to the list it is in.
      duplicateHref={() => `/coven/${workspace.slug}/ingredients`}
    />
  );
}

/**
 * Every place the viewer can add to, the compendium first, and which one the
 * bar's main part opens. On an admin page a curator's default is the
 * compendium; otherwise the coven the address names, else the first writable
 * one. A coven the viewer may only read is not a destination.
 */
function destinationsOf(
  viewer: AddIngredientButtonProps['viewer'],
  workspaces: AddIngredientButtonProps['workspaces'],
  pathname: string,
): { all: AddDestination[]; initial: AddDestination | undefined } {
  const covens: AddDestination[] = workspaces
    .filter(({ canWrite }) => canWrite)
    .map((workspace) => ({
      kind: 'coven',
      key: workspace.id,
      name: workspace.name,
      workspace,
    }));
  const compendium: AddDestination[] = viewer.canCurate
    ? [{ kind: 'compendium', key: 'compendium', name: 'Compendium' }]
    : [];
  const all = [...compendium, ...covens];
  const slug = covenSlugOf(pathname);
  const named = covens.find((d) => d.kind === 'coven' && d.workspace.slug === slug);
  const onAdmin = pathname.startsWith('/admin') && compendium.length > 0;
  return { all, initial: onAdmin ? compendium[0] : (named ?? covens[0] ?? compendium[0]) };
}

const AddIngredientButton = ({
  viewer,
  workspaces,
}: AddIngredientButtonProps): ReactElement | null => {
  const pathname = usePathname();
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);
  // The coven whose dialog is open; the destination is fixed once it opens.
  const [adding, setAdding] = useState<ShellWorkspace | null>(null);
  const main = useRef<HTMLButtonElement>(null);
  // Set by a close only, so the first render takes no focus.
  const returning = useRef(false);

  useEffect(() => {
    if (!adding && returning.current) {
      returning.current = false;
      main.current?.focus();
    }
  }, [adding]);

  if (!viewer.verified) return null;
  const { all, initial } = destinationsOf(viewer, workspaces, pathname);
  if (!initial) return null;

  const go = (destination: AddDestination): void => {
    // The compendium's dialog is the admin page's own, drawn for a direct
    // request: the route-modal provider that would open it at once sits below
    // the shell.
    if (destination.kind === 'compendium') router.push('/admin/compendium?new');
    else setAdding(destination.workspace);
  };

  return (
    <>
      {saved && <output className="app-shell__saved">{saved}</output>}
      <span className="app-shell__add-group">
        <button ref={main} type="button" className={CLASSES} onClick={() => go(initial)}>
          {LABEL}
        </button>
        {all.length > 1 && (
          <AddIngredientMenu destinations={all} className={MORE_CLASSES} onChoose={go} />
        )}
      </span>
      {adding && (
        <Modal
          // One heading, so the dialog's name is the phrase itself, "Add
          // Ingredient to Whitethorn Coven": an eyebrow comes first in a
          // name ("Whitethorn Coven, Add Ingredient"), and a qualifier is
          // joined to the title by a comma.
          title={`${LABEL} to ${adding.name}`}
          onClose={() => {
            returning.current = true;
            setAdding(null);
          }}
        >
          {(close) => (
            <AddIngredientBody
              workspace={adding}
              close={close}
              onSaved={(ingredient) => setSaved(savedMessage(ingredient))}
            />
          )}
        </Modal>
      )}
    </>
  );
};

export default AddIngredientButton;
