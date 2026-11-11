import type { ReactElement } from 'react';
import type { ComboboxChoice } from '../Combobox/types';

/**
 * The multiple select a facet field draws before hydration, so the GET form sends the choice:
 * options sit under their `group` heading with " count" after the label. A choice with a count of
 * 0 is left out unless chosen, as the box leaves it out; no count read means it is always offered.
 */
export function NativeGroupedSelect({
  id,
  name,
  choices,
  values,
  hideZeros = true,
  describedBy,
}: {
  id: string;
  name: string;
  choices: readonly ComboboxChoice[];
  values: readonly string[];
  hideZeros?: boolean;
  describedBy?: string;
}): ReactElement {
  const option = (choice: ComboboxChoice) => (
    <option key={choice.value} value={choice.value} disabled={choice.disabled}>
      {choice.label}
      {choice.count !== undefined && ` ${choice.count}`}
    </option>
  );
  const shown = choices.filter(
    (choice) => !(hideZeros && choice.count === 0) || values.includes(choice.value),
  );
  const groups: { group: string | undefined; rows: ComboboxChoice[] }[] = [];
  for (const choice of shown) {
    const at = groups.find((entry) => entry.group === choice.group);
    if (at) at.rows.push(choice);
    else groups.push({ group: choice.group, rows: [choice] });
  }
  return (
    <select
      id={id}
      className="select facet-combobox__native"
      name={name}
      multiple
      defaultValue={[...values]}
      aria-describedby={describedBy}
    >
      {groups.map(({ group, rows }) =>
        group === undefined ? (
          rows.map(option)
        ) : (
          <optgroup key={group} label={group}>
            {rows.map(option)}
          </optgroup>
        ),
      )}
    </select>
  );
}
