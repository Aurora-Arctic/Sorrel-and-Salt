'use client';

import { type ReactElement, useId, useMemo, useRef, useState } from 'react';
import Combobox, { ComboboxEntry } from '../Combobox';
import InfoTip from '../InfoTip';
import type { CategoryOption, CategoryPickerProps, PickerCategory } from './types';
import './index.scss';

// The categories picked from one box, as a list field's entries are (MB.126):
// typing narrows the live categories, listed under their groups, and a pick
// adds one as a chip inside the control in its group's colour, the owner's
// call. Data-free and controlled — ids in, ids out through `onChange` —
// rather than bound to react-hook-form, because M8.11 reuses it as the
// ingredients filter. Nothing can be typed in as a category, so there is no
// Add and no typed row (claude-docs/components/category-picker.md).

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/** Whether `text` is in `name`, case set aside; blank text is in every name. */
const matches = (name: string, text: string) =>
  name.toLowerCase().includes(text.trim().toLowerCase());

/**
 * The rows the box offers for `text`: the categories not yet picked whose
 * name holds it, under their groups, both alphabetical. Keyed by id, since
 * two groups may each hold a category of one name.
 */
function optionsFor(
  categories: readonly PickerCategory[],
  picked: ReadonlySet<string>,
  text: string,
): CategoryOption[] {
  return categories
    .filter((category) => !picked.has(category.id) && matches(category.name, text))
    .sort((a, b) => byName(a.group, b.group) || byName(a, b))
    .map((category) => ({
      value: category.name,
      note: category.description ?? undefined,
      key: category.id,
      heading: category.group.name,
      colors: category.group,
      category,
    }));
}

const CategoryPicker = ({
  legend,
  hint,
  entry,
  categories,
  pending = false,
  value,
  onChange,
  invalid = [],
  errorId,
  error,
  status,
}: CategoryPickerProps): ReactElement => {
  const id = useId();
  const legendId = `${id}-legend`;
  const hintId = `${id}-hint`;
  const boxId = `${id}-box`;
  const statusId = `${id}-status`;
  // What is typed: the box's own, never a value, since only a pick adds.
  const [text, setText] = useState('');
  // What the last add or removal did, for a screen reader: the box empties
  // and an entry appears or goes, and neither is otherwise announced.
  const [announcement, setAnnouncement] = useState('');
  // Its own ref rather than a form's setFocus: the box never unmounts, so it
  // can take the focus at once after an x has gone.
  const box = useRef<HTMLInputElement | null>(null);
  const focusBox = () => box.current?.focus();

  const picked = useMemo(() => new Set(value), [value]);
  const flagged = new Set(invalid);
  const byId = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const options = useMemo(() => optionsFor(categories, picked, text), [categories, picked, text]);

  const add = (category: PickerCategory) => {
    onChange([...value, category.id]);
    setText('');
    setAnnouncement(`Added ${category.name}`);
  };
  const remove = (categoryId: string) => {
    onChange(value.filter((pickedId) => pickedId !== categoryId));
    setAnnouncement(`Removed ${byId.get(categoryId)?.name ?? categoryId}`);
  };
  // Enter with nothing highlighted: the one category the text names, if the
  // text is its whole name, since nothing typed is a category of its own.
  const commit = (typed: string) => {
    const named = options.filter(
      (option) => option.value.toLowerCase() === typed.trim().toLowerCase(),
    );
    if (named.length === 1) add(named[0].category);
  };

  const entries = value.length > 0 && (
    <ul className="combobox__entries">
      {value.map((categoryId) => {
        const category = byId.get(categoryId);
        // A pick the categories do not hold — still being read, or since
        // retired — is drawn by its id once the read is done, so it can be
        // taken out; while the read is on, it waits for its name.
        if (!category && pending) return null;
        return (
          <ComboboxEntry
            key={categoryId}
            value={category?.name ?? categoryId}
            // Its group after the name on the tooltip's first line, the
            // owner's call, since the colour alone cannot name it, and the
            // description beneath; both read as its x's description.
            qualifier={category?.group.name}
            detail={category?.description ?? undefined}
            colors={category?.group}
            errorId={flagged.has(categoryId) ? errorId : undefined}
            onRemove={() => {
              remove(categoryId);
              // The pressed x is about to go; the box keeps the focus.
              focusBox();
            }}
          />
        );
      })}
    </ul>
  );

  const describedBy = [hint && hintId, status && statusId, errorId].filter(Boolean).join(' ');
  return (
    // Named by the legend's text alone: the tip's button inside the legend
    // would otherwise join the group's name.
    <fieldset className="fieldset category-picker" aria-labelledby={legendId}>
      <legend className="fieldset__legend category-picker__legend">
        <span id={legendId}>{legend}</span>
        {hint && (
          <InfoTip id={hintId} label={legend}>
            {hint}
          </InfoTip>
        )}
      </legend>
      <Combobox<CategoryOption>
        id={boxId}
        label={entry}
        value={text}
        onChange={setText}
        onPick={(_, option) => {
          if (option) add(option.category);
        }}
        onCommit={commit}
        onRemoveLast={() => {
          const last = value[value.length - 1];
          if (last !== undefined) remove(last);
        }}
        suggestions={{ options, pending }}
        offerTyped={false}
        entries={entries}
        clear={
          value.length > 0
            ? {
                label: `Clear ${legend}`,
                onClear: () => {
                  onChange([]);
                  setAnnouncement(`Cleared ${legend}`);
                  focusBox();
                },
              }
            : undefined
        }
        inputRef={box}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {status && (
        <p id={statusId} className="category-picker__status">
          {status}
        </p>
      )}
      {error}
      {/* Labelled, so that it is told from the box's own status region. */}
      <output className="visually-hidden" aria-label={`${legend} changes`}>
        {announcement}
      </output>
    </fieldset>
  );
};

export default CategoryPicker;
