import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Combobox from '@/components/Combobox';
import type { Suggestions } from '@/components/Combobox/types';

// What one keystroke writes to the page: an attribute or style the key leaves as it was is not
// written again, since every write re-checks the page's `:has()` rules. React's own rewrite of the
// input's `name` is not watched: the field cannot stop it (claude-docs/components/combobox.md).

// Floating UI's subscription, counted and passed through, so a reopen that subscribes again shows.
const subscriptions = vi.hoisted(() => ({ count: 0 }));
vi.mock('@floating-ui/react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@floating-ui/react-dom')>();
  return {
    ...actual,
    autoUpdate: (...args: Parameters<typeof actual.autoUpdate>) => {
      subscriptions.count += 1;
      return actual.autoUpdate(...args);
    },
  };
});

const ROWS = [{ value: 'Testwort' }, { value: 'Mockleaf' }];

/** A lookup still in flight, with rows that stay the same whatever is typed. */
const IN_FLIGHT: Suggestions = { options: ROWS, pending: true };
const ANSWERED: Suggestions = { options: ROWS, pending: false };
/** A new lookup in flight with nothing kept from the last: the list closes only because of it. */
const LOOKING: Suggestions = { options: [], pending: true };

/** The box with its text held outside it, as a form holds a field's; no typed row and no empty message, so the list is open exactly while it has rows. */
function Field({ suggestions }: { suggestions: Suggestions }) {
  const [value, setValue] = useState('');
  return (
    <Combobox
      id="box"
      label="Form"
      name="query"
      value={value}
      onChange={setValue}
      onPick={() => {}}
      suggestions={suggestions}
      offerTyped={false}
      empty={false}
    />
  );
}

const box = () => screen.getByRole('combobox', { name: 'Form' });
// Hidden while closed, and still the element Floating UI places.
const list = () => screen.getByRole('listbox', { name: 'Form suggestions', hidden: true });

/** Lets Floating UI's position computation, a promise, settle. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

let observer: MutationObserver | undefined;
beforeEach(() => {
  subscriptions.count = 0;
});
afterEach(() => observer?.disconnect());

/** Starts recording writes to the given attributes of an element; the returned function reads them so far, those already delivered as well as those still queued. */
function watch(element: HTMLElement, attributes: string[]): () => MutationRecord[] {
  const seen: MutationRecord[] = [];
  observer = new MutationObserver((records) => seen.push(...records));
  observer.observe(element, {
    attributes: true,
    attributeFilter: attributes,
    attributeOldValue: true,
  });
  return () => [...seen, ...(observer?.takeRecords() ?? [])];
}

/** Each value the style held, from before the first write to now, so a write that changed nothing shows as a repeat. */
function styleHistory(records: MutationRecord[], element: HTMLElement): (string | null)[] {
  return [...records.map((record) => record.oldValue), element.getAttribute('style')];
}

describe('Combobox keystroke', () => {
  it('writes no aria-busy on a key that leaves it as it was', async () => {
    const user = userEvent.setup();
    render(<Field suggestions={IN_FLIGHT} />);

    // The first key opens the list, which is a change of its own, so it is typed before the watch starts.
    await user.type(box(), 'T');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(box()).toHaveAttribute('aria-busy', 'true');

    const written = watch(box(), ['aria-busy']);
    await user.type(box(), 'e');

    // The key reached the box, and left the attribute as it was.
    expect(box()).toHaveValue('Te');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(box()).toHaveAttribute('aria-busy', 'true');
    expect(written()).toEqual([]);
  });

  it('still writes aria-busy when the lookup settles, so the watch sees a real change', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Field suggestions={IN_FLIGHT} />);
    await user.type(box(), 'T');

    const written = watch(box(), ['aria-busy']);
    rerender(<Field suggestions={ANSWERED} />);

    expect(box()).not.toHaveAttribute('aria-busy');
    expect(written().map((record) => record.attributeName)).toContain('aria-busy');
  });

  it('writes the list’s width and room only when they change, across a key and a pending close', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Field suggestions={ANSWERED} />);
    await settle();

    const written = watch(list(), ['style']);
    await user.type(box(), 'T');
    await settle();
    expect(box()).toHaveAttribute('aria-expanded', 'true');

    // A new lookup with nothing kept closes the list; its answer opens it again where it was.
    rerender(<Field suggestions={LOOKING} />);
    await settle();
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    rerender(<Field suggestions={ANSWERED} />);
    await settle();
    expect(box()).toHaveAttribute('aria-expanded', 'true');

    // Placed by now, so the watch had something to see: the size step sets the room on every placing.
    expect(list().style.getPropertyValue('--combobox-list-room')).not.toBe('');
    const history = styleHistory(written(), list());
    const repeats = history.filter((value, at) => at > 0 && value === history[at - 1]);
    expect(repeats).toEqual([]);
  });

  it('keeps following the list through a close that only a pending lookup caused', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Field suggestions={ANSWERED} />);

    await user.type(box(), 'T');
    await settle();
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    // Open, so followed: the count proves the subscription is what is watched.
    expect(subscriptions.count).toBe(1);

    rerender(<Field suggestions={LOOKING} />);
    await settle();
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    rerender(<Field suggestions={ANSWERED} />);
    await settle();

    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(subscriptions.count).toBe(1);
  });

  it('stops following the list once it is closed with no lookup pending', async () => {
    const user = userEvent.setup();
    render(<Field suggestions={ANSWERED} />);

    await user.type(box(), 'T');
    await settle();
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(box()).toHaveAttribute('aria-expanded', 'false');

    // Typing again opens a list that must be followed afresh.
    await user.type(box(), 'e');
    await settle();
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(subscriptions.count).toBe(2);
  });
});
