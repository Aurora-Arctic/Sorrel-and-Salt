'use client';

import type { Route } from 'next';
import { type ReactElement, useId, useState } from 'react';
import Combobox from '../Combobox';
import { FieldShell, fieldDescription } from '../Field';
import { useCompendiumSubstitutes } from '../IngredientForm/suggestions';
import LinkConfirm, { type LinkTarget } from './link-confirm';

// Link to the Compendium in the edit dialog of a coven's own entry (M8.17):
// a search of the whole compendium, where the page's Similar block offers
// only the near matches it found, then Link, which asks the shared confirmation
// (`link-confirm.tsx`) over the form. It sits beneath the form rather than in
// it: it saves nothing of the form's, and what it does replaces the entry the
// form edits. The pick is the compendium entry itself, so an edit of the text
// after it drops the pick, and Link waits for another.

export default function LinkSearch({
  workspaceId,
  localId,
  name,
  ingredientsHref,
}: {
  workspaceId: string;
  localId: string;
  /** The coven's own entry, as the dialog names it. */
  name: string;
  /** The coven's ingredient list; an entry's page in the coven is beneath it, by id. */
  ingredientsHref: string;
}): ReactElement {
  const id = useId();
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const [chosen, setChosen] = useState<LinkTarget>();
  const [asking, setAsking] = useState(false);
  const suggestions = useCompendiumSubstitutes(null, text, active);
  const hint = 'The compendium entry this becomes. Your jars and spells move to it.';
  const { aria, ...shell } = fieldDescription({ id, hint });

  return (
    <section aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`}>Link to the Compendium</h3>
      <FieldShell label="Compendium Entry" hint={hint} {...shell}>
        <Combobox
          id={shell.controlId}
          label="Compendium Entry"
          labelId={shell.labelId}
          value={text}
          onChange={(value) => {
            setText(value);
            setChosen(undefined);
          }}
          onFocus={() => setActive(true)}
          onPick={(value, option) => {
            setText(value);
            setChosen(
              option?.key
                ? {
                    id: option.key,
                    title: option.label ?? value,
                    thenHref: `${ingredientsHref}/${option.key}` as Route,
                  }
                : undefined,
            );
          }}
          suggestions={suggestions}
          offerTyped={false}
          placeholder="Search"
          {...aria}
        />
      </FieldShell>
      <div className="modal__actions">
        <button type="button" className="btn" disabled={!chosen} onClick={() => setAsking(true)}>
          Link
        </button>
      </div>
      {asking && chosen && (
        <LinkConfirm
          workspaceId={workspaceId}
          localId={localId}
          name={name}
          target={chosen}
          over="form"
          onClose={() => setAsking(false)}
        />
      )}
    </section>
  );
}
