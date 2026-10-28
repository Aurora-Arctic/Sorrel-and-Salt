'use client';

import { useCombobox, type UseComboboxStateChangeOptions } from 'downshift';
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { chipColors } from '../../lib/chip-colors';
import Spinner from '../Spinner';
import { ChevronIcon, ClearIcon } from './icons';
import { EmptyMessage, noMatch, Popup } from './popup';
import { useListPosition } from './position';
import { chipsRoom } from './room';
import { useTip } from '../InfoTip/use-tip';
import type {
  Bucket,
  ComboboxOption,
  ComboboxProps,
  ActionRow,
  Item,
  Suggestions,
  TypedRow,
} from './types';
import './index.scss';

export { ComboboxEntry } from './entry';
export { ComboboxMultiSelect } from './multi-select';
export { ComboboxSelect } from './select';
export { ComboboxSortableEntries } from './sortable';

// A text box that suggests as it is typed in, on Downshift's `useCombobox`:
// the hook owns the ARIA and the keyboard, and the markup, the rows and the
// Sass are ours (DESIGN.md §14). It changes no text itself: typing is reported
// through `onChange`, and a pick through `onPick`, so a field fills itself
// and a list adds an entry. Free text is the default: nothing is highlighted
// until an arrow key or the pointer picks it, so Enter and a blur keep what
// was typed. See claude-docs/components/combobox.md.

const isTyped = <O extends ComboboxOption>(item: Item<O>): item is TypedRow => 'typed' in item;
const isAction = <O extends ComboboxOption>(item: Item<O>): item is ActionRow => 'action' in item;

/** A row's identity, for React and Downshift: its own key, or else its bucket and what it reads. */
const keyOf = <O extends ComboboxOption>(item: Item<O>): string => {
  if (isTyped(item)) return 'typed';
  if (isAction(item)) return 'action';
  return item.key ?? `${item.curated}:${item.heading ?? ''}:${item.label ?? ''}:${item.value}`;
};

/**
 * The buckets a source names itself, by each row's `heading` (MB.126): one
 * per heading in the order the headings first appear, since the caller has
 * sorted them, and the rows with none in a trailing unheaded bucket. Keyed
 * by the heading's place rather than its text, which may hold a space.
 */
function bucketByHeading<O extends ComboboxOption>(options: O[]): Bucket<O>[] {
  const headed = new Map<string, O[]>();
  const unheaded: O[] = [];
  for (const option of options) {
    if (option.heading === undefined) unheaded.push(option);
    else headed.set(option.heading, [...(headed.get(option.heading) ?? []), option]);
  }
  const buckets: Bucket<O>[] = [...headed].map(([heading, rows], at) => ({
    heading,
    key: `heading-${at}`,
    rows,
  }));
  if (unheaded.length > 0) buckets.push({ heading: null, key: 'unheaded', rows: unheaded });
  return buckets;
}

/**
 * The rows in the order the list shows them — what was typed first, the
 * owner's call, then curated, then in use — flat for Downshift, which numbers
 * them, and bucketed for the headings. A source with one bucket shows no
 * headings; one whose rows carry a `heading` names its own buckets
 * (bucketByHeading). A caller with an `action` has its action row
 * last instead of the typed row first, blank box or not, since what it lists
 * can only be picked (MB.154): the sources found are what is looked for, and
 * making one is the way out when none is (MB.115, the owner's call). A caller
 * refusing what was typed has no typed row
 * (MB.174). The curated headings say where a value comes from, the owner's
 * call (MB.131): a curated value is the compendium's, since its entries hold
 * nothing else, and one only in use is this coven's own.
 */
function arrange<O extends ComboboxOption>(
  options: O[],
  typed: string,
  action: string | undefined,
  offerTyped: boolean,
  actionFirst: boolean,
): {
  items: Item<O>[];
  buckets: Bucket<O>[];
  firstRow: TypedRow | null;
  lastRow: ActionRow | null;
} {
  const headed = options.some((option) => option.heading !== undefined);
  const bucketed = options.some((option) => option.curated !== undefined);
  const buckets: Bucket<O>[] = headed
    ? bucketByHeading(options)
    : bucketed
      ? [
          {
            heading: 'From Compendium',
            key: 'compendium',
            rows: options.filter((option) => option.curated),
          },
          {
            heading: 'From Coven',
            key: 'coven',
            rows: options.filter((option) => !option.curated),
          },
        ].filter((bucket) => bucket.rows.length > 0)
      : [{ heading: null, key: 'all', rows: options }];
  const lastRow: ActionRow | null = action === undefined ? null : { value: action, action: true };
  // A suggestion whose row reads as the text typed, spaces and case aside,
  // already offers it, so the typed row would only repeat it, and stand first,
  // where Enter takes the typed text rather than the suggestion's own spelling.
  // Its row's text, the label where it has one: "Wax (Animal)" is not "wax", so
  // that typed row stays, a choice the rows do not offer.
  const folded = typed.trim().toLowerCase();
  const matched = options.some(
    (option) => (option.label ?? option.value).trim().toLowerCase() === folded,
  );
  const firstRow: TypedRow | null =
    lastRow === null && typed !== '' && offerTyped && !matched
      ? { value: typed, typed: true }
      : null;
  const items: Item<O>[] = firstRow ? [firstRow] : [];
  items.push(...buckets.flatMap((bucket) => bucket.rows));
  if (lastRow) {
    if (actionFirst) items.unshift(lastRow);
    else items.push(lastRow);
  }
  return { items, buckets, firstRow, lastRow };
}

/**
 * Downshift would select the highlighted row on blur, and empty a closed box
 * on Escape; neither is wanted. A pick leaves the text alone too: the caller
 * sets it, so a list can empty its box rather than show what it just added.
 * With `keepOpen`, a pick of a row leaves the list open for the next, as the
 * multi-select box's `keepChoosing` does; the action row still closes it,
 * since what it opens is somewhere else.
 */
const keepText =
  (keepOpen: boolean) =>
  <O extends ComboboxOption>(
    state: { inputValue: string; selectedItem: Item<O> | null },
    { type, changes }: UseComboboxStateChangeOptions<Item<O>>,
  ) => {
    switch (type) {
      case useCombobox.stateChangeTypes.InputBlur:
      case useCombobox.stateChangeTypes.InputKeyDownEscape:
        return { ...changes, inputValue: state.inputValue, selectedItem: state.selectedItem };
      case useCombobox.stateChangeTypes.ItemClick:
      case useCombobox.stateChangeTypes.InputKeyDownEnter: {
        const stays = keepOpen && changes.selectedItem != null && !isAction(changes.selectedItem);
        return { ...changes, inputValue: state.inputValue, ...(stays && { isOpen: true }) };
      }
      // Downshift remembers the last row picked, so with `selectedItem` held at
      // null the next pick reads as the prop changing, and it would write
      // the null item's text, '', into the box.
      case useCombobox.stateChangeTypes.ControlledPropUpdatedSelectedItem:
        return { ...changes, inputValue: state.inputValue };
      default:
        return changes;
    }
  };

function statusOf(
  isOpen: boolean,
  suggestions: Suggestions | undefined,
  noun: string,
  empty: string | undefined,
): string {
  if (!suggestions) return '';
  if (!isOpen) return empty ?? '';
  const count = suggestions.options.length;
  if (count > 0) return `${count} ${noun}${count === 1 ? '' : 's'}`;
  return suggestions.pending ? `Looking for ${noun}s` : `No ${noun}s`;
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
  empty,
  entries,
  clear,
  leading,
  toggle = true,
  action,
  offerTyped = true,
  actionFirst = false,
  highlightFirst = false,
  keepOpen = false,
  noun = 'suggestion',
  placeholder,
  required,
  qualifier,
  typedIcon,
  icon,
  listAnchor,
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
  // It gets out of the way of typing (MB.115): the first printable key and the
  // list opening both close it, and focus or a hover opens it again. The
  // detail stays in the box's description, so a screen reader still hears it.
  const tip = useTip(() => Boolean(detail), 'top-start');
  const hideTip = tip.hide;
  // Whether the list would be open had it rows: it opens as they arrive.
  const [wantsOpen, setWantsOpen] = useState(false);
  const hasSource = suggestions !== undefined;
  const actionLabel = action?.label;
  const { items, buckets, firstRow, lastRow } = useMemo(
    () => arrange(suggestions?.options ?? [], value.trim(), actionLabel, offerTyped, actionFirst),
    [suggestions, value, actionLabel, offerTyped, actionFirst],
  );
  const isOpen = hasSource && wantsOpen && items.length > 0;
  // A settled lookup with nothing found, said aloud rather than left as a
  // list that never opens. Not "open" to Downshift, which has no rows to hold.
  const message = empty === false ? undefined : (empty ?? noMatch(value));
  const showEmpty =
    message !== undefined &&
    wantsOpen &&
    suggestions?.pending === false &&
    value.trim() !== '' &&
    items.length === 0;
  const popupOpen = isOpen || showEmpty;
  // A lookup in flight: the visible spinner (shown after $loading-delay by its
  // own stylesheet) and `aria-busy`, beside the status that already says it.
  const busy = suggestions?.pending === true;
  // With an empty message the listbox is one part of a popup, and
  // the popup is what is placed; otherwise the list is, as it always was.
  const wrapped = message !== undefined;
  const { setControl, setList, listStyle, placement } = useListPosition(popupOpen, listAnchor);

  // The list opens where the tip would be read, and is what typing is for.
  useEffect(() => {
    if (popupOpen) hideTip();
  }, [popupOpen, hideTip]);

  const {
    getInputProps,
    getLabelProps,
    getMenuProps,
    getItemProps,
    getToggleButtonProps,
    highlightedIndex,
  } = useCombobox<Item<O>>({
    items,
    // Only a suggestion can be disabled; the typed and action rows never are.
    isItemDisabled: (item) => !isTyped(item) && !isAction(item) && Boolean(item.disabled),
    inputId: id,
    labelId,
    menuId: `${id}-list`,
    getItemId: (index) => `${id}-row-${index}`,
    inputValue: value,
    // Held at null so that the same row can be picked twice over: a list
    // adds an entry on each pick.
    selectedItem: null,
    isOpen,
    // A closed set's first row, so Enter takes the best match of what was
    // typed; a free-text box highlights nothing until asked.
    defaultHighlightedIndex: highlightFirst ? 0 : undefined,
    itemToString: (item) => item?.value ?? '',
    itemToKey: (item) => (item === null ? null : keyOf(item)),
    stateReducer: keepText(keepOpen),
    onInputValueChange: ({ inputValue }) => onChange(inputValue ?? ''),
    onIsOpenChange: ({ isOpen: open }) => setWantsOpen(open),
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) return;
      if (isAction(selectedItem)) action?.onSelect();
      else if (isTyped(selectedItem)) onPick(selectedItem.value, null);
      else onPick(selectedItem.value, selectedItem);
    },
  });

  // Enter with nothing highlighted is the caller's — a list's add — and never
  // the form's submit. With no caller for it, Downshift closes an open list,
  // and a closed box lets Enter reach the form as a text box does. Backspace
  // or Delete in an empty box takes the last entry, as react-select's does.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    // A printable key is one character long; a shortcut is not typing.
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) hideTip();
    // Escape on a box with no open list is the dialog's, unless the "no
    // matches" message is showing. That message is open content that Downshift
    // does not know of (it has no rows, so its isOpen is false), so Escape
    // closes it alone and goes no further, as it does on an open list (MB.115).
    // Otherwise Downshift prevents the key whenever the box holds text; the
    // reducer keeps that text but cannot undo the preventDefault, which would
    // stop the dialog's own cancel event.
    if (event.key === 'Escape' && !isOpen) {
      if (showEmpty) {
        setWantsOpen(false);
        event.preventDefault();
        return;
      }
      (
        event as KeyboardEvent<HTMLInputElement> & { preventDownshiftDefault?: boolean }
      ).preventDownshiftDefault = true;
      return;
    }
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
    // The qualifier reads as part of the text, so a press on it does too;
    // and so does one where the clear sits hidden, whose room the box keeps
    // (MB.115, the owner's call): `visibility` passes the press to the
    // indicators' strip, which is the control's own ground.
    if (
      target === event.currentTarget ||
      target.classList.contains('combobox__values') ||
      target.classList.contains('combobox__indicators') ||
      target.classList.contains('combobox__leading') ||
      target.closest('.combobox__qualifier') ||
      target.closest('.combobox__lead')
    ) {
      event.preventDefault();
      event.currentTarget.querySelector<HTMLInputElement>('.combobox__input')?.focus();
    }
  };

  let index = 0;
  const row = (item: Item<O>) => {
    const at = index++;
    const highlighted = at === highlightedIndex;
    const colors = isTyped(item) || isAction(item) ? undefined : item.colors;
    return (
      <li
        key={keyOf(item)}
        className={[
          'combobox__option',
          // The action row is no suggestion either, and reads as the typed row does.
          (isTyped(item) || isAction(item)) && 'combobox__option--typed',
          colors && 'is-coloured',
          !isTyped(item) && !isAction(item) && item.disabled && 'is-disabled',
          highlighted && 'is-highlighted',
        ]
          .filter(Boolean)
          .join(' ')}
        style={colors && chipColors(colors)}
        {...getItemProps({ item, index: at })}
      >
        {isAction(item) && item.value}
        {isTyped(item) && (
          <span className="combobox__label">
            {typedIcon && (
              <span className="combobox__icon" aria-hidden="true">
                {typedIcon}
              </span>
            )}
            {`Use what you typed: ${item.value}`}
          </span>
        )}
        {!isAction(item) && !isTyped(item) && (
          <>
            <span className="combobox__label">
              {item.icon && (
                <span className="combobox__icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label ?? item.value}
              {/* The space is a text node of the label's own: an accessible
                  name drops the one a span begins with. */}
              {item.count !== undefined && (
                <>
                  {' '}
                  <span className="combobox__count">{item.count}</span>
                </>
              )}
            </span>
            {item.note && <div className="combobox__note">{item.note}</div>}
          </>
        )}
      </li>
    );
  };

  return (
    <div className={popupOpen ? 'combobox is-open' : 'combobox'}>
      {/* Named by a <label> of its own, hidden, where the caller names none:
          Chrome flags a field no label names, an aria-label notwithstanding.
          Downshift ties the two by id. */}
      {!labelId && <label {...getLabelProps({ className: 'visually-hidden' })}>{label}</label>}
      {/* Presentational: the press is a convenience for the pointer, and the
          box inside is the control a reader and the keyboard reach. */}
      <div
        ref={setControl}
        role="presentation"
        className={invalid ? 'input combobox__control is-invalid' : 'input combobox__control'}
        onMouseDown={focusText}
      >
        {/* The caller's own control, ahead of the text so the tab order reads
            as the screen does. Pressing a button in it is not a press on the
            control's ground, so focusText leaves it alone (its click must
            still fire), and Downshift sees it inside the box. */}
        {leading && <div className="combobox__leading">{leading}</div>}
        <div className="combobox__values">
          {entries}
          {/* The chosen choice's mark, ahead of the text as a row's is ahead
              of its label; a press on it is a press on the text. */}
          {icon && (
            <span className="combobox__icon combobox__lead" aria-hidden="true">
              {icon}
            </span>
          )}
          {/* The text's slot. With a qualifier it is as wide as the text,
              sized by a hidden copy of it, so the qualifier reads straight
              after: "Wax (Animal)". Always in the page, so that a pick
              adding the qualifier never remounts the box and takes its focus. */}
          <span
            className={qualifier ? 'combobox__text is-qualified' : 'combobox__text'}
            data-value={value}
            // Beside chips, room for the placeholder, which stays to prompt
            // for the next entry while nothing is typed.
            style={chipsRoom(Boolean(entries), placeholder)}
          >
            <input
              className="combobox__input"
              {...getInputProps({
                ref: inputRef,
                name,
                placeholder,
                'aria-required': required || undefined,
                // One character wide of its own, so that the slot, not the
                // browser's default of twenty, decides how wide the text is.
                size: 1,
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
                'aria-busy': busy || undefined,
                onKeyDown,
                // Typing always wants the list, as Downshift's own input change
                // says. Its open callback alone is not enough: it fires only
                // when the open state differs from the props it last committed,
                // so a key landing just after a pick closed the list, before
                // that render committed, read as no change and the list stayed
                // shut (story 51). See claude-docs/components/combobox.md.
                onChange: () => setWantsOpen(true),
                onFocus: () => {
                  tip.show();
                  onFocus?.();
                },
                onBlur: () => {
                  tip.hide();
                  // An open list is Downshift's to close on blur; one wanted
                  // but empty is not open to it, so the wish is dropped here,
                  // or the next answer would open the list and pull the
                  // focus back from wherever it has gone.
                  if (!isOpen) setWantsOpen(false);
                  onBlur?.();
                },
              })}
            />
          </span>
          {qualifier && (
            // Hover on a wrapper holding the tooltip as well as the text, so
            // the pointer can move onto the tooltip without closing it.
            <span
              ref={tip.anchor}
              className="combobox__qualifier"
              onMouseEnter={tip.showSoon}
              onMouseLeave={tip.hideSoon}
            >
              {/* In brackets, as the row picked read: "Wax (Animal)". */}
              <span id={`${qualifierId}-text`}>({qualifier.text})</span>
              {/* In the page while closed, faded out and aria-hidden, as an
                  entry's is, and read through the box's description. */}
              {detail && (
                <span
                  ref={tip.bubble}
                  role="tooltip"
                  className={
                    tip.open ? 'combobox__qualifier-tip is-open' : 'combobox__qualifier-tip'
                  }
                  aria-hidden={!tip.open}
                  style={tip.bubbleStyle}
                >
                  <span id={`${qualifierId}-detail`}>{detail}</span>
                </span>
              )}
            </span>
          )}
        </div>
        {(clear || (hasSource && toggle) || busy) && (
          <div className="combobox__indicators">
            {/* Always drawn once the caller has a clear, and hidden while
                there is nothing to clear, rather than left out: its room,
                and the separator's, stay in the control, so typing,
                choosing and clearing never change its width (MB.115). */}
            {clear && (
              <button
                type="button"
                className={clear.empty ? 'combobox__indicator is-empty' : 'combobox__indicator'}
                aria-label={clear.label}
                aria-hidden={clear.empty || undefined}
                tabIndex={clear.empty ? -1 : undefined}
                disabled={clear.empty}
                onClick={clear.onClear}
              >
                <ClearIcon />
              </button>
            )}
            {/* After the clear, as react-select draws it, so the spinner
                sits by the chevron rather than across the clear's held room. */}
            {busy && <Spinner />}
            {clear && hasSource && toggle && (
              <span
                className={clear.empty ? 'combobox__separator is-empty' : 'combobox__separator'}
                aria-hidden="true"
              />
            )}
            {hasSource && toggle && (
              <button
                type="button"
                className="combobox__indicator"
                {...getToggleButtonProps({ 'aria-label': `Show ${label} ${noun}s` })}
              >
                <ChevronIcon />
              </button>
            )}
          </div>
        )}
      </div>
      {/* Always in the page, as Downshift asks; empty and hidden while closed. */}
      <Popup
        wrapped={wrapped}
        popupRef={setList}
        open={popupOpen}
        style={listStyle}
        placement={placement}
        after={
          <>
            {showEmpty && (
              // Not an option, so not in the listbox: a reader hears it through
              // the status, and would count it as a choice inside the list.
              <EmptyMessage>{message}</EmptyMessage>
            )}
          </>
        }
      >
        <ul
          className={['combobox__list', isOpen && 'is-open', wrapped && 'is-inset']
            .filter(Boolean)
            .join(' ')}
          // Placed beneath or above the box, as there is room (useListPosition);
          // inside a popup, the popup is.
          style={wrapped ? undefined : listStyle}
          data-placement={wrapped ? undefined : placement}
          {...getMenuProps({
            ref: wrapped ? undefined : setList,
            'aria-label': `${label} ${noun}s`,
          })}
        >
          {isOpen && firstRow && row(firstRow)}
          {isOpen && actionFirst && lastRow && row(lastRow)}
          {isOpen &&
            buckets.map((bucket) =>
              bucket.heading === null ? (
                bucket.rows.map(row)
              ) : (
                // A listbox's group is ARIA's own; optgroup belongs to a select.
                // On a div inside a presentational li, which the tree leaves
                // out, since ARIA allows no `group` role on an li (axe's
                // aria-allowed-role, first caught by M5.5's scan in a browser).
                // oxlint-disable jsx-a11y/prefer-tag-over-role
                <li key={bucket.key} role="presentation" className="combobox__group">
                  <div role="group" aria-labelledby={`${headingId}-${bucket.key}`}>
                    <div id={`${headingId}-${bucket.key}`} className="combobox__heading">
                      {bucket.heading}
                    </div>
                    <ul role="presentation" className="combobox__rows">
                      {bucket.rows.map(row)}
                    </ul>
                  </div>
                </li>
                // oxlint-enable jsx-a11y/prefer-tag-over-role
              ),
            )}
          {isOpen && !actionFirst && lastRow && row(lastRow)}
        </ul>
      </Popup>
      {/* What the list holds, for a screen reader: the rows arrive after the
          typing, and nothing else says so. */}
      {hasSource && (
        <output className="visually-hidden" aria-label={`${label} ${noun}s`}>
          {statusOf(isOpen, suggestions, noun, showEmpty ? message : undefined)}
        </output>
      )}
    </div>
  );
}

export default Combobox;
