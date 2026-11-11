'use client';

import { useSelect } from 'downshift';
import { keepEscapeInList } from './escape';
import type { KeyboardEvent, ReactElement } from 'react';
import Spinner from '../Spinner';
import { ChevronIcon, PlusIcon } from '../IconTip/icons';
import { OptionGroup, OptionLabel, preventDownshiftDefault } from './parts';
import { useListPosition } from './position';
import type { ComboboxChoice, ComboboxSelectProps } from './types';
import { cx } from '@/lib/class-names';

// The combobox's closed-set sibling, on Downshift's `useSelect`, for a field nothing is typed into
// (claude-docs/components/combobox.md, "The select-only box").

interface Run {
  group: string | undefined;
  /** The run's first index, which keys it. */
  at: number;
  rows: { choice: ComboboxChoice; index: number }[];
}

/** Consecutive choices of one `group`, each run drawn under its group's heading; a choice with none stands alone. */
function runsOf(choices: readonly ComboboxChoice[]): Run[] {
  const runs: Run[] = [];
  choices.forEach((choice, index) => {
    const last = runs[runs.length - 1];
    if (last && last.group === choice.group && choice.group !== undefined)
      last.rows.push({ choice, index });
    else runs.push({ group: choice.group, at: index, rows: [{ choice, index }] });
  });
  return runs;
}

export function ComboboxSelect({
  id,
  labelId,
  label,
  value,
  onChange,
  onBlur,
  choices,
  placeholder,
  fit,
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
      isItemDisabled: (choice) => Boolean(choice?.disabled),
      onSelectedItemChange: ({ selectedItem }) => {
        if (selectedItem) onChange(selectedItem.value);
      },
    });
  // Floated as the suggesting box's is, so a modal holding it does not stretch.
  const { setControl, setList, listStyle, placement } = useListPosition(isOpen);

  const option = ({ choice, index }: { choice: ComboboxChoice; index: number }) => (
    <li
      key={choice.value}
      className={cx(
        'combobox__option',
        choice.create && 'combobox__option--create',
        index === highlightedIndex && 'is-highlighted',
        choice.disabled && 'is-disabled',
      )}
      {...getItemProps({ item: choice, index })}
    >
      {choice.create && <PlusIcon />}
      <OptionLabel icon={choice.icon}>{choice.label}</OptionLabel>
      {choice.note && <div className="combobox__note">{choice.note}</div>}
    </li>
  );

  return (
    <div className={cx('combobox', fit && 'combobox--fit', isOpen && 'is-open')} ref={setControl}>
      {/* The control is the box itself: nothing is typed, so the whole of it
          is the one target, and it takes the focus. */}
      <div
        className={cx(
          'input combobox__control combobox__control--select',
          invalid && 'is-invalid',
          disabled && 'is-disabled',
        )}
        {...getToggleButtonProps({
          ref: inputRef,
          onBlur,
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            keepEscapeInList(isOpen)(event);
            // Ctrl+Z is the form's undo, not a letter to search the list for.
            if (event.ctrlKey || event.metaKey) {
              preventDownshiftDefault(event);
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
          {/* Every label, unseen in the shown one's place, so the box is as wide as the longest. */}
          {fit && (
            <span className="combobox__sizer" aria-hidden="true">
              {[placeholder, ...choices.map((choice) => choice.label)].map((text, index) => (
                <span key={index}>{text}</span>
              ))}
            </span>
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
        style={listStyle}
        data-placement={placement}
        {...getMenuProps({ ref: setList, 'aria-label': `${label} choices` })}
      >
        {isOpen &&
          runsOf(choices).map((run) =>
            run.group === undefined ? (
              run.rows.map(option)
            ) : (
              <OptionGroup
                key={`group-${run.at}`}
                headingId={`${id}-group-${run.at}`}
                heading={run.group}
              >
                {run.rows.map(option)}
              </OptionGroup>
            ),
          )}
      </ul>
    </div>
  );
}
