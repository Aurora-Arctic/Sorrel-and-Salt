import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installConsoleGuard } from './console-guard';
import HTMLElementConfig from 'happy-dom/lib/config/HTMLElementConfig.js';
import HTMLElementConfigContentModelEnum from 'happy-dom/lib/config/HTMLElementConfigContentModelEnum.js';

// Registered first, so its afterEach runs last: after RTL has unmounted, which
// can itself log. A test that logs a console error or warning without declaring
// it (`expectConsole`, tests/support/console-guard.ts) fails.
installConsoleGuard();

// The `dom` project's half of the setup; setup-msw.ts is the half both
// projects share.

// RTL registers this itself under `globals: true` (its entry checks for a
// global `afterEach`); the explicit call is a harmless duplicate from the port.
afterEach(() => {
  cleanup();
});

// Emptied after every test, as the render is: what one test stores — a theme,
// a remembered choice — is not there for the next to find.
afterEach(() => {
  window.localStorage.clear();
});

// happy-dom's `<dialog>` has a bare `showModal` and `close`, and every Modal in a test calls them.
// Pinned here as a browser behaves for what a test can see (the element gains and loses `open`), so a
// library version change cannot reach a test. A test asserting the calls themselves
// (tests/components/Modal) puts its own spies over these.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

// A browser answers `matchMedia`; happy-dom answers "no preference" to everything. A test environment
// draws no CSS transitions, so it reports the one preference that says not to wait for one: Modal then
// closes at once rather than holding for a `transitionend` nothing here can fire. A test of the fade,
// or of a system theme, stubs `matchMedia` itself over this.
const environmentMedia = (query: string): MediaQueryList =>
  ({
    matches: query.includes('prefers-reduced-motion: reduce'),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;
Object.defineProperty(window, 'matchMedia', {
  value: environmentMedia,
  writable: true,
  configurable: true,
});

// happy-dom's built-in default stylesheet leaves an inline element's `display`
// empty, where a browser reports the property's initial value, `inline`
// (happy-dom issue #2467). dom-accessibility-api reads it to decide whether the parts of an
// accessible name need a space between them, so "Edit Ingredient Testwort" came out with
// spaces inside the words. The HTML rendering section's inline elements are
// declared here, as a browser's own sheet declares them; `:where` keeps the
// specificity at zero, so a test's own styles still win.
const defaults = document.createElement('style');
defaults.setAttribute('data-test-default-styles', '');
defaults.textContent =
  ':where(a, abbr, b, bdi, bdo, cite, code, data, dfn, em, i, kbd, mark, q, s, samp, small, span, strong, sub, sup, time, u, var, label) { display: inline; }';
document.head.append(defaults);

// happy-dom 21 has no `<search>` (a Baseline Widely Available element, used by
// FilterForm), so `createElement('search')` gave an `HTMLUnknownElement` and
// React warned "The tag <search> is unrecognized". The library builds elements
// from this one table of tag name to class, so the entry a browser has is
// added to it: `<search>` is a plain `HTMLElement`, as the spec has it. A
// custom element cannot stand in, since its name needs a hyphen.
HTMLElementConfig.search = {
  className: 'HTMLElement',
  contentModel: HTMLElementConfigContentModelEnum.anyDescendants,
};
