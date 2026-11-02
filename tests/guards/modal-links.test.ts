import { readFileSync } from 'node:fs';
import { describe, expect, it, inject } from 'vitest';

// A link that opens a modal changes the address, and a plain `next/link` scrolls the page to the top
// on that. Every such link goes through `ModalLink`, which turns the scroll off, so a file that opens
// a modal by address does not import `next/link` itself.

const OPENS_A_MODAL = /useOpenModalClick|supportHref|SUPPORT_PARAM|IconLink/;
const PLAIN_LINK = /from 'next\/link'/;
// The dialog's own link goes to another page, which scrolling to its top suits.
const EXEMPT = /\.stories\.tsx$|^src\/components\/(Modal\/modal-link|SupportDialog\/index)\.tsx$/;

describe('links that open a modal', () => {
  it('use ModalLink, never next/link directly', () => {
    const files = inject('repoFiles').filter(
      (file) => /^src\/.*\.tsx$/.test(file) && !EXEMPT.test(file),
    );
    const sources = files.map((file) => ({ file, text: readFileSync(file, 'utf8') }));
    const opening = sources.filter(({ text }) => OPENS_A_MODAL.test(text));

    // Preconditions: the scan found the files that open modals, and the plain-link import is one it can see.
    expect(opening.length).toBeGreaterThan(5);
    expect(sources.filter(({ text }) => PLAIN_LINK.test(text)).length).toBeGreaterThan(10);
    expect(opening.filter(({ text }) => PLAIN_LINK.test(text)).map(({ file }) => file)).toEqual([]);
  });
});
