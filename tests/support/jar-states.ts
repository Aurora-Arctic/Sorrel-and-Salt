import type { StockState } from '@/components/StockBadge/types';

// One table of jar states, each with the badge it must show. The rule is written twice (`stockState` in
// `src/components/StockBadge/` and `holdsJarLowOrOut` in the ingredients repository), so both tests walk this
// list (claude-docs/components/stock-badge.md).

export interface JarState {
  /** What the row of the table says, in words. */
  readonly label: string;
  /** An invented entry name, unique in this list. */
  readonly name: string;
  readonly quantity: number | null;
  readonly threshold: number | null;
  readonly expected: StockState;
}

export const JAR_STATES: readonly JarState[] = [
  // Out: 0, whatever the threshold.
  {
    label: 'zero, whatever the threshold',
    name: 'Zerotenwort',
    quantity: 0,
    threshold: 10,
    expected: 'out',
  },
  {
    label: 'zero with a threshold of zero',
    name: 'Zerozerowort',
    quantity: 0,
    threshold: 0,
    expected: 'out',
  },
  {
    label: 'zero with no threshold',
    name: 'Zeronullwort',
    quantity: 0,
    threshold: null,
    expected: 'out',
  },
  // Low: above 0 and at or below a threshold above 0.
  {
    label: 'above zero and below the threshold',
    name: 'Belowwort',
    quantity: 6,
    threshold: 10,
    expected: 'low',
  },
  {
    label: 'exactly at the threshold',
    name: 'Atwort',
    quantity: 10,
    threshold: 10,
    expected: 'low',
  },
  {
    label: 'a fraction below a fractional threshold',
    name: 'Fracbelowwort',
    quantity: 0.5,
    threshold: 2.5,
    expected: 'low',
  },
  {
    label: 'exactly at a fractional threshold',
    name: 'Fracatwort',
    quantity: 2.5,
    threshold: 2.5,
    expected: 'low',
  },
  {
    label: 'a fraction above zero with a threshold of one',
    name: 'Fracsmallwort',
    quantity: 0.5,
    threshold: 1,
    expected: 'low',
  },
  // No badge: above the threshold.
  {
    label: 'just above the threshold',
    name: 'Justabovewort',
    quantity: 10.5,
    threshold: 10,
    expected: 'ok',
  },
  { label: 'above the threshold', name: 'Abovewort', quantity: 11, threshold: 10, expected: 'ok' },
  {
    label: 'a fraction above a smaller fractional threshold',
    name: 'Fracabovewort',
    quantity: 0.5,
    threshold: 0.4,
    expected: 'ok',
  },
  // No badge: the warning is off.
  {
    label: 'above zero with a threshold of zero',
    name: 'Warnoffwort',
    quantity: 5,
    threshold: 0,
    expected: 'ok',
  },
  {
    label: 'a fraction above zero with a threshold of zero',
    name: 'Fracoffwort',
    quantity: 0.5,
    threshold: 0,
    expected: 'ok',
  },
  {
    label: 'above zero with no threshold',
    name: 'Nothresholdwort',
    quantity: 5,
    threshold: null,
    expected: 'ok',
  },
  // No badge: held but not weighed.
  {
    label: 'held but not weighed, with a threshold',
    name: 'Unweighedwort',
    quantity: null,
    threshold: 10,
    expected: 'ok',
  },
  {
    label: 'held but not weighed, with a threshold of zero',
    name: 'Unweighedzerowort',
    quantity: null,
    threshold: 0,
    expected: 'ok',
  },
  {
    label: 'not weighed and no threshold',
    name: 'Unweighednullwort',
    quantity: null,
    threshold: null,
    expected: 'ok',
  },
];
