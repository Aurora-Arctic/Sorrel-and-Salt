'use client';

import { useSelect } from 'downshift';
import { keepEscapeInList } from './escape';
import type { KeyboardEvent, ReactElement } from 'react';
import Spinner from '../Spinner';
import { ChevronIcon, PlusIcon } from '../IconTip/icons';
import { useListPosition } from './position';
import type { ComboboxChoice, ComboboxSelectProps } from './types';

// The combobox's closed-set sibling, on Downshift's `useSelect`, for a field nothing is typed into
// (claude-docs/components/combobox.md, "The select-only box").

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
  busy,
  disabled,
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
      // Shown and read, but stepped over by the arrows and refused a press.
      isItemDisabled: (choice) => Boolean(choice?.disabled),
      onSelectedItemChange: ({ selectedItem }) => {
        if (selectedItem) onChange(selectedItem.value);
      },
    });
  // Floated as the suggesting box's is, so a modal holding it does not stretch.
  const { setControl, setList, listStyle, placement } = useListPosition(isOpen);

  return (
    <div className={isOpen ? 'combobox is-open' : 'combobox'} ref={setControl}>
      {/* The control is the box itself: nothing is typed, so the whole of it
          is the one target, and it takes the focus. */}
      <div
        className={[
          'input combobox__control combobox__control--select',
          invalid && 'is-invalid',
          disabled && 'is-disabled',
        ]
          .filter(Boolean)
          .join(' ')}
        {...getToggleButtonProps({
          ref: inputRef,
          onBlur,
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            keepEscapeInList(isOpen)(event);
            // Ctrl+Z is the form's undo, not a letter to search the list for.
            if (event.ctrlKey || event.metaKey) {
              (
                event as KeyboardEvent<HTMLElement> & { preventDownshiftDefault?: boolean }
              ).preventDownshiftDefault = true;
            }
          },
          'aria-label': labelId ? undefined : label,
          'aria-describedby': describedBy,
          'aria-invalid': invalid,
          'aria-required': required,
          'aria-busy': busy ? true : undefined,
          // Downshift leaves the click and key handlers off a disabled box and would write `disabled` onto the div, so the box says it with `aria-disabled` and leaves the tab order.
          disabled,
        })}
        {...(disabled && { disabled: undefined, 'aria-disabled': true, tabIndex: -1 })}
      >
        <div className="combobox__values">
          {selected ? (
            <span className="combobox__value">
              {selected.icon && (
                <span className="combobox__icon" aria-hidden="true">
                  {selected.icon}
                </span>
              )}
              {selected.label}
            </span>
          ) : (
            <span className="combobox__value is-placeholder">{placeholder}</span>
          )}
        </div>
        <div className="combobox__indicators">
          {/* Decorative; the box's `aria-busy` is what is announced. The
              spinner shows itself only after its own delay. */}
          {busy && <Spinner />}
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
              className={[
                'combobox__option',
                choice.create && 'combobox__option--create',
                index === highlightedIndex && 'is-highlighted',
                choice.disabled && 'is-disabled',
              ]
                .filter(Boolean)
                .join(' ')}
              {...getItemProps({ item: choice, index })}
            >
              {choice.create && <PlusIcon />}
              <span className="combobox__label">
                {choice.icon && (
                  <span className="combobox__icon" aria-hidden="true">
                    {choice.icon}
                  </span>
                )}
                {choice.label}
              </span>
              {choice.note && <div className="combobox__note">{choice.note}</div>}
            </li>
          ))}
      </ul>
    </div>
  );
}
