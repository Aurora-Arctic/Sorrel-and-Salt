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

// A link that opens a modal is `OpenModalLink` (src/components/Modal/open-modal-link.tsx), which calls
// `useOpenModalClick` for its own `ModalLink`, so a fix to a modified click or the keyboard reaches
// every such link. A button or menu item that opens a modal still takes the hook's handler.
const OPEN_MODAL_CLICK = /\buseOpenModalClick\(/;
const MODAL_LINK = /<ModalLink\b/;
const MODAL_HOME = /^src\/components\/Modal\//;

describe('a link that opens a modal', () => {
  it('is OpenModalLink, never useOpenModalClick paired with ModalLink by hand', () => {
    const files = inject('repoFiles').filter((file) => /^src\/.*\.tsx$/.test(file));
    const sources = files.map((file) => ({ file, text: readFileSync(file, 'utf8') }));

    // Preconditions: the scan found the hook's callers and the links, so an empty result is not an empty scan.
    expect(sources.filter(({ text }) => OPEN_MODAL_CLICK.test(text)).length).toBeGreaterThan(3);
    expect(sources.filter(({ text }) => MODAL_LINK.test(text)).length).toBeGreaterThan(1);

    const pairs = sources
      .filter(({ file }) => !MODAL_HOME.test(file))
      .filter(({ text }) => OPEN_MODAL_CLICK.test(text) && MODAL_LINK.test(text))
      .map(({ file }) => file);
    expect(pairs).toEqual([]);
  });

  it('has the shared link', () => {
    expect(readFileSync('src/components/Modal/index.tsx', 'utf8')).toMatch(/\bOpenModalLink\b/);
  });
});
