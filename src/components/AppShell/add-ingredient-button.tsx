'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { ingredientLinkTarget } from './site-target';
import type { Route } from 'next';
import { usePathname, useSearchParams } from 'next/navigation';
import { type ReactElement, Suspense, useRef, useState } from 'react';
import { covenSlugOf } from '../../lib/coven-path';
import { sectionsFor } from '../MenuButton/sections';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import type { ShellWorkspace } from '../../lib/types';
import IngredientForm from '../IngredientForm';
import type { SavedIngredient } from '../IngredientForm/types';
import Modal from '../Modal';
import { NEW, NEW_INGREDIENT, askedCoven, closedHref, openHref } from './add-href';
import AddIngredientMenu from './add-ingredient-menu';
import type { AddDestination, AddIngredientButtonProps } from './types';

// The bar's one global action (MB.7, M8.16). The places a new ingredient can go
// are the compendium, for someone who curates, and each coven they may write
// to. One place is a plain button; two or more make it a split button, the
// main part opening the default place and the chevron a menu of them all. The
// dialog for a coven names it in its head and cannot change it.
//
// A coven's dialog is opened by the page's address, as the admin pages' are
// (the owner's call, 2026-10-18): `?new=ingredient` on any page in the shell opens
// the default coven's, `?new=<slug>` a named one's, and a bare `?new` reads as
// `?new=ingredient` (the owner's call, 2026-10-27; `?new=spell` is the grimoire's), so a reload keeps it, Back
// leaves it and the address can be shared. The press writes the address with
// the browser's own `pushState`, which Next's router follows, rather than a
// navigation: nothing on the server needs re-reading to draw the form. On an
// admin page `?new` is the page's own compendium dialog, so a coven chosen
// there is a navigation to that coven's index with `?new=ingredient`.
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
      `the jar of ${formLabel(variant.form)} holding ${
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
      workspaceName={workspace.name}
      onSaved={(saved, next) => {
        if (next !== 'open') return;
        onSaved(saved);
        close();
      }}
      onCancel={close}
      duplicateHref={(match) => `/coven/${workspace.slug}/ingredients/${match.id}`}
      // A linked substitute that is a compendium entry opens its public page; a
      // coven's own has none to open from here.
      entryHref={({ slug, isGlobal }) => (isGlobal ? `/compendium/ingredients/${slug}` : undefined)}
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
): {
  all: AddDestination[];
  compendium: AddDestination[];
  covens: AddDestination[];
  initial: AddDestination | undefined;
} {
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
  return {
    all,
    compendium,
    covens,
    initial: onAdmin ? compendium[0] : (named ?? covens[0] ?? compendium[0]),
  };
}

const AddIngredientButton = ({
  viewer,
  workspaces,
}: AddIngredientButtonProps): ReactElement | null => {
  const pathname = usePathname();
  const params = useSearchParams();
  const { navigate } = usePendingNavigation();
  const [saved, setSaved] = useState<string | null>(null);
  const main = useRef<HTMLButtonElement>(null);
  // Set by a save that opens the new entry's page: the dialog then closes on
  // that navigation, and the close must not write the address under it.
  const leaving = useRef(false);

  const { all, compendium, covens, initial } = destinationsOf(viewer, workspaces, pathname);
  // The menu's groups, the side the viewer is on first: a coven's page the covens, any
  // other page the compendium, as the bar has always led with it.
  const sections = sectionsFor(
    { compendium, coven: covens },
    covenSlugOf(pathname) ? 'coven' : 'compendium',
  );
  const onAdmin = pathname.startsWith('/admin');
  // The coven whose dialog the address opens: `?new=ingredient` (or a bare
  // `?new`) the default coven, `?new=<slug>` that coven, and nothing for a
  // slug the viewer cannot write to or for `?new=spell`, the grimoire's. An
  // admin page's `?new` is its own dialog, never this one.
  const asked = onAdmin ? null : askedCoven(params.get(NEW));
  const defaultCoven = initial?.kind === 'coven' ? initial.workspace : undefined;
  const adding =
    asked === null
      ? null
      : asked === 'default'
        ? (defaultCoven ?? null)
        : (all.find(
            (d): d is Extract<AddDestination, { kind: 'coven' }> =>
              d.kind === 'coven' && d.workspace.slug === asked,
          )?.workspace ?? null);

  if (!viewer.verified) return null;
  if (!initial) return null;

  const go = (destination: AddDestination): void => {
    // The compendium's dialog is the admin page's own, drawn for a direct
    // request: the route-modal provider that would open it at once sits below
    // the shell.
    if (destination.kind === 'compendium') {
      navigate('/admin/compendium?new');
    } else if (onAdmin) {
      navigate(`/coven/${destination.workspace.slug}?${NEW}=${NEW_INGREDIENT}` as Route);
    } else {
      const slug =
        destination.workspace.id === defaultCoven?.id ? undefined : destination.workspace.slug;
      leaving.current = false;
      window.history.pushState(null, '', openHref(pathname, params, slug));
    }
  };

  const close = () => {
    // Replacing, so Back does not open it again, as RouteModal closes. A save
    // is on its way to the new entry's page, and a replace here would land
    // under that push and keep the page where it was.
    if (!leaving.current && params.has(NEW)) {
      window.history.replaceState(null, '', closedHref(pathname, params));
    }
  };

  return (
    <>
      {saved && <output className="app-shell__saved">{saved}</output>}
      <span className="app-shell__add-group">
        <button ref={main} type="button" className={CLASSES} onClick={() => go(initial)}>
          {LABEL}
        </button>
        {all.length > 1 && (
          <AddIngredientMenu sections={sections} className={MORE_CLASSES} onChoose={go} />
        )}
      </span>
      {adding && (
        <Modal
          // Another coven's address is another form.
          key={adding.id}
          // The coven over the action, and named "Add Ingredient to
          // Whitethorn Coven".
          destination={adding.name}
          title={LABEL}
          onClose={close}
          // Back to the bar's main part when what opened it, the menu's
          // item, is gone with the menu.
          returnTo={() => main.current}
        >
          {(done) => (
            <AddIngredientBody
              workspace={adding}
              close={done}
              onSaved={(ingredient) => {
                setSaved(savedMessage(ingredient));
                // Save Ingredient opens the new ingredient's page, an address
                // without `?new`, which closes the dialog.
                leaving.current = true;
                const href = `/coven/${adding.slug}/ingredients/${ingredient.id}`;
                navigate(href as Route, { target: ingredientLinkTarget(href, !onAdmin) });
              }}
            />
          )}
        </Modal>
      )}
    </>
  );
};

/** In a Suspense boundary, as reading the address asks for. */
const AddIngredientButtonAtAddress = (props: AddIngredientButtonProps): ReactElement => (
  <Suspense fallback={null}>
    <AddIngredientButton {...props} />
  </Suspense>
);

export default AddIngredientButtonAtAddress;
