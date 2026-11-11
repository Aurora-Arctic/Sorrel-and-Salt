import type { ReactElement, ReactNode } from 'react';
import { CrossIcon } from '../IconTip/icons';

/** Tells Downshift an event is handled, so it skips its own key handling. */
export const preventDownshiftDefault = (event: object): void => {
  (event as { preventDownshiftDefault?: boolean }).preventDownshiftDefault = true;
};

/** An option's label: its icon, its text, and after them its count and badge. */
export function OptionLabel({
  icon,
  count,
  badge,
  children,
}: {
  icon?: ReactNode;
  count?: number;
  badge?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <span className="combobox__label">
      {icon && (
        <span className="combobox__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
      {/* The space is a text node of the label's own, as a span's leading one is dropped from the name. */}
      {count !== undefined && (
        <>
          {' '}
          <span className="combobox__count">{count}</span>
        </>
      )}
      {badge && <> {badge}</>}
    </span>
  );
}

/** A group's heading above its rows. */
export function OptionGroup({
  headingId,
  heading,
  children,
}: {
  headingId: string;
  heading: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    // A div with ARIA's `group` inside a presentational li: ARIA allows no `group` role on an li.
    // oxlint-disable jsx-a11y/prefer-tag-over-role
    <li role="presentation" className="combobox__group">
      <div role="group" aria-labelledby={headingId}>
        <div id={headingId} className="combobox__heading">
          {heading}
        </div>
        <ul role="presentation" className="combobox__rows">
          {children}
        </ul>
      </div>
    </li>
    // oxlint-enable jsx-a11y/prefer-tag-over-role
  );
}

/** The clear button, drawn while empty too (hidden) so the control keeps one width. */
export function ClearButton({
  empty,
  label,
  onClear,
}: {
  empty: boolean;
  label: string;
  onClear: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className={empty ? 'combobox__indicator is-empty' : 'combobox__indicator'}
      aria-label={label}
      aria-hidden={empty || undefined}
      tabIndex={empty ? -1 : undefined}
      disabled={empty}
      onClick={onClear}
    >
      <CrossIcon />
    </button>
  );
}

export function IndicatorSeparator({ empty }: { empty: boolean }): ReactElement {
  return (
    <span
      className={empty ? 'combobox__separator is-empty' : 'combobox__separator'}
      aria-hidden="true"
    />
  );
}
