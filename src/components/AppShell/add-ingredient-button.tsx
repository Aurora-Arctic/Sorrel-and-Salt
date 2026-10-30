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
import { NEW, NEW_COMPENDIUM_ENTRY, askedCoven, closedHref, openHref } from './add-href';
import AddIngredientMenu from './add-ingredient-menu';
import type { AddDestination, AddIngredientButtonProps } from './types';

// The bar's one global action: a plain button for one place to add, a split button for two or more. A
// coven's dialog opens at `?new=ingredient-coven-<slug>` by `pushState`; the compendium's New Entry
// is a navigation (claude-docs/components/modal.md, "Add Ingredient").

const LABEL = 'Add Ingredient';
// The solid green at the medium size: the bar's one action, taller than a small
// button and shorter than a field.
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
  onCreated,
}: {
  workspace: ShellWorkspace;
  close: () => void;
  onSaved: (saved: SavedIngredient) => void;
  onCreated: (saved: SavedIngredient) => void;
}): ReactElement {
  return (
    <IngredientForm
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      onCreated={onCreated}
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
 * Every place the viewer can add to, the compendium first: the bar's main part opens a curator's compendium
 * on an admin page, otherwise the coven the address names, else the first writable one. A read-only coven is
 * no destination.
 */
function destinationsOf(
  viewer: AddIngredientButtonProps['viewer'],
  workspaces: AddIngredientButtonProps['workspaces'],
  pathname: string,
): {
  all: AddDestination[];
  compendium: AddDestination[];
  covens: AddDestination[];
  defaultCoven: ShellWorkspace | undefined;
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
  const coven = named ?? covens[0];
  return {
    all,
    compendium,
    covens,
    defaultCoven: coven?.kind === 'coven' ? coven.workspace : undefined,
    initial: onAdmin ? compendium[0] : (coven ?? compendium[0]),
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
  // The coven whose dialog an autosave has already created its ingredient in: the dialog stays
  // open after `?new` is replaced by the ingredient’s own `?edit=` address.
  const [created, setCreated] = useState<ShellWorkspace | null>(null);

  const { all, compendium, covens, defaultCoven, initial } = destinationsOf(
    viewer,
    workspaces,
    pathname,
  );
  // The menu's groups, the side the viewer is on first: a coven's page the covens,
  // any other page the compendium.
  const sections = sectionsFor(
    { compendium, coven: covens },
    covenSlugOf(pathname) ? 'coven' : 'compendium',
  );
  const onAdmin = pathname.startsWith('/admin');
  // The coven whose dialog the address opens: `?new=ingredient` (or a bare `?new`
  // off an admin page) the default coven, `?new=ingredient-coven-<slug>` that
  // coven, and nothing for a slug the viewer cannot write to or any other value.
  const asked = askedCoven(params.get(NEW), onAdmin);
  const asking =
    asked === null
      ? null
      : asked === 'default'
        ? (defaultCoven ?? null)
        : (all.find(
            (d): d is Extract<AddDestination, { kind: 'coven' }> =>
              d.kind === 'coven' && d.workspace.slug === asked,
          )?.workspace ?? null);

  const adding = asking ?? created;

  if (!viewer.verified) return null;
  if (!initial) return null;

  const go = (destination: AddDestination): void => {
    // The compendium's dialog is the admin page's own, drawn for a direct
    // request: the route-modal provider that would open it at once sits below
    // the shell.
    if (destination.kind === 'compendium') {
      navigate(`/admin/compendium?${NEW}=${NEW_COMPENDIUM_ENTRY}` as Route);
    } else {
      leaving.current = false;
      setCreated(null);
      window.history.pushState(null, '', openHref(pathname, params, destination.workspace.slug));
    }
  };

  const close = () => {
    // Replacing, so Back does not open it again, as RouteModal closes. A save
    // is on its way to the new entry's page, and a replace here would land
    // under that push and keep the page where it was.
    if (created) {
      setCreated(null);
      if (!leaving.current) {
        navigate(`/coven/${created.slug}/ingredients` as Route, { replace: true });
      }
      return;
    }
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
              onCreated={(ingredient) => {
                // Reloading reopens the ingredient in its own dialog on the coven’s list.
                window.history.replaceState(
                  null,
                  '',
                  `/coven/${adding.slug}/ingredients?edit=${ingredient.id}`,
                );
                setCreated(adding);
              }}
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
