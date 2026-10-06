'use client';

import { useMultipleSelection, useSelect, type UseSelectStateChangeOptions } from 'downshift';
import { type MouseEvent, type ReactElement, useState } from 'react';
import { ComboboxEntry } from './entry';
import { ChevronIcon, ClearIcon } from './icons';
import type { ComboboxChoice, ComboboxMultiSelectProps } from './types';

// A closed set holding several values: the select-only box, on Downshift's
// `useSelect` with `useMultipleSelection`, the pairing Downshift documents
// for a multi-select. The values chosen are a list's chips inside the
// control, ahead of the box, each with its x, and a clear and the chevron on
// the right, react-select's multi-select. Nothing is typed, and the list
// offers only what is not yet chosen. See claude-docs/components/combobox.md,
// "The multi-select box".

const selectTypes = useSelect.stateChangeTypes;
const CHOOSING: readonly string[] = [
  selectTypes.ToggleButtonKeyDownEnter,
  selectTypes.ToggleButtonKeyDownSpaceButton,
  selectTypes.ItemClick,
];

export function ComboboxMultiSelect({
  id,
  labelId,
  label,
  values,
  onChange,
  onBlur,
  choices,
  placeholder,
  required,
  inputRef,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: ComboboxMultiSelectProps): ReactElement {
  const chosen = values.flatMap((value) => choices.filter((choice) => choice.value === value));
  const left = choices.filter((choice) => !values.includes(choice.value));
  // What the last change did, for a screen reader: a chip appears or goes,
  // and nothing else says so. The list fields' own announcement.
  const [announcement, setAnnouncement] = useState('');

  const { getDropdownProps, addSelectedItem, removeSelectedItem, setSelectedItems } =
    useMultipleSelection<ComboboxChoice>({
      selectedItems: chosen,
      itemToKey: (choice) => choice?.value ?? null,
      // Held at none: the chips are not Downshift's to focus, since each
      // already has its x in the tab order, as every list's entry does. The
      // hook keeps Backspace in the box, which takes the last.
      activeIndex: -1,
      onSelectedItemsChange: ({ type, selectedItems }) => {
        onChange(selectedItems.map((choice) => choice.value));
        if (type === useMultipleSelection.stateChangeTypes.FunctionSetSelectedItems) {
          setAnnouncement(`Cleared ${label}`);
        } else if (selectedItems.length > chosen.length) {
          setAnnouncement(`Added ${selectedItems[selectedItems.length - 1]?.label}`);
        } else {
          const gone = chosen.find((choice) => !selectedItems.includes(choice));
          if (gone) setAnnouncement(`Removed ${gone.label}`);
        }
      },
    });

  // A choice keeps the list open for the next, as Downshift's multi-select
  // does, with the row below it under the highlight; a list with nothing
  // left to offer never opens.
  const keepChoosing = (
    state: { highlightedIndex: number },
    { type, changes }: UseSelectStateChangeOptions<ComboboxChoice>,
  ) => {
    if (CHOOSING.includes(type) && changes.selectedItem) {
      return {
        ...changes,
        isOpen: left.length > 1,
        highlightedIndex: Math.min(state.highlightedIndex, left.length - 2),
      };
    }
    if (changes.isOpen && left.length === 0) return { ...changes, isOpen: false };
    return changes;
  };

  const { isOpen, highlightedIndex, getToggleButtonProps, getMenuProps, getItemProps, toggleMenu } =
    useSelect<ComboboxChoice>({
      items: left,
      // Held at none: a choice is added to the list, never shown in the box.
      selectedItem: null,
      itemToString: (choice) => choice?.label ?? '',
      itemToKey: (choice) => choice?.value ?? null,
      toggleButtonId: id,
      labelId,
      menuId: `${id}-list`,
      getItemId: (index) => `${id}-row-${index}`,
      stateReducer: keepChoosing,
      onSelectedItemChange: ({ selectedItem }) => {
        if (selectedItem) addSelectedItem(selectedItem);
      },
    });

  // Found by its id rather than held in a ref: the caller's ref and
  // Downshift's two already share the box.
  const focusBox = () => document.getElementById(id)?.focus();

  // The control is the box: a press on its padding or its chevron opens the
  // list as a press on the box does. An x and the clear are their own.
  const pressControl = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, [role="combobox"]')) return;
    event.preventDefault();
    focusBox();
    toggleMenu();
  };

  return (
    <div className="combobox">
      {/* Presentational, as the typed box's control is: the box inside is
          what a reader and the keyboard reach, and the chips' x and the
          clear sit beside it rather than inside it, so that a press or a key
          on them is never the box's. */}
      <div
        role="presentation"
        className={['input combobox__control combobox__control--select', invalid && 'is-invalid']
          .filter(Boolean)
          .join(' ')}
        onMouseDown={pressControl}
      >
        <div className="combobox__values">
          {chosen.length > 0 && (
            <ul className="combobox__entries">
              {chosen.map((choice) => (
                <ComboboxEntry
                  key={choice.value}
                  value={choice.label}
                  onRemove={() => {
                    removeSelectedItem(choice);
                    // The pressed x is about to go; the box keeps the focus.
                    focusBox();
                  }}
                />
              ))}
            </ul>
          )}
          <div
            className="combobox__input combobox__input--select"
            {...getToggleButtonProps(
              getDropdownProps({
                ref: inputRef,
                onBlur,
                'aria-label': labelId ? undefined : label,
                'aria-describedby': describedBy,
                'aria-invalid': invalid,
                'aria-required': required,
              }),
            )}
          >
            {/* What it holds, read as a select reads its choice: the chips
                are beside the box, not in it. */}
            {chosen.length > 0 ? (
              <span className="visually-hidden">
                {chosen.map((choice) => choice.label).join(', ')}
              </span>
            ) : (
              <span className="is-placeholder">{placeholder}</span>
            )}
          </div>
        </div>
        <div className="combobox__indicators">
          {chosen.length > 0 && (
            <>
              <button
                type="button"
                className="combobox__indicator"
                aria-label={`Clear ${label}`}
                onClick={() => {
                  setSelectedItems([]);
                  focusBox();
                }}
              >
                <ClearIcon />
              </button>
              <span className="combobox__separator" aria-hidden="true" />
            </>
          )}
          <span className="combobox__indicator" aria-hidden="true">
            <ChevronIcon />
          </span>
        </div>
      </div>
      {/* Always in the page, as Downshift asks; empty and hidden while closed. */}
      <ul
        className={isOpen ? 'combobox__list is-open' : 'combobox__list'}
        {...getMenuProps({ 'aria-label': `${label} choices` })}
      >
        {isOpen &&
          left.map((choice, index) => (
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
      {/* Labelled, so that it is told from any other status on the page. */}
      <output className="visually-hidden" aria-label={`${label} changes`}>
        {announcement}
      </output>
    </div>
  );
}
