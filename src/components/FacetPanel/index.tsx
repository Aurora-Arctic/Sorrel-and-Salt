'use client';

import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type SyntheticEvent,
  type TransitionEvent,
  type UIEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { CategoryMode, IngredientSource } from '@/modules/ingredients/schema/ingredient-enums';
import { useHydrated } from '../../lib/hydrated';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { useSlide } from '../../lib/use-slide';
import CategoryPicker from '../CategoryPicker';
import FacetCombobox from '../FacetCombobox';
import { fieldDescription } from '../Field/description';
import { FieldShell } from '../Field/shell';
import FormIcon from '../FormIcon';
import type { CompendiumFacetCounts } from '../CompendiumList/types';
import { ChoiceChip, fadesAreOff } from './choice-chip';
import { FacetCount } from './facet-count';
import { FacetSwitch } from './facet-switch';
import type { FacetPanelProps } from './types';
import './index.scss';

// The Filters button and the panel it opens (M12.4). The panel is a native `<dialog>`:
// from the tablet width up `show()` opens it over the results, sliding down without moving
// them, with no scrim and no inert page; below it `showModal()` opens it as a drawer sheet,
// and the browser supplies the backdrop, the inert page and Escape. Before the script runs
// nothing can open it, so it is drawn inline and open, and every control submits through
// the GET form around it; the Filters control is a link to it until then. See
// claude-docs/components/facet-panel.md.

/**
 * How long a leaving sheet waits for its slide out to end before it closes anyway: longer than
 * the slide (`$sheet-slide` in index.scss), for a browser that never reports its end.
 */
const LEAVE_LIMIT_MS = 400;

/**
 * The shell's tablet width and up, where the panel stops being a sheet and drops down over the
 * results. A script cannot read a Sass variable, so this repeats `$shell-tablet-width`
 * (`_variables.scss`); a test fails if the two part.
 */
export const WIDE = '(min-width: 56rem)';

const SOURCE_LABELS: Record<IngredientSource, string> = {
  local: 'Local',
  compendium: 'Compendium',
};

/**
 * The Source chip's choices: All, then Local and Compendium. The two always show, each with
 * its count once the coven's counts are read, as Toxic's do; All has none, as Toxic's Any has
 * none.
 */
function sourceOptions(
  counts: CompendiumFacetCounts['source'],
): { value: '' | IngredientSource; label: string; count?: number }[] {
  return [
    { value: '', label: 'All' },
    ...(['local', 'compendium'] as const).map((value) => ({
      value,
      label: SOURCE_LABELS[value],
      count: counts?.find((choice) => choice.value === value)?.count,
    })),
  ];
}

const MATCH_OPTIONS: ReadonlyArray<{ value: CategoryMode; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
];

/**
 * The categories before hydration: a native multiple select, as the other facets draw, whose
 * options sit under their group's name with their counts, so the GET form sends the choice
 * (CategoryPicker has no native control). A category with nothing behind it is disabled
 * unless it is chosen.
 */
function NativeCategories({
  categories,
  values,
}: {
  categories: FacetPanelProps['facets']['categories'];
  values: readonly string[];
}): ReactElement {
  const field = fieldDescription({ id: useId() });
  const groups = new Map<string, typeof categories>();
  for (const category of categories) {
    const name = category.group.name;
    groups.set(name, [...(groups.get(name) ?? []), category]);
  }
  return (
    <FieldShell label="Categories" className="facet-combobox" {...field}>
      <select
        id={field.controlId}
        className="select facet-combobox__native"
        name="categories"
        multiple
        defaultValue={[...values]}
        aria-describedby={field.aria['aria-describedby']}
      >
        {[...groups].map(([group, rows]) => (
          <optgroup key={group} label={group}>
            {rows
              .filter((category) => category.count > 0 || values.includes(category.value))
              .map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label} {category.count}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </FieldShell>
  );
}

export default function FacetPanel({
  facets,
  filter,
  onChange,
  admin = false,
  loading = false,
  clearHref,
  onApply,
  onClear,
  className,
}: FacetPanelProps): ReactElement {
  const hydrated = useHydrated();
  const id = useId();
  const titleId = `${id}-title`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Whether this opening is the modal sheet, fixed when it opens.
  const modal = useRef(false);
  const slide = useSlide('facet-panel__clip');
  // The sheet sliding out: it stays open, with `is-closing` on it, until the slide ends.
  const [leaving, setLeaving] = useState(false);

  // Every chosen value counts, so two categories and two forms read 4. Match is a mode
  // of the categories, not a filter, and counts nothing.
  const chosen = [
    filter.categories,
    filter.forms,
    filter.deities,
    filter.zodiac,
    filter.planets,
    filter.elements,
  ].reduce((total, list) => total + list.length, 0);
  const count =
    chosen +
    (filter.toxic === '' ? 0 : 1) +
    (admin && filter.withoutReferences ? 1 : 0) +
    (admin && filter.withoutForms ? 1 : 0) +
    (filter.source ? 1 : 0) +
    (filter.inStock ? 1 : 0) +
    (filter.lowStockOnly ? 1 : 0);

  const matchStuck = filter.categories.length < 2;
  const toxicStuck = facets.toxic.some((choice) => choice.count === 0);
  // The Source chip is stuck the same way: a source with nothing behind it means every
  // matching entry comes from the other, so the filter cannot narrow. Counts not yet read
  // (`facets.source` unset) leave it free.
  const sourceStuck = facets.source?.some((choice) => choice.count === 0) ?? false;

  // Focus goes back to the button when it was inside the panel, so that a closing panel
  // never leaves it on a control that is about to disappear.
  const returnFocus = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.contains(document.activeElement)) buttonRef.current?.focus();
  };
  // The panel shuts, and what was changed in it is applied once: whichever way it shuts, the
  // Filters button, Escape, Close, the sheet's own Escape or the width changing under it.
  // Nothing happens when it is already shut, so a close that follows a close applies nothing twice.
  // `snap` shuts with no motion at all; otherwise the sheet slides out right and the panel slides up.
  // The sheet slides out before it closes, as a Modal waits out its fade; the panel slides, and motion turned
  // down, or no way to ask, closes either at once.
  const leave = () => {
    if (!modal.current || fadesAreOff()) {
      slide.close(modal.current);
      return;
    }
    setLeaving(true);
  };
  const finishLeaving = () => {
    setLeaving(false);
    slide.close(true);
  };
  const shut = (snap: boolean) => {
    if (!slide.shown) return;
    if (snap) {
      setLeaving(false);
      onApply?.();
      returnFocus();
      slide.close(true);
      return;
    }
    if (leaving) return;
    onApply?.();
    returnFocus();
    leave();
  };
  const dismiss = () => shut(false);
  // Apply Filters submits the form around the panel, which applies everything held, so
  // the panel only has to shut.
  const closeOnSubmit = () => {
    returnFocus();
    leave();
  };
  // Clear All empties what is held and applies at once; a panel left open shuts with it.
  const clear = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onClear || opensElsewhere(event)) return;
    event.preventDefault();
    onClear();
    if (slide.shown) closeOnSubmit();
  };

  // The dialog follows the slide: opened on its way open, closed once the slide has ended.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !hydrated) return;
    if (slide.shown && !dialog.open) {
      if (modal.current) dialog.showModal();
      else dialog.show();
      dialog.focus({ preventScroll: true });
    } else if (slide.state === 'closed' && dialog.open) {
      returnFocus();
      dialog.close();
    }
  });

  // The net for a slide whose end the browser never reports.
  useEffect(() => {
    if (!leaving) return undefined;
    const limit = setTimeout(finishLeaving, LEAVE_LIMIT_MS);
    return () => clearTimeout(limit);
  });

  // A press outside the open panel shuts it, applying what was held, as Escape does. The Filters
  // button and the bar's Clear All have their own press handlers, so they are left to them. On
  // the modal sheet the page is inert and the backdrop is the dialog's own box: see onPointerDown.
  useEffect(() => {
    if (!slide.shown) return undefined;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (modal.current || !(target instanceof Node)) return;
      if (dialogRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest('.facet-panel__button, .facet-panel__clear')
      ) {
        return;
      }
      dismiss();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  });

  // The sheet's backdrop belongs to the dialog itself, so a press that lands on the dialog and
  // not on anything in it is a press on the backdrop.
  // The sheet's own Escape would close it at once; it goes through the slide instead.
  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (!modal.current) return;
    event.preventDefault();
    dismiss();
  };

  const onSlideEnd = (event: TransitionEvent<HTMLDialogElement>) => {
    if (leaving && event.target === event.currentTarget && event.propertyName === 'transform') {
      finishLeaving();
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDialogElement>) => {
    if (modal.current && event.target === event.currentTarget) dismiss();
  };

  // Crossing the tablet width swaps the panel's kind (an overlay for a sheet), so it shuts.
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const snap = () => shut(true);
    query.addEventListener('change', snap);
    return () => query.removeEventListener('change', snap);
  });

  const toggle = () => {
    if (slide.shown) {
      dismiss();
      return;
    }
    modal.current = !window.matchMedia(WIDE).matches;
    slide.open();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    // An Escape a combobox popup used to close itself is not the panel's; a modal sheet's
    // own Escape is the browser's, which ends in `onClose`.
    if (event.key !== 'Escape' || event.defaultPrevented || modal.current) return;
    event.preventDefault();
    dismiss();
  };

  // The clip never scrolls: a focus moving into a hidden part of it would otherwise shift
  // the panel out of its slide.
  const onScroll = (event: UIEvent<HTMLElement>) => {
    event.currentTarget.scrollTop = 0;
  };

  const filtersLabel = (
    <>
      Filters
      {count > 0 && <FacetCount count={count} />}
    </>
  );
  const clip = hydrated ? slide.className : 'facet-panel__clip facet-panel__clip--open';

  return (
    <>
      {hydrated ? (
        <button
          ref={buttonRef}
          type="button"
          className="btn facet-panel__button"
          aria-expanded={slide.shown}
          aria-controls={id}
          onClick={toggle}
        >
          {filtersLabel}
        </button>
      ) : (
        <a className="btn facet-panel__button" href={`#${id}`}>
          {filtersLabel}
        </a>
      )}
      {count > 0 && (
        <a href={clearHref} className="facet-panel__clear" onClick={clear}>
          Clear All
        </a>
      )}
      <dialog
        ref={dialogRef}
        id={id}
        className={
          `facet-panel facet-panel--compact${hydrated ? '' : ' facet-panel--static'}` +
          (leaving ? ' is-closing' : '') +
          (className ? ` ${className}` : '')
        }
        tabIndex={-1}
        data-tip-boundary=""
        aria-labelledby={titleId}
        open={!hydrated}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onCancel={onCancel}
        onTransitionEnd={onSlideEnd}
        onClose={() => shut(true)}
      >
        <div
          className={clip}
          style={slide.style}
          onTransitionEnd={slide.onTransitionEnd}
          onScroll={onScroll}
        >
          <div className="facet-panel__inner">
            <div className="facet-panel__pad">
              <div className="facet-panel__head">
                <h2 id={titleId} className="facet-panel__title">
                  Filters
                </h2>
                <button
                  type="button"
                  className="btn btn--quiet facet-panel__phone-only"
                  onClick={dismiss}
                >
                  Close
                </button>
              </div>

              <div className="facet-panel__line">
                <div className="facet-panel__grow">
                  {!hydrated ? (
                    <NativeCategories categories={facets.categories} values={filter.categories} />
                  ) : (
                    <CategoryPicker
                      legend="Categories"
                      entry="Category"
                      placeholder="Add Category"
                      removeNoun="Category"
                      hideZeros
                      loading={loading}
                      categories={facets.categories.map((category) => ({
                        id: category.value,
                        name: category.label,
                        group: category.group,
                        count: category.count,
                      }))}
                      value={filter.categories}
                      onChange={(categories) => onChange({ categories })}
                    />
                  )}
                  {hydrated &&
                    filter.categories.map((slug) => (
                      <input key={slug} type="hidden" name="categories" value={slug} />
                    ))}
                </div>
                {/* Match stays below two categories so the row does not shift as categories are
                    picked: it rests on All, disabled, and says when it applies. The held mode is
                    kept (it still reads All here, and the address drops it, M8.12). */}
                <div
                  className={
                    hydrated
                      ? 'facet-panel__quick facet-panel__quick--picker'
                      : 'facet-panel__quick'
                  }
                >
                  <ChoiceChip
                    legend="Match"
                    name="categoryMode"
                    chipHint={
                      matchStuck
                        ? 'Match applies once two or more categories are chosen.'
                        : 'All: an ingredient must be in every chosen category. Any: in at least one of them.'
                    }
                    options={MATCH_OPTIONS}
                    value={matchStuck ? 'all' : filter.categoryMode}
                    disabled={matchStuck}
                    onChange={(categoryMode) => onChange({ categoryMode })}
                  />
                </div>
              </div>

              <div className="facet-panel__line">
                <div className="facet-panel__grow">
                  <FacetCombobox
                    label="Forms"
                    name="forms"
                    typeahead
                    placeholder="Add Form"
                    removeNoun="Form"
                    loading={loading}
                    choices={facets.forms.map((form) => ({
                      value: form.value,
                      label: form.label,
                      count: form.count,
                      icon: <FormIcon name={form.icon} />,
                    }))}
                    values={filter.forms}
                    onChange={(forms) => onChange({ forms })}
                  />
                </div>
                <div className="facet-panel__quick">
                  <ChoiceChip
                    legend="Toxic"
                    name="toxic"
                    options={[
                      { value: '', label: 'Any' },
                      ...facets.toxic.map((choice) => ({
                        value: choice.value,
                        label: choice.label,
                        count: choice.count,
                      })),
                    ]}
                    // Toxic is the one facet that keeps a zero-count value: all three
                    // choices always show. With either side empty, every matching entry
                    // shares one toxicity, so the chip rests on Any and cannot narrow.
                    value={toxicStuck ? '' : filter.toxic}
                    disabled={toxicStuck}
                    chipHint={
                      toxicStuck
                        ? 'Every matching entry shares the same toxicity, so this filter cannot narrow further.'
                        : undefined
                    }
                    onChange={(toxic) => onChange({ toxic })}
                  />
                  {filter.source !== undefined && (
                    <ChoiceChip
                      legend="Source"
                      name="source"
                      hint={
                        sourceStuck
                          ? undefined
                          : 'Local: entries your coven added itself. Compendium: entries your coven holds a jar of from the compendium.'
                      }
                      chipHint={
                        sourceStuck
                          ? 'Every matching entry comes from the same source, so this filter cannot narrow further.'
                          : undefined
                      }
                      options={sourceOptions(facets.source)}
                      // Rests on All while stuck and submits nothing, as Toxic rests on Any.
                      value={sourceStuck ? '' : filter.source}
                      disabled={sourceStuck}
                      onChange={(source) => onChange({ source })}
                    />
                  )}
                  {filter.inStock !== undefined && (
                    <FacetSwitch
                      label="In Stock"
                      count={facets.inStock}
                      name="inStock"
                      checked={filter.inStock}
                      onChange={(inStock) => onChange({ inStock })}
                    />
                  )}
                  {filter.lowStockOnly !== undefined && (
                    <FacetSwitch
                      label="Low Stock Only"
                      count={facets.lowStockOnly}
                      name="lowStockOnly"
                      checked={filter.lowStockOnly}
                      onChange={(lowStockOnly) => onChange({ lowStockOnly })}
                    />
                  )}
                  {admin && (
                    <FacetSwitch
                      label="No Refs"
                      count={facets.withoutReferences}
                      name="withoutReferences"
                      checked={filter.withoutReferences}
                      onChange={(withoutReferences) => onChange({ withoutReferences })}
                    />
                  )}
                  {admin && (
                    <FacetSwitch
                      label="No Form"
                      count={facets.withoutForms}
                      name="withoutForms"
                      checked={filter.withoutForms}
                      onChange={(withoutForms) => onChange({ withoutForms })}
                    />
                  )}
                </div>
              </div>

              <div className="facet-panel__line">
                <div className="facet-panel__grow">
                  <FacetCombobox
                    label="Planets"
                    name="planets"
                    placeholder="Add Planet"
                    removeNoun="Planet"
                    loading={loading}
                    choices={facets.planets}
                    values={filter.planets}
                    onChange={(planets) => onChange({ planets })}
                  />
                </div>
                <div className="facet-panel__grow">
                  <FacetCombobox
                    label="Zodiac"
                    name="zodiac"
                    placeholder="Add Sign"
                    emptyPlaceholder="No Signs"
                    removeNoun="Sign"
                    loading={loading}
                    choices={facets.zodiac}
                    values={filter.zodiac}
                    onChange={(zodiac) => onChange({ zodiac })}
                  />
                </div>
              </div>

              <div className="facet-panel__line">
                <div className="facet-panel__grow">
                  <FacetCombobox
                    label="Deities"
                    name="deities"
                    typeahead
                    placeholder="Add Deity"
                    removeNoun="Deity"
                    loading={loading}
                    choices={facets.deities.map((deity) => ({
                      value: deity.value,
                      label: deity.label,
                      count: deity.count,
                      group: deity.tradition,
                    }))}
                    values={filter.deities}
                    onChange={(deities) => onChange({ deities })}
                  />
                </div>
                <div className="facet-panel__grow">
                  <FacetCombobox
                    label="Elements"
                    name="elements"
                    placeholder="Add Element"
                    removeNoun="Element"
                    loading={loading}
                    choices={facets.elements}
                    values={filter.elements}
                    onChange={(elements) => onChange({ elements })}
                  />
                </div>
              </div>

              <div className="facet-panel__foot">
                <button type="submit" className="btn btn--solid" onClick={closeOnSubmit}>
                  Apply Filters
                </button>
                <button
                  type="button"
                  className="btn btn--quiet facet-panel__phone-only"
                  onClick={dismiss}
                >
                  Close
                </button>
                <a href={clearHref} onClick={clear}>
                  Clear All
                </a>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
