// What a navigation test reads off a row of links: where each goes, and which the page marks as the
// open one. Shared by the admin nav's and the tabbed page's tests.

/** The address each link goes to, in order. */
export const hrefs = (links: HTMLElement[]) => links.map((link) => link.getAttribute('href'));

/** The addresses of the links marked `aria-current="page"`. */
export const currentHrefs = (links: HTMLElement[]) =>
  hrefs(links.filter((link) => link.getAttribute('aria-current') === 'page'));
