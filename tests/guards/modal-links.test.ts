import { readFileSync } from 'node:fs';
import { describe, expect, it, inject } from 'vitest';

// A plain `next/link` scrolls to the top when the address changes, so every link that opens a modal goes through `ModalLink`.

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
    expect(sources.filter(({ text }) => PLAIN_LINK.test(text)).length).toBeGreaterThan(1);
    expect(opening.filter(({ text }) => PLAIN_LINK.test(text)).map(({ file }) => file)).toEqual([]);
  });
});
