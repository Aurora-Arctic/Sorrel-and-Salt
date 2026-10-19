import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ListFrame, { ListBody, useListNavigation } from '@/components/ListFrame';
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
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    router.push.mockReset();
    scrollIntoView.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
    // The root's scroll-padding-top is the line the stuck search row leaves.
    document.documentElement.style.setProperty('scroll-padding-top', '100px');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty('scroll-padding-top');
  });

  /** Puts the list body's top at `top` px from the viewport's top. */
  const bodyTopAt = (top: number) =>
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      return { top: this.classList.contains('list-frame__body') ? top : 0 } as DOMRect;
    });

  it("keeps the reader's place on a pager end's push, and leaves a filter's scroll alone", async () => {
    await pressAndArrive('Next');
    expect(router.push).toHaveBeenCalledWith('/list?after=a', { scroll: false });

    router.push.mockReset();
    document.body.innerHTML = '';
    await pressAndArrive('Filter');
    expect(router.push).toHaveBeenCalledWith('/list?q=a');
  });

  it('brings the list body to the top once the new page renders, when its top is above the padding line', async () => {
    bodyTopAt(-250);

    await pressAndArrive('Next');

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(scrollIntoView.mock.contexts[0]).toHaveClass('list-frame__body');
  });

  it('scrolls nothing when the list body starts below the padding line', async () => {
    bodyTopAt(300);

    await pressAndArrive('Next');

    expect(router.push).toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls nothing after a filter's page", async () => {
    bodyTopAt(-250);

    await pressAndArrive('Filter');

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
