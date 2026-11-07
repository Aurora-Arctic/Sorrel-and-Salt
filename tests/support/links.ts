export const hrefs = (links: HTMLElement[]) => links.map((link) => link.getAttribute('href'));

export const currentHrefs = (links: HTMLElement[]) =>
  hrefs(links.filter((link) => link.getAttribute('aria-current') === 'page'));
