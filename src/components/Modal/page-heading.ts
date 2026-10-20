// The last place a closing modal gives the focus back to: the page's heading,
// when what opened the modal has gone and its owner names nowhere else, as
// after a row's own Remove takes the row away (M8.17, after M12.31's
// follow-up 5). Without it the focus falls to the body, and a screen reader
// starts again from the top of the page (claude-docs/components/modal.md,
// "Giving the focus back").

/** The page's heading, made focusable by script alone so Tab never stops on it. */
export function pageHeading(): HTMLElement | null {
  const heading =
    document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('h1');
  if (heading && !heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  return heading;
}
