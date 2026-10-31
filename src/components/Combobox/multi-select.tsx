'use client';

import { useMultipleSelection, useSelect, type UseSelectStateChangeOptions } from 'downshift';
import { type MouseEvent, type ReactElement, useState } from 'react';
import { ComboboxEntry } from './entry';
import { keepEscapeInList } from './escape';
import { ChevronIcon, CrossIcon } from '../IconTip/icons';
import { EmptyMessage, Popup } from './popup';
import { useListPosition } from './position';
import { chipsRoom } from './room';
import type { ComboboxChoice, ComboboxMultiSelectProps } from './types';

// A closed set holding several values: the select-only box on Downshift's `useSelect` with `useMultipleSelection`, the chips inside the control ahead of the box
// (claude-docs/components/combobox.md, "The multi-select box").

const selectTypes = useSelect.stateChangeTypes;
const CHOOSING: readonly string[] = [
  selectTypes.ToggleButtonKeyDownEnter,
  selectTypes.ToggleButtonKeyDownSpaceButton,
  selectTypes.ItemClick,
];

/** What the open list says with every choice made: the one place it is worded. */
const EVERY_CHOICE = 'Every option is already chosen';

/** What a disabled zero-count row says beside its count. */

export function ComboboxMultiSelect({
  id,
  labelId,
  label,
  values,
  onChange,
  onBlur,
  choices,
  placeholder,
  emptyPlaceholder,
  required,
  inputRef,
  hideZeros,
  loading,
  chipsOutlined,
  removeNoun,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: ComboboxMultiSelectProps): ReactElement {
  const chosen = values.flatMap((value) => choices.filter((choice) => choice.value === value));
  // The rows offered: those not yet chosen, only those with a count above 0 when asked, a disabled row after the rest, so the arrows meet every chooseable row first.
  const unchosen = choices.filter(
    (choice) => !values.includes(choice.value) && !(hideZeros && choice.count === 0),
  );
  const left = [...unchosen.filter((c) => !c.disabled), ...unchosen.filter((c) => c.disabled)];
  const choosable = left.filter((choice) => !choice.disabled).length;
  // What the last change did, for a screen reader, since a chip appearing or going says nothing itself.
  const [announcement, setAnnouncement] = useState('');

  const { getDropdownProps, addSelectedItem, removeSelectedItem, setSelectedItems } =
    useMultipleSelection<ComboboxChoice>({
      selectedItems: chosen,
      itemToKey: (choice) => choice?.value ?? null,
      // Held at none: the chips are not Downshift's to focus, as each has its x in the tab order; the hook keeps Backspace in the box.
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

  // A choice keeps the list open for the next; a list with nothing left to offer opens to say so.
  const keepChoosing = (
    state: { highlightedIndex: number },
    { type, changes }: UseSelectStateChangeOptions<ComboboxChoice>,
  ) => {
    if (CHOOSING.includes(type) && changes.selectedItem) {
      return {
        ...changes,
        // Shut once only disabled rows are left, as it is with none.
        isOpen: choosable > 1,
        highlightedIndex: Math.min(state.highlightedIndex, choosable - 2),
      };
    }
    return changes;
  };

  const { isOpen, highlightedIndex, getToggleButtonProps, getMenuProps, getItemProps, toggleMenu } =
    useSelect<ComboboxChoice>({
      items: left,
      isItemDisabled: (choice) => Boolean(choice?.disabled),
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

  // Found by its id rather than held in a ref, as the caller's ref and Downshift's two already share the box.
  const focusBox = () => document.getElementById(id)?.focus();
  const empty = chosen.length === 0;

  // The control is the box: a press on its padding or its chevron opens the list; an x and the clear are their own.
  const pressControl = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, [role="combobox"]')) return;
    event.preventDefault();
    focusBox();
    toggleMenu();
  };

  // Floated as the suggesting box's is, so a modal holding it does not stretch.
  const { setControl, setList, listStyle, placement } = useListPosition(isOpen);

  return (
    <div className={isOpen ? 'combobox is-open' : 'combobox'} ref={setControl}>
      {/* Presentational: the box inside is what a reader and the keyboard reach, and the chips' x and the clear sit beside it. */}
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
              {chosen.map((choice, index) => (
                <ComboboxEntry
                  // The position joins the value, as a repeat can be loaded and two chips must not share a key.
                  key={`${index}-${choice.value}`}
                  value={choice.label}
                  icon={choice.icon}
                  count={choice.count}
                  loading={loading}
                  outlined={chipsOutlined}
                  removeNoun={removeNoun}
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
            style={chipsRoom(chosen.length > 0, placeholder)}
            {...getToggleButtonProps(
              getDropdownProps({
                ref: inputRef,
                onBlur,
                onKeyDown: keepEscapeInList(isOpen),
                'aria-label': labelId ? undefined : label,
                'aria-describedby': describedBy,
                'aria-invalid': invalid,
                'aria-required': required,
              }),
            )}
          >
            {/* What it holds, read as a select reads its choice, as the chips are beside the box. */}
            {chosen.length > 0 && (
              <span className="visually-hidden">
                {chosen.map((choice) => choice.label).join(', ')}
              </span>
            )}
            {/* The placeholder stays after the chips while a choice is left, aria-hidden beside chips as read it would sound like a choice. */}
            {left.length > 0 && (
              <span className="is-placeholder" aria-hidden={chosen.length > 0 || undefined}>
                {placeholder}
              </span>
            )}
            {/* Nothing chosen and nothing left to offer: say so, rather than a blank box. */}
            {left.length === 0 && chosen.length === 0 && emptyPlaceholder && (
              <span className="is-placeholder">{emptyPlaceholder}</span>
            )}
          </div>
        </div>
        <div className="combobox__indicators">
          {/* Drawn while empty too, hidden, so the control keeps one width. */}
          <button
            type="button"
            className={empty ? 'combobox__indicator is-empty' : 'combobox__indicator'}
            aria-label={`Clear ${label}`}
            aria-hidden={empty || undefined}
            tabIndex={empty ? -1 : undefined}
            disabled={empty}
            onClick={() => {
              setSelectedItems([]);
              focusBox();
            }}
          >
            <CrossIcon />
          </button>
          <span
            className={empty ? 'combobox__separator is-empty' : 'combobox__separator'}
            aria-hidden="true"
          />
          <span className="combobox__indicator" aria-hidden="true">
            <ChevronIcon />
          </span>
        </div>
      </div>
      {/* Always in the page, as Downshift asks; the popup is what is placed. */}
      <Popup
        wrapped
        popupRef={setList}
        open={isOpen}
        style={listStyle}
        placement={placement}
        after={isOpen && left.length === 0 && <EmptyMessage>{EVERY_CHOICE}</EmptyMessage>}
      >
        <ul
          className={isOpen ? 'combobox__list is-inset is-open' : 'combobox__list is-inset'}
          {...getMenuProps({ 'aria-label': `${label} choices` })}
        >
          {isOpen &&
            left.map((choice, index) => (
              <li
                key={choice.value}
                className={[
                  'combobox__option',
                  index === highlightedIndex && 'is-highlighted',
                  choice.disabled && 'is-disabled',
                ]
                  .filter(Boolean)
                  .join(' ')}
                {...getItemProps({ item: choice, index })}
              >
                <span className="combobox__label">
                  {choice.icon && (
                    <span className="combobox__icon" aria-hidden="true">
                      {choice.icon}
                    </span>
                  )}
                  {choice.label}
                  {/* The space is a text node of the label's own, as a span's leading one is dropped from the name. */}
                  {choice.count !== undefined && (
                    <>
                      {' '}
                      <span className="combobox__count">{choice.count}</span>
                    </>
                  )}
                </span>
                {choice.note && <div className="combobox__note">{choice.note}</div>}
              </li>
            ))}
        </ul>
      </Popup>
      {/* Labelled, so that it is told from any other status on the page. */}
      <output className="visually-hidden" aria-label={`${label} changes`}>
        {isOpen && left.length === 0 ? EVERY_CHOICE : announcement}
      </output>
    </div>
  );
}
