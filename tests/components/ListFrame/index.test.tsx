import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListFrame, {
  ListBody,
  ListNavigationContext,
  useListNavigation,
} from '@/components/ListFrame';
import { Navigating } from '../../support/navigating';

// A soft navigation runs through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// How a pager end's page keeps the reader at the list, where a filter's does not
// (claude-docs/components/list-frame.md).

/** One button per way a list opens a page: the filter's soft one and the pager's. */
const Ways = () => {
  const { go } = useListNavigation();
  return (
    <>
      <button type="button" onClick={() => go('/list?q=a', 'soft')}>
        Filter
      </button>
      <button type="button" onClick={() => go('/list?after=a', 'page')}>
        Next
      </button>
    </>
  );
};

const frame = (
  <ListFrame>
    <Ways />
    <ListBody>
      <table aria-label="Fixtures" />
    </ListBody>
  </ListFrame>
);

/** Presses a way and lets the new page arrive, ending the transition. */
async function pressAndArrive(name: 'Filter' | 'Next') {
  let arrive = () => {};
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  render(
    <Navigating push={router.push} arrives={arrives}>
      {frame}
    </Navigating>,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
  await act(async () => {
    arrive();
  });
}

describe('ListFrame, paging', () => {
  beforeEach(() => router.push.mockReset());

  it("keeps the reader's place on a pager end's push, and leaves a filter's scroll alone", async () => {
    await pressAndArrive('Next');
    expect(router.push).toHaveBeenCalledWith('/list?after=a', { scroll: false });

    router.push.mockReset();
    document.body.innerHTML = '';
    await pressAndArrive('Filter');
    expect(router.push).toHaveBeenCalledWith('/list?q=a');
  });
});

// The loading status stands in for the content while a page is on its way
// (moved from IngredientCardList's file, which only passes `shape="cards"`).
describe('ListBody, pending', () => {
  it('shows the loading status, and not the content, while a page is on its way', () => {
    render(
      <ListNavigationContext.Provider
        value={{ pending: true, searching: false, go: () => undefined }}
      >
        <ListFrame>
          <ListBody shape="cards">
            <p>Fixture content</p>
          </ListBody>
        </ListFrame>
      </ListNavigationContext.Provider>,
    );
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText('Fixture content')).toBeNull();
  });
});
