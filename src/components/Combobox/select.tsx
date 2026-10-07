'use client';

import { useSelect } from 'downshift';
import type { ReactElement } from 'react';
import { ChevronIcon } from './icons';
import { useListPosition } from './position';
import type { ComboboxChoice, ComboboxSelectProps } from './types';

// The combobox's closed-set sibling: the same control and list, on
// Downshift's `useSelect`, for a field nothing is typed into. The hook owns
// the ARIA — a select-only combobox, as ARIA 1.2 has it — and the keyboard:
// the arrows, Enter and Space to choose, Escape to close, and a letter to jump
// to the choice it starts. See claude-docs/components/combobox.md, "The
// select-only box".

export function ComboboxSelect({
  id,
  labelId,
  label,
  value,
  onChange,
  onBlur,
  choices,
  placeholder,
  required,
  inputRef,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: ComboboxSelectProps): ReactElement {
  const selected = choices.find((choice) => choice.value === value) ?? null;
  const { isOpen, highlightedIndex, getToggleButtonProps, getMenuProps, getItemProps } =
    useSelect<ComboboxChoice>({
      items: [...choices],
      selectedItem: selected,
      itemToString: (choice) => choice?.label ?? '',
      itemToKey: (choice) => choice?.value ?? null,
      toggleButtonId: id,
      labelId,
      menuId: `${id}-list`,
      getItemId: (index) => `${id}-row-${index}`,
      onSelectedItemChange: ({ selectedItem }) => {
        if (selectedItem) onChange(selectedItem.value);
      },
    });
  // Floated as the suggesting box's is, so a modal holding it does not stretch (M5.6).
  const { setControl, setList, listStyle, placement } = useListPosition(isOpen);

  return (
    <div className="combobox" ref={setControl}>
      {/* The control is the box itself: nothing is typed, so the whole of it
          is the one target, and it takes the focus. */}
      <div
        className={['input combobox__control combobox__control--select', invalid && 'is-invalid']
          .filter(Boolean)
          .join(' ')}
        {...getToggleButtonProps({
          ref: inputRef,
          onBlur,
          'aria-label': labelId ? undefined : label,
          'aria-describedby': describedBy,
          'aria-invalid': invalid,
          'aria-required': required,
        })}
      >
        <div className="combobox__values">
          {selected ? (
            <span className="combobox__value">{selected.label}</span>
          ) : (
            <span className="combobox__value is-placeholder">{placeholder}</span>
          )}
        </div>
        <div className="combobox__indicators">
          <span className="combobox__indicator" aria-hidden="true">
            <ChevronIcon />
          </span>
        </div>
      </div>
      {/* Always in the page, as Downshift asks; empty and hidden while closed. */}
      <ul
        className={isOpen ? 'combobox__list is-open' : 'combobox__list'}
        // Placed beneath or above the box, as there is room (useListPosition).
        style={listStyle}
        data-placement={placement}
        {...getMenuProps({ ref: setList, 'aria-label': `${label} choices` })}
      >
        {isOpen &&
          choices.map((choice, index) => (
            <li
              key={choice.value}
              className={
                index === highlightedIndex ? 'combobox__option is-highlighted' : 'combobox__option'
              }
              {...getItemProps({ item: choice, index })}
            >
              <span className="combobox__label">{choice.label}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
