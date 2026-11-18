import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { expect, onTestFinished } from 'vitest';
import { Navigating } from './navigating';
import type { FilterFormCase, FilterFormSubject } from './types';

// The rows every FilterForm list runs with `it.each` (claude-docs/components/filter-form.md).

// The name is on the `<search>` landmark, which jsdom's role table cannot find: found by label, the form taken from inside.
export const filterForm = (name: string, scope: Pick<typeof screen, 'getByLabelText'> = screen) => {
  const form = scope.getByLabelText(name).querySelector<HTMLFormElement>('form');
  if (!form) throw new Error(`The filter row named "${name}" holds no form.`);
  return form;
};

const form = (subject: FilterFormSubject) => filterForm(subject.label);
const searchbox = (subject: FilterFormSubject) =>
  screen.getByRole(subject.searchRole ?? 'searchbox', { name: subject.searchLabel });

export const sent = (filter: HTMLElement): string =>
  new URLSearchParams(
    [...new FormData(filter as HTMLFormElement)].map(([name, value]) => [name, String(value)]),
  ).toString();

export function drawnOnServer(page: ReactElement): {
  container: HTMLElement;
  hydrate: () => Promise<void>;
} {
  const container = document.createElement('div');
  container.innerHTML = renderToString(page);
  document.body.append(container);
  onTestFinished(() => container.remove());
  return {
    container,
    hydrate: async () => {
      const root = await act(async () => hydrateRoot(container, page));
      onTestFinished(() => act(() => root.unmount()));
    },
  };
}

export const FILTER_ROWS: FilterFormCase[] = [
  [
    'is a GET form to the page itself, with no Filter button, sending the filter shown under the names the page reads',
    (subject) => {
      render(subject.shown.list);

      // The <search> landmark around it is the e2e specs' to find: jsdom's
      // role table predates the element.
      expect(form(subject)).toHaveAttribute('action', subject.path);
      expect(form(subject)).toHaveAttribute('method', 'get');
      expect(sent(form(subject))).toBe(subject.shown.sends);
      expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
    },
  ],
  [
    'opens the searched list from its first page on the magnifier or Enter, the text trimmed and the rest of the filter shown carried',
    (subject) => {
      render(subject.shown.list);

      fireEvent.change(searchbox(subject), { target: { value: ' Two words ' } });
      expect(subject.push).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      fireEvent.submit(form(subject));

      expect(subject.push.mock.calls).toEqual([[subject.searched], [subject.searched]]);
    },
  ],
  [
    'starts from each part of a filter shown alone, drawing Clear to the unfiltered page, and draws none while no filter is',
    (subject) => {
      for (const { list, sends } of subject.alone) {
        const { unmount } = render(list);

        expect(sent(form(subject))).toBe(sends);
        const clear = screen.getByRole('link', { name: 'Clear' });
        expect(clear).toHaveAttribute('href', subject.path);
        expect(clear).not.toHaveAttribute('aria-disabled');
        fireEvent.click(clear);
        expect(subject.push).toHaveBeenLastCalledWith(subject.path);
        unmount();
      }

      render(subject.none.list);
      expect(sent(form(subject))).toBe(subject.none.sends);
      expect(screen.queryByRole('link', { name: 'Clear' })).not.toBeInTheDocument();
    },
  ],
  // Back or Forward renders the page again under another filter, softly; the
  // list keys its filter by the filter shown, so the row starts from it
  // rather than from what was typed.
  [
    'starts again from the filter shown when the page shows another',
    (subject) => {
      const { rerender } = render(subject.none.list);
      fireEvent.change(searchbox(subject), { target: { value: 'draft' } });

      rerender(subject.shown.list);
      expect(sent(form(subject))).toBe(subject.shown.sends);

      fireEvent.change(searchbox(subject), { target: { value: 'draft' } });
      rerender(subject.none.list);
      expect(sent(form(subject))).toBe(subject.none.sends);
    },
  ],
  // Regression: the box went back to the text searched when its results arrived, losing what was typed meanwhile.
  [
    'keeps the text typed after a search is sent when that search arrives',
    (subject) => {
      const { rerender } = render(subject.shown.list);
      fireEvent.change(searchbox(subject), { target: { value: 'Two words' } });
      fireEvent.submit(form(subject));
      expect(subject.push.mock.calls).toEqual([[subject.searched]]);

      fireEvent.change(searchbox(subject), { target: { value: 'Two words more' } });
      rerender(subject.searchedList);

      expect(searchbox(subject)).toHaveValue('Two words more');
    },
  ],
  [
    'takes typing in the search box while the search sent is on its way, Enter sending nothing more, and keeps it when that search arrives',
    async (subject) => {
      const { box, user, rerender, arrive } = await searchOnItsWay(subject);

      await user.type(box(), ' more', {
        skipClick: true,
        initialSelectionStart: 'Two words'.length,
        initialSelectionEnd: 'Two words'.length,
      });
      expect(box()).toHaveValue('Two words more');
      expect(box()).not.toHaveAttribute('aria-disabled', 'true');
      await user.keyboard('{Enter}');
      expect(subject.push).toHaveBeenCalledTimes(1);

      await act(async () => rerender(subject.searchedList));
      await act(async () => arrive());

      expect(form(subject)).not.toHaveAttribute('aria-busy', 'true');
      expect(box()).toHaveValue('Two words more');
    },
  ],
  [
    'refuses every other control in the row while a search is on its way, each left as it was',
    async (subject) => {
      const { box, user } = await searchOnItsWay(subject);
      const row = within(form(subject));
      const others = [
        ...row.queryAllByRole('button'),
        ...row.queryAllByRole('link'),
        ...row.queryAllByRole('switch'),
        ...row.queryAllByRole('checkbox'),
        ...row.queryAllByRole('combobox'),
      ].filter((control) => control !== box());
      // Precondition: the row holds more than the box, at least the magnifier.
      expect(others.length).toBeGreaterThan(0);

      for (const control of others) {
        expect(control).toHaveAttribute('aria-disabled', 'true');
        const checked = (control as HTMLInputElement).checked;
        const value = (control as HTMLSelectElement).value;
        await user.click(control);
        expect((control as HTMLInputElement).checked).toBe(checked);
        expect((control as HTMLSelectElement).value).toBe(value);
      }
      expect(subject.push).toHaveBeenCalledTimes(1);
    },
  ],
];

/**
 * The row with "Two words" searched and its list still on its way, the box focused as Enter leaves it. `rerender`
 * draws another list in the same wait, and `arrive` settles it.
 */
async function searchOnItsWay(subject: FilterFormSubject) {
  let arrive = () => {};
  const arrives = new Promise<void>((resolve) => (arrive = resolve));
  const page = (list: ReactElement) => (
    <Navigating push={subject.push} arrives={arrives}>
      {list}
    </Navigating>
  );
  const user = userEvent.setup();
  const view = render(page(subject.shown.list));
  const box = () => searchbox(subject);
  fireEvent.change(box(), { target: { value: 'Two words' } });
  act(() => box().focus());
  await act(async () => {
    fireEvent.submit(form(subject));
  });
  // Precondition: the search was sent and its list is on its way.
  expect(subject.push.mock.calls).toEqual([[subject.searched]]);
  expect(form(subject)).toHaveAttribute('aria-busy', 'true');
  return {
    box,
    user,
    arrive,
    rerender: (list: ReactElement) => view.rerender(page(list)),
  };
}
