'use client';

import { type ReactElement, useId, useMemo, useState } from 'react';
import { fold } from '@/lib/text';
import Combobox from '../Combobox';
import { LazySortableEntries } from '../Combobox/lazy-sortable';
import { FieldError } from '../Field';
import { AUDIENCE_LABELS, NARROWNESS, ordinal } from './rules';
import type { HelpFormAudience, HelpSubPageChoice } from './types';

// A guide's sub pages as the sortable Combobox's chips: their order is the order readers meet them. A pick from another guide is
// drawn outlined with that guide's name, and a line under the control says it moves when the form is saved
// (claude-docs/components/help-article-form.md, "Sub Pages").

export function HelpSubPagesField({
  guideId,
  audience,
  value,
  candidates,
  onChange,
  error,
  disabled,
}: {
  /** The guide being edited, so its own sub pages are not drawn as moving; null for a new row. */
  guideId: string | null;
  audience: HelpFormAudience;
  value: readonly string[];
  candidates: readonly HelpSubPageChoice[];
  onChange: (next: string[]) => void;
  error?: string;
  disabled?: boolean;
}): ReactElement {
  const id = useId();
  const legendId = `${id}-legend`;
  const noteId = `${id}-note`;
  const errorId = `${id}-error`;
  const empty = value.length === 0;
  const describedBy = [empty && noteId, error && errorId].filter(Boolean).join(' ') || undefined;
  const [text, setText] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const byId = useMemo(
    () => new Map(candidates.map((choice) => [choice.id, choice])),
    [candidates],
  );
  const chosen = value.flatMap((key) => byId.get(key) ?? []);
  const moving = (choice: HelpSubPageChoice) =>
    choice.parentId !== null && choice.parentId !== guideId;

  const typed = fold(text);
  const options = candidates
    .filter(
      (choice) =>
        choice.id !== guideId &&
        !value.includes(choice.id) &&
        NARROWNESS[choice.audience] >= NARROWNESS[audience] &&
        (typed === '' || fold(choice.title).includes(typed)),
    )
    .map((choice) => ({
      value: choice.id,
      label: choice.title,
      note: [
        AUDIENCE_LABELS[choice.audience],
        choice.parentTitle ? `in ${choice.parentTitle}` : 'no parent',
      ].join(' · '),
    }));

  const entries = chosen.map((choice) => ({
    id: choice.id,
    value: choice.title,
    outlined: moving(choice),
    detail: moving(choice) ? `from ${choice.parentTitle}` : undefined,
    removeNoun: 'Sub Page',
    onRemove: () => {
      onChange(value.filter((key) => key !== choice.id));
      setAnnouncement(`Removed ${choice.title}`);
    },
    errorId: error ? errorId : undefined,
  }));
  const moves = chosen.flatMap((choice, index) =>
    moving(choice)
      ? [
          `${choice.title} leaves ${choice.parentTitle} and becomes this guide’s ${ordinal(index + 1)} sub page when you save.`,
        ]
      : [],
  );

  return (
    <fieldset
      className="fieldset help-article-form__sub-pages"
      aria-labelledby={legendId}
      aria-describedby={describedBy}
      disabled={disabled}
    >
      <legend className="fieldset__legend">
        <span id={legendId}>Sub Pages</span>
      </legend>
      <Combobox
        id={`${id}-box`}
        label="Add Sub Page"
        value={text}
        onChange={setText}
        onPick={(picked) => {
          const choice = byId.get(picked);
          if (!choice) return;
          onChange([...value, picked]);
          setText('');
          setAnnouncement(`Added ${choice.title}`);
        }}
        onCommit={() => {}}
        onRemoveLast={() => {
          const last = chosen[chosen.length - 1];
          if (!last) return;
          onChange(value.slice(0, -1));
          setAnnouncement(`Removed ${last.title}`);
        }}
        suggestions={{ options, pending: false }}
        offerTyped={false}
        empty="No article matches. An article that holds sub pages, an FAQ entry or a term is never offered."
        keepOpen
        noun="article"
        placeholder="Add Sub Page"
        entries={
          entries.length > 0 && (
            <LazySortableEntries
              entries={entries}
              onMove={(from, to) => {
                const next = [...value];
                const [moved] = next.splice(from, 1);
                if (moved !== undefined) next.splice(to, 0, moved);
                onChange(next);
              }}
            />
          )
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {moves.map((line) => (
        <p key={line} className="field__hint help-article-form__warning">
          {line}
        </p>
      ))}
      {/* The grip's own instructions tell a screen reader how to move a chip, so a note is drawn only while there is none. */}
      {empty && (
        <p id={noteId} className="field__hint">
          Adding one makes this a guide and fixes Parent at No Parent.
        </p>
      )}
      <FieldError id={errorId} message={error} />
      {/* Labelled, so that it is told from the box's own status region. */}
      <output className="visually-hidden" aria-label="Sub Pages changes">
        {announcement}
      </output>
    </fieldset>
  );
}
