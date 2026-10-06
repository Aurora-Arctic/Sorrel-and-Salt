'use client';

import { useCombobox, type UseComboboxStateChangeOptions } from 'downshift';
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  useId,
  useMemo,
  useState,
} from 'react';
import { ChevronIcon, ClearIcon } from './icons';
import { useTip } from './tip';
import type { Bucket, ComboboxOption, ComboboxProps, Item, Suggestions, TypedRow } from './types';
import './index.scss';

export { ComboboxEntry } from './entry';
export { ComboboxMultiSelect } from './multi-select';
export { ComboboxSelect } from './select';

// A text box that suggests as it is typed in, on Downshift's `useCombobox`:
// the hook owns the ARIA and the keyboard, and the markup, the rows and the
// Sass are ours (DESIGN.md §14). It changes no text itself: typing is reported
// through `onChange`, and a pick through `onPick`, so a field fills itself
// and a list adds an entry. Free text is the default: nothing is highlighted
// until an arrow key or the pointer picks it, so Enter and a blur keep what
// was typed. See claude-docs/components/combobox.md.

const isTyped = <O extends ComboboxOption>(item: Item<O>): item is TypedRow => 'typed' in item;

/** A row's identity, for React and Downshift: its own key, or else what it reads. */
const keyOf = <O extends ComboboxOption>(item: Item<O>): string => {
  if (isTyped(item)) return 'typed';
  return item.key ?? `${item.curated}:${item.label ?? ''}:${item.value}`;
};

/**
 * The rows in the order the list shows them — what was typed first, the
 * owner's call, then curated, then in use — flat for Downshift, which numbers
 * them, and bucketed for the headings. A source with one bucket shows no
 * headings. The headings say where a value comes from, the owner's call
 * (MB.131): a curated value is the compendium's, since its entries hold
 * nothing else, and one only in use is this coven's own.
 */
function arrange<O extends ComboboxOption>(
  options: O[],
  typed: string,
): { items: Item<O>[]; buckets: Bucket<O>[]; typedRow: TypedRow | null } {
  const bucketed = options.some((option) => option.curated !== undefined);
  const buckets: Bucket<O>[] = bucketed
    ? [
        {
          heading: 'From Compendium',
          key: 'compendium',
          rows: options.filter((option) => option.curated),
        },
        { heading: 'From Coven', key: 'coven', rows: options.filter((option) => !option.curated) },
      ].filter((bucket) => bucket.rows.length > 0)
    : [{ heading: null, key: 'all', rows: options }];
  const typedRow: TypedRow | null = typed === '' ? null : { value: typed, typed: true };
  const items: Item<O>[] = typedRow ? [typedRow] : [];
  items.push(...buckets.flatMap((bucket) => bucket.rows));
  return { items, buckets, typedRow };
}

/**
 * Downshift would select the highlighted row on blur, and empty a closed box
 * on Escape; neither is wanted. A pick leaves the text alone too: the caller
 * sets it, so a list can empty its box rather than show what it just added.
 */
function keepText<O extends ComboboxOption>(
  state: { inputValue: string; selectedItem: Item<O> | null },
  { type, changes }: UseComboboxStateChangeOptions<Item<O>>,
) {
  switch (type) {
    case useCombobox.stateChangeTypes.InputBlur:
    case useCombobox.stateChangeTypes.InputKeyDownEscape:
      return { ...changes, inputValue: state.inputValue, selectedItem: state.selectedItem };
    case useCombobox.stateChangeTypes.ItemClick:
    case useCombobox.stateChangeTypes.InputKeyDownEnter:
      return { ...changes, inputValue: state.inputValue };
    default:
      return changes;
  }
}

function statusOf(isOpen: boolean, suggestions: Suggestions | undefined): string {
  if (!isOpen || !suggestions) return '';
  const count = suggestions.options.length;
  if (count > 0) return `${count} suggestion${count === 1 ? '' : 's'}`;
  return suggestions.pending ? 'Looking for suggestions' : 'No suggestions';
}

function Combobox<O extends ComboboxOption = ComboboxOption>({
  id,
  label,
  labelId,
  value,
  onChange,
  onFocus,
  onBlur,
  onPick,
  onCommit,
  onRemoveLast,
  suggestions,
  entries,
  clear,
  qualifier,
  inputRef,
  name,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: ComboboxProps<O>): ReactElement {
  const headingId = useId();
  const qualifierId = useId();
  const detail = qualifier?.detail;
  // Opened on the box's focus as well as the qualifier's hover: the
  // qualifier is no stop of its own, and the box is what the keyboard reaches.
  const tip = useTip(() => Boolean(detail));
  // Whether the list would be open had it rows: it opens as they arrive.
  const [wantsOpen, setWantsOpen] = useState(false);
  const hasSource = suggestions !== undefined;
  const { items, buckets, typedRow } = useMemo(
    () => arrange(suggestions?.options ?? [], value.trim()),
    [suggestions, value],
  );
  const isOpen = hasSource && wantsOpen && items.length > 0;

  const { getInputProps, getMenuProps, getItemProps, getToggleButtonProps, highlightedIndex } =
    useCombobox<Item<O>>({
      items,
      inputId: id,
      labelId,
      menuId: `${id}-list`,
      getItemId: (index) => `${id}-row-${index}`,
      inputValue: value,
      // Held at null so that the same row can be picked twice over: a list
      // adds an entry on each pick.
      selectedItem: null,
      isOpen,
      itemToString: (item) => item?.value ?? '',
      itemToKey: (item) => (item === null ? null : keyOf(item)),
      stateReducer: keepText,
      onInputValueChange: ({ inputValue }) => onChange(inputValue ?? ''),
      onIsOpenChange: ({ isOpen: open }) => setWantsOpen(open),
      onSelectedItemChange: ({ selectedItem }) => {
        if (!selectedItem) return;
        if (isTyped(selectedItem)) onPick(selectedItem.value, null);
        else onPick(selectedItem.value, selectedItem);
      },
    });

  // Enter with nothing highlighted is the caller's — a list's add — and never
  // the form's submit. With no caller for it, Downshift closes an open list,
  // and a closed box lets Enter reach the form as a text box does. Backspace
  // or Delete in an empty box takes the last entry, as react-select's does.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if ((event.key === 'Backspace' || event.key === 'Delete') && value === '') {
      onRemoveLast?.();
      return;
    }
    if (event.key !== 'Enter') return;
    if (isOpen && highlightedIndex >= 0) return;
    if (!onCommit) return;
    event.preventDefault();
    setWantsOpen(false);
    onCommit(value);
  };

  // The control is the box: a press on its padding, or between the entries,
  // puts the caret in the text, as pressing a plain input would.
  const focusText = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    // The qualifier reads as part of the text, so a press on it does too.
    if (
      target === event.currentTarget ||
      target.classList.contains('combobox__values') ||
      target.closest('.combobox__qualifier')
    ) {
      event.preventDefault();
      event.currentTarget.querySelector<HTMLInputElement>('.combobox__input')?.focus();
    }
  };

  let index = 0;
  const row = (item: Item<O>) => {
    const at = index++;
    const highlighted = at === highlightedIndex;
    return (
      <li
        key={keyOf(item)}
        className={[
          'combobox__option',
          isTyped(item) && 'combobox__option--typed',
          highlighted && 'is-highlighted',
        ]
          .filter(Boolean)
          .join(' ')}
        {...getItemProps({ item, index: at })}
      >
        {isTyped(item) ? (
          `Use what you typed: ${item.value}`
        ) : (
          <>
            <span className="combobox__label">{item.label ?? item.value}</span>
            {item.note && <div className="combobox__note">{item.note}</div>}
          </>
        )}
      </li>
    );
  };

  return (
    <div className="combobox">
      {/* Presentational: the press is a convenience for the pointer, and the
          box inside is the control a reader and the keyboard reach. */}
      <div
        role="presentation"
        className={invalid ? 'input combobox__control is-invalid' : 'input combobox__control'}
        onMouseDown={focusText}
      >
        <div className="combobox__values">
          {entries}
          {/* The text's slot. With a qualifier it is as wide as the text,
              sized by a hidden copy of it, so the qualifier reads straight
              after: "Wax (Animal)". Always in the page, so that a pick
              adding the qualifier never remounts the box and takes its focus. */}
          <span
            className={qualifier ? 'combobox__text is-qualified' : 'combobox__text'}
            data-value={value}
          >
            <input
              className="combobox__input"
              {...getInputProps({
                ref: inputRef,
                name,
                // One character wide of its own, so that the slot, not the
                // browser's default of twenty, decides how wide the text is.
                size: 1,
                'aria-label': labelId ? undefined : label,
                // The field's own description first, then the qualifier's, so a
                // reader hears the hint before what the pick adds.
                'aria-describedby':
                  [
                    describedBy,
                    qualifier && `${qualifierId}-text`,
                    detail && `${qualifierId}-detail`,
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined,
                'aria-invalid': invalid,
                onKeyDown,
                onFocus: () => {
                  tip.show();
                  onFocus?.();
                },
                onBlur: () => {
                  tip.hide();
                  onBlur?.();
                },
              })}
            />
          </span>
          {qualifier && (
            // Hover on a wrapper holding the tooltip as well as the text, so
            // the pointer can move onto the tooltip without closing it.
            <span
              className="combobox__qualifier"
              onMouseEnter={tip.show}
              onMouseLeave={tip.hideSoon}
            >
              {/* In brackets, as the row picked read: "Wax (Animal)". */}
              <span id={`${qualifierId}-text`}>({qualifier.text})</span>
              {/* In the page while closed, faded out and aria-hidden, as an
                  entry's is, and read through the box's description. */}
              {detail && (
                <span
                  role="tooltip"
                  className={
                    tip.open ? 'combobox__qualifier-tip is-open' : 'combobox__qualifier-tip'
                  }
                  aria-hidden={!tip.open}
                >
                  <span id={`${qualifierId}-detail`}>{detail}</span>
                </span>
              )}
            </span>
          )}
        </div>
        {(clear || hasSource) && (
          <div className="combobox__indicators">
            {clear && (
              <button
                type="button"
                className="combobox__indicator"
                aria-label={clear.label}
                onClick={clear.onClear}
              >
                <ClearIcon />
              </button>
            )}
            {clear && hasSource && <span className="combobox__separator" aria-hidden="true" />}
            {hasSource && (
              <button
                type="button"
                className="combobox__indicator"
                {...getToggleButtonProps({ 'aria-label': `Show ${label} suggestions` })}
              >
                <ChevronIcon />
              </button>
            )}
          </div>
        )}
      </div>
      {/* Always in the page, as Downshift asks; empty and hidden while closed. */}
      <ul
        className={isOpen ? 'combobox__list is-open' : 'combobox__list'}
        {...getMenuProps({ 'aria-label': `${label} suggestions` })}
      >
        {isOpen && typedRow && row(typedRow)}
        {isOpen &&
          buckets.map((bucket) =>
            bucket.heading === null ? (
              bucket.rows.map(row)
            ) : (
              // A listbox's group is ARIA's own; optgroup belongs to a select.
              // oxlint-disable jsx-a11y/prefer-tag-over-role
              <li
                key={bucket.key}
                role="group"
                className="combobox__group"
                aria-labelledby={`${headingId}-${bucket.key}`}
              >
                <div id={`${headingId}-${bucket.key}`} className="combobox__heading">
                  {bucket.heading}
                </div>
                <ul role="presentation" className="combobox__rows">
                  {bucket.rows.map(row)}
                </ul>
              </li>
              // oxlint-enable jsx-a11y/prefer-tag-over-role
            ),
          )}
      </ul>
      {/* What the list holds, for a screen reader: the rows arrive after the
          typing, and nothing else says so. */}
      {hasSource && (
        <output className="visually-hidden" aria-label={`${label} suggestions`}>
          {statusOf(isOpen, suggestions)}
        </output>
      )}
    </div>
  );
}

export default Combobox;
