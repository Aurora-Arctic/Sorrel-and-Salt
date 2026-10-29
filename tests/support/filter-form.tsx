import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { expect, onTestFinished } from 'vitest';
import type { FilterFormCase, FilterFormSubject } from './types';

// Six admin lists filter through the shared FilterForm. What every one must do with its own wiring (the page
// it submits to, the field names, the search's address, what draws Clear, the row's key) is written once as
// rows each list runs with `it.each`; the rest stays in the list's test (claude-docs/components/filter-form.md).

/**
 * A filter row's form by its name. The name is on the `<search>` around it, the
 * row's one landmark, which jsdom's role table cannot find, so it is found by
 * its label and the form taken from inside.
 */
export const filterForm = (name: string, scope: Pick<typeof screen, 'getByLabelText'> = screen) => {
  const form = scope.getByLabelText(name).querySelector<HTMLFormElement>('form');
  if (!form) throw new Error(`The filter row named "${name}" holds no form.`);
  return form;
};

const form = (subject: FilterFormSubject) => filterForm(subject.label);
const searchbox = (subject: FilterFormSubject) =>
  screen.getByRole(subject.searchRole ?? 'searchbox', { name: subject.searchLabel });

/** The form's fields as an address query, as a native submit sends them. */
export const sent = (filter: HTMLElement): string =>
  new URLSearchParams(
    [...new FormData(filter as HTMLFormElement)].map(([name, value]) => [name, String(value)]),
  ).toString();

/**
 * `page` as the server draws it, in the document, and `hydrate()` to run
 * the browser's hydration over that markup, for a field drawn one way on the
 * server and another once hydrated. Both are undone when the test finishes.
 */
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
  // Clear's loading state is CompendiumList's to test; this asserts which of
  // the list's values count as a filter, and where Clear goes.
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
];
