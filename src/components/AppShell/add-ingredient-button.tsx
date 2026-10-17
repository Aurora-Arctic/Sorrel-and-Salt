'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement, useId, useState } from 'react';
import { covenSlugOf } from '../../lib/coven-path';
import type { ShellWorkspace } from '../../lib/types';
import { fieldDescription, FieldShell } from '../Field';
import IngredientForm from '../IngredientForm';
import type { SavedIngredient } from '../IngredientForm/types';
import { ModalButton } from '../Modal';
import type { AddIngredientButtonProps } from './types';

// The bar's one global action (MB.7, M8.16). Where a new ingredient goes
// follows the area: the compendium on an admin page, for someone who
// curates; otherwise the coven the address names, else the viewer's only
// writable coven. A coven the viewer may only read is never a target, and
// with none to write to the button is not drawn at all.
// claude-docs/components/modal.md, "ModalButton".

const LABEL = 'Add Ingredient';
const CLASSES = 'btn app-shell__add';

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

/** The Coven choice, native so a view-only coven is a disabled option. */
function CovenSelect({
  workspaces,
  value,
  onChange,
}: {
  workspaces: readonly ShellWorkspace[];
  value: string;
  onChange: (id: string) => void;
}): ReactElement {
  const field = fieldDescription({ id: useId() });
  return (
    <FieldShell label="Coven" {...field}>
      <select
        id={field.controlId}
        className="select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {workspaces.map(({ id, name, canWrite }) => (
          <option key={id} value={id} disabled={!canWrite}>
            {name}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** The form for one coven, and the choice of which when the viewer has several. */
function AddIngredientBody({
  workspaces,
  initial,
  close,
  onSaved,
}: {
  workspaces: readonly ShellWorkspace[];
  initial: ShellWorkspace;
  close: () => void;
  onSaved: (saved: SavedIngredient) => void;
}): ReactElement {
  const [workspaceId, setWorkspaceId] = useState(initial.id);
  const chosen = workspaces.find(({ id }) => id === workspaceId) ?? initial;
  return (
    <>
      {workspaces.length > 1 && (
        <CovenSelect workspaces={workspaces} value={workspaceId} onChange={setWorkspaceId} />
      )}
      <IngredientForm
        // A fresh form per coven: what was typed belonged to the other one.
        key={chosen.id}
        workspaceId={chosen.id}
        onSaved={(saved, next) => {
          if (next !== 'open') return;
          onSaved(saved);
          close();
        }}
        onCancel={close}
        // A coven's ingredient page is M8.19's; until then a near match links
        // to the list it is in.
        duplicateHref={() => `/coven/${chosen.slug}/ingredients`}
      />
    </>
  );
}

const AddIngredientButton = ({
  viewer,
  workspaces,
}: AddIngredientButtonProps): ReactElement | null => {
  const pathname = usePathname();
  const [saved, setSaved] = useState<string | null>(null);

  if (!viewer.verified) return null;

  // A plain link: the admin page draws its dialog for a direct request, and
  // the route-modal provider that would open it at once sits below the shell.
  if (pathname.startsWith('/admin') && viewer.canCurate) {
    return (
      <Link href="/admin/compendium?new" className={CLASSES}>
        {LABEL}
      </Link>
    );
  }

  const writable = workspaces.filter(({ canWrite }) => canWrite);
  const slug = covenSlugOf(pathname);
  const initial =
    writable.find((workspace) => workspace.slug === slug) ??
    (writable.length === 1 ? writable[0] : undefined);
  // Several writable covens and none named: the first in the list is the
  // starting choice, which the Coven select changes.
  const target = initial ?? writable[0];
  if (!target) return null;

  return (
    <>
      {saved && <output className="app-shell__saved">{saved}</output>}
      <ModalButton label={LABEL} className={CLASSES} title={LABEL}>
        {(close) => (
          <AddIngredientBody
            workspaces={workspaces}
            initial={target}
            close={close}
            onSaved={(ingredient) => setSaved(savedMessage(ingredient))}
          />
        )}
      </ModalButton>
    </>
  );
};

export default AddIngredientButton;
