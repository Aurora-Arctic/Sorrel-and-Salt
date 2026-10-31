'use client';

import { useCombobox, type UseComboboxStateChangeOptions } from 'downshift';
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { chipColors } from '../../lib/chip-colors';
import Spinner from '../Spinner';
import { ChevronIcon, CrossIcon } from '../IconTip/icons';
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

// A text box that suggests as it is typed in, on Downshift's `useCombobox`: the hook owns the ARIA and the keyboard, the markup and Sass are ours (DESIGN.md §14).
// It changes no text itself, and free text is the default; see claude-docs/components/combobox.md.

const isTyped = <O extends ComboboxOption>(item: Item<O>): item is TypedRow => 'typed' in item;
const isAction = <O extends ComboboxOption>(item: Item<O>): item is ActionRow => 'action' in item;

/** A row's identity, for React and Downshift: its own key, or else its bucket and what it reads. */
const keyOf = <O extends ComboboxOption>(item: Item<O>): string => {
  if (isTyped(item)) return 'typed';
  if (isAction(item)) return 'action';
  return item.key ?? `${item.curated}:${item.heading ?? ''}:${item.label ?? ''}:${item.value}`;
};

/** The buckets a source names itself, by each row's `heading`, in the order the headings first appear, with the rows that have none in a trailing unheaded bucket. */
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
 * The rows in the order the list shows them, flat for Downshift and bucketed for the headings; a caller's `action` row goes last in place of the typed row first
 * (claude-docs/components/combobox.md, "Row order").
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
  // A suggestion whose row reads as the text typed already offers it, so the typed row would only repeat it; a label that differs ("Wax (Animal)") keeps the typed row.
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
 * Downshift would select the highlighted row on blur and empty a closed box on Escape; neither is wanted, and a pick leaves the text to the caller.
 * With `keepOpen` a pick of a row leaves the list open; the action row still closes it.
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
      // Downshift remembers the last row picked, so with `selectedItem` held at null the next pick would write the null item's text into the box.
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

/** Downshift writes `aria-activedescendant=""` while no option is highlighted; an empty id is read as a broken reference, so the attribute is left out. */
function withoutEmptyDescendant<T extends { 'aria-activedescendant'?: string }>(props: T): T {
  if (props['aria-activedescendant']) return props;
  const { 'aria-activedescendant': _empty, ...rest } = props;
  return rest as T;
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
  // Opened on the box's focus as well as the qualifier's hover; the first printable key and the list opening close it, and the box's description still holds the detail.
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
  // With an empty message the listbox is one part of a popup, and the popup is what is placed.
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

  // Enter with nothing highlighted is the caller's and never the form's submit; Backspace or Delete in an empty box takes the last entry.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    // A printable key is one character long; a shortcut is not typing.
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) hideTip();
    // Escape on a box with no open list is the dialog's, unless the "no matches" message is showing, which Downshift cannot see and Escape closes alone
    // (claude-docs/components/combobox.md, "Typed box and Escape").
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
    // The qualifier reads as part of the text, and so does the room where the clear sits hidden: `visibility` passes the press to the indicators' strip.
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
              {/* The space is a text node of the label's own, as a span's leading one is dropped from the name. */}
              {item.count !== undefined && (
                <>
                  {' '}
                  <span className="combobox__count">{item.count}</span>
                </>
              )}
              {item.badge && <> {item.badge}</>}
            </span>
            {(item.note || item.meta) && (
              <div className={item.meta ? 'combobox__note combobox__note--meta' : 'combobox__note'}>
                {item.note}
                {item.note && item.meta && ' · '}
                {item.meta}
              </div>
            )}
          </>
        )}
      </li>
    );
  };

  return (
    <div className={popupOpen ? 'combobox is-open' : 'combobox'}>
      {/* Named by a hidden <label> where the caller names none, as Chrome flags a field only an aria-label names. */}
      {!labelId && <label {...getLabelProps({ className: 'visually-hidden' })}>{label}</label>}
      {/* Presentational: the press is for the pointer; the box inside is the control. */}
      <div
        ref={setControl}
        role="presentation"
        className={invalid ? 'input combobox__control is-invalid' : 'input combobox__control'}
        onMouseDown={focusText}
      >
        {/* The caller's own control, ahead of the text so the tab order reads as the screen does; focusText leaves a press in it alone. */}
        {leading && <div className="combobox__leading">{leading}</div>}
        <div className="combobox__values">
          {entries}
          {/* The chosen choice's mark, ahead of the text; a press on it is a press on the text. */}
          {icon && (
            <span className="combobox__icon combobox__lead" aria-hidden="true">
              {icon}
            </span>
          )}
          {/* The text's slot, sized by a hidden copy when qualified, always in the page so a pick never remounts the box. */}
          <span
            className={qualifier ? 'combobox__text is-qualified' : 'combobox__text'}
            data-value={value}
            // Beside chips, room for the placeholder, which prompts for the next entry.
            style={chipsRoom(Boolean(entries), placeholder)}
          >
            <input
              className="combobox__input"
              {...withoutEmptyDescendant(
                getInputProps({
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
                  // Typing always wants the list: Downshift's open callback alone misses a key landing just after a pick closed it, before that render committed
                  // (claude-docs/components/combobox.md, "Typing always wants the list").
                  onChange: () => setWantsOpen(true),
                  onFocus: () => {
                    tip.show();
                    onFocus?.();
                  },
                  onBlur: () => {
                    tip.hide();
                    // An open list is Downshift's to close on blur; one wanted but empty is not open to it, so the wish is dropped here.
                    if (!isOpen) setWantsOpen(false);
                    onBlur?.();
                  },
                }),
              )}
            />
          </span>
          {qualifier && (
            // Hover on a wrapper holding the tooltip, so the pointer can move onto it without closing it.
            <span
              ref={tip.anchor}
              className="combobox__qualifier"
              // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
              onMouseEnter={tip.showSoon}
              onMouseLeave={tip.hideSoon}
            >
              {/* In brackets, as the row picked read: "Wax (Animal)". */}
              <span id={`${qualifierId}-text`}>({qualifier.text})</span>
              {/* In the page while closed, faded out and aria-hidden, as an entry's is; read through the box's description. */}
              {detail && (
                <span
                  ref={tip.bubble}
                  role="tooltip"
                  className={
                    tip.open ? 'combobox__qualifier-tip is-open' : 'combobox__qualifier-tip'
                  }
                  // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
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
            {/* Always drawn once the caller has a clear, hidden when empty, so the control's width never changes. */}
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
                <CrossIcon />
              </button>
            )}
            {/* After the clear, as react-select draws it, so the spinner sits by the chevron. */}
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
              // Not an option, so not in the listbox; a reader hears it through the status.
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
                // A listbox's group is ARIA's own, on a div inside a presentational li, since ARIA allows no `group` role on an li (axe's aria-allowed-role).
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
      {/* What the list holds, for a screen reader, as the rows arrive after the typing. */}
      {hasSource && (
        <output className="visually-hidden" aria-label={`${label} ${noun}s`}>
          {statusOf(isOpen, suggestions, noun, showEmpty ? message : undefined)}
        </output>
      )}
    </div>
  );
}

export default Combobox;
