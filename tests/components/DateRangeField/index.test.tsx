import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DateRangeField from '@/components/DateRangeField';
import type { DayRange } from '@/components/DateRangeField/types';
import { dayPickerModule } from '@/components/DateField/lazy-day-picker';
import { fill } from '../../support/interact';

// claude-docs/components/date-field.md

// The calendar loads on its own; these tests start after it has arrived, as a person opening the field after the page has been idle finds it.
beforeAll(async () => {
  await dayPickerModule.load();
});

const PICKS = [
  { label: 'First Week', range: () => ({ from: '2026-10-01', to: '2026-10-07' }) },
  { label: 'Whole Month', range: () => ({ from: '2026-10-01', to: '2026-10-31' }) },
];

function Harness({
  initial = { from: '', to: '' },
  min,
  max,
}: {
  initial?: DayRange;
  min?: string;
  max?: string;
}) {
  const [range, setRange] = useState(initial);
  return (
    <>
      {/* A label for the button, as the field shell draws it, which a self-reference would read instead of the range. */}
      <label id="label" htmlFor="r">
        Minted
      </label>
      <DateRangeField
        id="r"
        labelledBy="label"
        label="Minted"
        from={range.from}
        to={range.to}
        min={min}
        max={max}
        quickPicks={PICKS}
        onChange={setRange}
      />
      <output aria-label="Held">{`${range.from}|${range.to}`}</output>
    </>
  );
}

const field = () => screen.getByRole('button', { name: /^Minted/ });
const open = () => {
  fireEvent.click(field());
  return screen.getByRole('dialog', { name: 'Choose Minted Days' });
};
// A space before the day number, so 3 October is not also 13 or 23 October.
const day = (words: string) =>
  within(screen.getByRole('dialog')).getByRole('button', { name: new RegExp(` ${words}`) });
// The calendar keeps a status of its own, so the harness's is found by name.
const answer = () => screen.getByRole('status', { name: 'Held' }).textContent;

describe('DateRangeField', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the range in short words on a button named by its label', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    expect(field()).toHaveAccessibleName(/Minted.*1 Oct 2026.*30 Oct 2026/);
    expect(field()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the placeholder and no clear while it holds no day', () => {
    render(<Harness />);
    expect(field()).toHaveAccessibleName(/Minted.*Any day/);
    expect(screen.queryByRole('button', { name: 'Clear Minted' })).toBeNull();
  });

  it('says a range open at one end as from or to that day', () => {
    const { unmount } = render(<Harness initial={{ from: '2026-10-01', to: '' }} />);
    expect(field()).toHaveAccessibleName(/From 1 Oct 2026/);
    unmount();
    render(<Harness initial={{ from: '', to: '2026-10-30' }} />);
    expect(field()).toHaveAccessibleName(/To 30 Oct 2026/);
  });

  it('empties both ends from its clear, and returns focus to the field', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear Minted' }));
    expect(answer()).toBe('|');
    expect(field()).toHaveAccessibleName(/Any day/);
    expect(field()).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear Minted' })).toBeNull();
  });

  it('opens two months side by side, starting at the range', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    const dialog = open();
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getAllByRole('grid')).toHaveLength(2);
    expect(within(dialog).getByRole('grid', { name: 'October 2026' })).toBeVisible();
  });

  it('opens one month where the window is narrow', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    expect(within(open()).getAllByRole('grid')).toHaveLength(1);
  });

  it('starts the range on the first day picked and ends it on the second', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.click(day('3 October 2026'));
    expect(answer()).toBe('2026-10-03|');
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(day('12 October 2026'));
    expect(answer()).toBe('2026-10-03|2026-10-12');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(field()).toHaveAccessibleName(/3 Oct 2026.*12 Oct 2026/);
    expect(field()).toHaveFocus();
  });

  it('makes a single day of one day picked twice', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.click(day('5 October 2026'));
    fireEvent.click(day('5 October 2026'));
    expect(answer()).toBe('2026-10-05|2026-10-05');
    expect(field()).toHaveAccessibleName(/^Minted 5 Oct 2026$/);
  });

  it('puts the ends in order when the second day is the earlier', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.click(day('20 October 2026'));
    fireEvent.click(day('8 October 2026'));
    expect(answer()).toBe('2026-10-08|2026-10-20');
  });

  it('keeps the start alone when it closes before the end is picked', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.click(day('9 October 2026'));
    fireEvent.keyDown(screen.getAllByRole('grid')[0], { key: 'Escape' });
    expect(answer()).toBe('2026-10-09|');
    expect(field()).toHaveAccessibleName(/From 9 Oct 2026/);
  });

  it('sets a quick pick in one press, and marks the pick the range matches', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    const dialog = open();
    expect(within(dialog).getByRole('button', { name: 'First Week' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'First Week' }));
    expect(answer()).toBe('2026-10-01|2026-10-07');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(field()).toHaveFocus();
    expect(within(open()).getByRole('button', { name: 'First Week' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  // Opened on an open-ended range: a complete one shows the days it covers instead (below).
  it('tells how to pick in the calendar’s description, and what comes next', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '' }} />);
    const dialog = open();
    expect(dialog).toHaveAccessibleDescription(/first day, then the last/);
    fireEvent.click(day('3 October 2026'));
    expect(dialog).toHaveAccessibleDescription(/last day/);
    expect(dialog).not.toHaveAccessibleDescription(/first day/);
  });

  it('refuses a day before min or after max', () => {
    render(<Harness initial={{ from: '2026-10-10', to: '' }} min="2026-10-05" max="2026-10-20" />);
    open();
    expect(day('5 October 2026')).toBeEnabled();
    expect(day('4 October 2026')).toBeDisabled();
    expect(day('20 October 2026')).toBeEnabled();
    expect(day('21 October 2026')).toBeDisabled();
  });

  // A modal dialog closes on an Escape keydown nobody prevented, so stopping it alone would close a
  // phone Filters sheet holding the field.
  it('closes on Escape alone, claiming the key so a surrounding dialog stays open', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    const unclaimed = fireEvent.keyDown(screen.getAllByRole('grid')[0], { key: 'Escape' });
    expect(unclaimed).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(answer()).toBe('2026-10-01|2026-10-30');
    expect(field()).toHaveFocus();
  });
});

// The Start and End boxes take a day as the day fields' shared rule writes it, `CalendarDay` in src/lib/validation.ts
// (YYYY-MM-DD). A typed day counts once the person leaves the box, as every Field is checked.
const box = (name: 'Start' | 'End') =>
  within(screen.getByRole('dialog')).getByRole('textbox', { name });
// What the box's description reads: its hint, if it has one, and its error once one shows.
const described = (element: HTMLElement) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
// The Field set's error: the box is marked invalid and its description gains the message.
const expectRefused = (name: 'Start' | 'End', before: string) => {
  expect(box(name)).toBeInvalid();
  expect(described(box(name))).not.toBe(before);
  expect(described(box(name)).length).toBeGreaterThan(before.length);
};

describe('DateRangeField, Start and End', () => {
  it('shows a Start and an End box in the calendar, holding the range’s ends', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    expect(box('Start')).toHaveValue('2026-10-01');
    expect(box('End')).toHaveValue('2026-10-30');
  });

  it('shows both boxes empty while the field holds no day', () => {
    render(<Harness />);
    open();
    expect(box('Start')).toHaveValue('');
    expect(box('End')).toHaveValue('');
  });

  it('fills Start from the first day picked and End from the second', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.click(day('3 October 2026'));
    expect(box('Start')).toHaveValue('2026-10-03');
    expect(box('End')).toHaveValue('');
    fireEvent.click(day('12 October 2026'));
    // The second pick still sets the range and closes, with nothing to apply.
    expect(screen.queryByRole('dialog')).toBeNull();
    open();
    expect(box('Start')).toHaveValue('2026-10-03');
    expect(box('End')).toHaveValue('2026-10-12');
  });

  it('marks Start as awaiting the next pick, then End after the first', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    const dialog = open();
    expect(within(dialog).getByRole('textbox', { name: 'Start', current: true })).toBe(
      box('Start'),
    );
    expect(box('End')).not.toHaveAttribute('aria-current', 'true');
    fireEvent.click(day('3 October 2026'));
    expect(within(dialog).getByRole('textbox', { name: 'End', current: true })).toBe(box('End'));
    expect(box('Start')).not.toHaveAttribute('aria-current', 'true');
  });

  it('sets the start from a typed Start, then awaits End', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '' }} />);
    open();
    fill('Start', '2026-10-04');
    expect(answer()).toBe('2026-10-04|');
    expect(box('Start')).not.toBeInvalid();
    expect(box('End')).toHaveAttribute('aria-current', 'true');
  });

  it('sets the range from a typed Start and a typed End, as two picks would', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '' }} />);
    open();
    fill('Start', '2026-10-04');
    fill('End', '2026-10-09');
    expect(answer()).toBe('2026-10-04|2026-10-09');
    expect(field()).toHaveAccessibleName(/4 Oct 2026.*9 Oct 2026/);
  });

  it('makes a single day of a typed End the same as Start', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '' }} />);
    open();
    fill('Start', '2026-10-06');
    fill('End', '2026-10-06');
    expect(answer()).toBe('2026-10-06|2026-10-06');
  });

  it('changes only the end typed when the field already holds a range', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fill('End', '2026-10-20');
    expect(answer()).toBe('2026-10-01|2026-10-20');
  });

  it('takes nothing from a day still being typed, and shows no error before the box is left', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.change(box('Start'), { target: { value: '2026-10' } });
    expect(answer()).toBe('2026-10-01|2026-10-30');
    expect(box('Start')).not.toBeInvalid();
  });

  it.each([
    ['a day not written as the rule has it', '12/10/2026'],
    ['words', 'next week'],
    ['a day the month does not have', '2026-02-30'],
    ['a month the year does not have', '2026-13-01'],
  ])('refuses %s with the Field error and changes nothing', (_, text) => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    const before = described(box('Start'));
    fill('Start', text);
    expectRefused('Start', before);
    expect(answer()).toBe('2026-10-01|2026-10-30');
    expect(field()).toHaveAccessibleName(/1 Oct 2026.*30 Oct 2026/);
  });

  it('clears the error and sets the start once a refused day is put right', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '' }} />);
    open();
    fill('Start', '2026-02-30');
    expect(box('Start')).toBeInvalid();
    fill('Start', '2026-10-07');
    expect(box('Start')).not.toBeInvalid();
    expect(answer()).toBe('2026-10-07|');
  });

  it('refuses a typed End before Start with the Field error, never swapping the ends, until it is put right', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '' }} />);
    open();
    fill('Start', '2026-10-10');
    const before = described(box('End'));
    fill('End', '2026-10-04');
    expectRefused('End', before);
    // Neither set as given nor swapped: the range holds the start alone.
    expect(answer()).toBe('2026-10-10|');
    fill('End', '2026-10-14');
    expect(answer()).toBe('2026-10-10|2026-10-14');
  });

  it('refuses a typed End before the start the field already holds, and keeps the range', () => {
    render(<Harness initial={{ from: '2026-10-10', to: '2026-10-20' }} />);
    open();
    const before = described(box('End'));
    fill('End', '2026-10-09');
    expectRefused('End', before);
    expect(answer()).toBe('2026-10-10|2026-10-20');
  });

  it('keeps End when a valid Start is typed while a range is held', () => {
    render(<Harness initial={{ from: '2026-10-10', to: '2026-10-20' }} />);
    open();
    fill('Start', '2026-10-12');
    expect(box('Start')).not.toBeInvalid();
    expect(answer()).toBe('2026-10-12|2026-10-20');
    fill('Start', '2026-10-20');
    expect(answer()).toBe('2026-10-20|2026-10-20');
  });

  it('refuses a typed Start after the end the field holds with the Field error, never swapping the ends, until it is put right', () => {
    render(<Harness initial={{ from: '2026-10-10', to: '2026-10-20' }} />);
    open();
    const before = described(box('Start'));
    fill('Start', '2026-10-21');
    expectRefused('Start', before);
    expect(answer()).toBe('2026-10-10|2026-10-20');
    fill('Start', '2026-10-15');
    expect(box('Start')).not.toBeInvalid();
    expect(answer()).toBe('2026-10-15|2026-10-20');
  });

  // An Enter left unclaimed in a text box submits the form round it, which in the Filters drawer would apply the filters.
  it('commits a typed day on Enter, as leaving the box does, and claims the key', () => {
    render(
      <form aria-label="Filters" onSubmit={(event) => event.preventDefault()}>
        <Harness initial={{ from: '2026-10-01', to: '' }} />
      </form>,
    );
    open();
    fireEvent.change(box('Start'), { target: { value: '2026-10-04' } });
    const unclaimed = fireEvent.keyDown(box('Start'), { key: 'Enter' });
    expect(unclaimed).toBe(false);
    expect(answer()).toBe('2026-10-04|');
    expect(box('End')).toHaveAttribute('aria-current', 'true');
    fireEvent.change(box('End'), { target: { value: '2026-10-09' } });
    expect(fireEvent.keyDown(box('End'), { key: 'Enter' })).toBe(false);
    expect(answer()).toBe('2026-10-04|2026-10-09');
  });

  it('refuses a day not yet valid on Enter with the Field error, and changes nothing', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    const before = described(box('Start'));
    fireEvent.change(box('Start'), { target: { value: '2026-10' } });
    fireEvent.keyDown(box('Start'), { key: 'Enter' });
    expectRefused('Start', before);
    expect(answer()).toBe('2026-10-01|2026-10-30');
  });

  it('refuses a typed day before min or after max, and takes the bound days themselves', () => {
    render(<Harness initial={{ from: '2026-10-10', to: '' }} min="2026-10-05" max="2026-10-20" />);
    open();
    const startBefore = described(box('Start'));
    fill('Start', '2026-10-04');
    expectRefused('Start', startBefore);
    expect(answer()).toBe('2026-10-10|');
    fill('Start', '2026-10-05');
    expect(box('Start')).not.toBeInvalid();
    expect(answer()).toBe('2026-10-05|');

    const endBefore = described(box('End'));
    fill('End', '2026-10-21');
    expectRefused('End', endBefore);
    expect(answer()).toBe('2026-10-05|');
    fill('End', '2026-10-20');
    expect(answer()).toBe('2026-10-05|2026-10-20');
  });
});

// A whole number standing alone in the text, so 10 is not read inside 2026 or 2026-10-03.
const number = (n: number) => new RegExp(`(^|\\D)${n}(\\D|$)`);
const describedText = () => described(screen.getByRole('dialog'));

describe('DateRangeField, days selected', () => {
  // The line shown on a field holding no day, read from the field itself rather than written here.
  const hint = () => {
    const { unmount } = render(<Harness />);
    open();
    const text = describedText();
    unmount();
    return text;
  };

  it('shows the hint, not a count, while no range is complete', () => {
    const first = hint();
    render(<Harness initial={{ from: '2026-11-01', to: '' }} />);
    open();
    expect(describedText()).toBe(first);
    fireEvent.click(day('3 November 2026'));
    // The hint after the first pick names no number of days.
    expect(describedText()).not.toMatch(/\d/);
  });

  it('replaces the hint with the number of days a held range covers, counting both ends', () => {
    const first = hint();
    render(<Harness initial={{ from: '2026-11-03', to: '2026-11-12' }} />);
    open();
    const line = describedText();
    expect(line).not.toBe(first);
    expect(line).toMatch(number(10));
    expect(line).not.toMatch(number(9));
  });

  it('counts the days of a range just picked when the calendar opens again', () => {
    const first = hint();
    render(<Harness initial={{ from: '2026-11-01', to: '' }} />);
    open();
    fireEvent.click(day('3 November 2026'));
    fireEvent.click(day('12 November 2026'));
    open();
    expect(describedText()).not.toBe(first);
    expect(describedText()).toMatch(number(10));
  });

  it('counts one day for a day picked twice', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '' }} />);
    open();
    fireEvent.click(day('5 October 2026'));
    fireEvent.click(day('5 October 2026'));
    open();
    expect(describedText()).toMatch(number(1));
    expect(describedText()).not.toMatch(number(0));
    expect(describedText()).not.toMatch(number(2));
  });

  it('counts across the end of a month', () => {
    render(<Harness initial={{ from: '2026-10-30', to: '2026-11-02' }} />);
    open();
    expect(describedText()).toMatch(number(4));
    expect(describedText()).not.toMatch(number(3));
  });

  it('goes back to the hint once a new range is started', () => {
    render(<Harness initial={{ from: '2026-11-03', to: '2026-11-12' }} />);
    open();
    expect(describedText()).toMatch(/\d/);
    fireEvent.click(day('5 November 2026'));
    expect(describedText()).not.toMatch(/\d/);
  });
});

describe('DateRangeField, a typed End', () => {
  it('completes the range and keeps the calendar open, showing the days it covers', () => {
    render(<Harness initial={{ from: '2026-11-03', to: '' }} />);
    const dialog = open();
    expect(describedText()).not.toMatch(/\d/);
    fill('End', '2026-11-12');
    expect(answer()).toBe('2026-11-03|2026-11-12');
    expect(dialog).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Choose Minted Days' })).toBe(dialog);
    expect(describedText()).toMatch(number(10));
  });
});

// Days are counted in the calendar, not by dividing the time between two local midnights: a day the
// clocks go forward is 23 hours long. Node reads TZ afresh when it changes, so the test sets a zone with a
// clock change and puts the old one back.
describe('DateRangeField, days selected across a clock change', () => {
  const zone = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'Europe/London';
  });
  afterAll(() => {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });

  it('runs in a zone whose clocks go forward inside the range', () => {
    expect(new Date(2026, 2, 31).getTime() - new Date(2026, 2, 28).getTime()).toBeLessThan(
      3 * 24 * 60 * 60 * 1000,
    );
  });

  it('counts every calendar day of a range the clocks go forward in', () => {
    // 29 March 2026 is the day British clocks go forward.
    render(<Harness initial={{ from: '2026-03-28', to: '2026-03-31' }} />);
    open();
    expect(describedText()).toMatch(number(4));
    expect(describedText()).not.toMatch(number(3));
  });
});
