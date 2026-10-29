'use client';

import { type ReactElement, useState } from 'react';
import Combobox from '../Combobox';
import { ComboboxEntry } from '../Combobox/entry';
import { matchesLabelOrGroup } from '../Combobox/match';
import type { ComboboxChoice, ComboboxOption } from '../Combobox/types';

// The typing form of the facet box: the typed Combobox with the chosen values as chips, for a set long
// enough to narrow or sorted under headings. It offers only what is not chosen, leaves a zero out, and a
// pick leaves the list open (claude-docs/components/facet-combobox.md, "Contracts").

export function FacetTypeahead({
  id,
  label,
  labelId,
  choices,
  values,
  onChange,
  placeholder,
  emptyPlaceholder,
  removeNoun,
  loading,
  hideZeros,
  describedBy,
}: {
  id: string;
  label: string;
  labelId: string;
  choices: readonly ComboboxChoice[];
  values: readonly string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyPlaceholder?: string;
  removeNoun?: string;
  loading?: boolean;
  hideZeros: boolean;
  describedBy?: string;
}): ReactElement {
  const [text, setText] = useState('');
  const isOut = (choice: ComboboxChoice) => Boolean(choice.disabled);
  const needle = text.trim().toLowerCase();

  const options: ComboboxOption[] = choices
    .filter(
      (choice) =>
        !values.includes(choice.value) &&
        !(hideZeros && choice.count === 0) &&
        matchesLabelOrGroup(choice.label, choice.group, text),
    )
    .map((choice) => ({
      value: choice.value,
      label: choice.label,
      icon: choice.icon,
      count: choice.count,
      heading: choice.group,
      disabled: isOut(choice) || undefined,
      note: choice.note,
    }))
    // A disabled row lists last, within its heading as the headings are drawn.
    .sort((a, b) => Number(Boolean(a.disabled)) - Number(Boolean(b.disabled)));

  const chosen = values.flatMap((value) => choices.filter((choice) => choice.value === value));

  return (
    <Combobox
      id={id}
      label={label}
      labelId={labelId}
      aria-describedby={describedBy}
      placeholder={
        chosen.length === 0 && options.length === 0 && !needle ? emptyPlaceholder : placeholder
      }
      value={text}
      onChange={setText}
      onPick={(value) => {
        const choice = choices.find((other) => other.value === value);
        if (!choice || isOut(choice)) return;
        onChange([...values, value]);
        setText('');
      }}
      offerTyped={false}
      keepOpen
      highlightFirst
      empty="No Matches"
      noun={label.toLowerCase()}
      suggestions={{ options, pending: false }}
      onRemoveLast={() => onChange(values.slice(0, -1))}
      entries={
        chosen.length > 0 && (
          <ul className="combobox__entries">
            {chosen.map((choice) => (
              <ComboboxEntry
                key={choice.value}
                value={choice.label}
                icon={choice.icon}
                count={choice.count}
                loading={loading}
                outlined
                removeNoun={removeNoun}
                onRemove={() => onChange(values.filter((other) => other !== choice.value))}
              />
            ))}
          </ul>
        )
      }
      clear={{
        label: `Clear ${label}`,
        onClear: () => onChange([]),
        empty: values.length === 0,
      }}
    />
  );
}
