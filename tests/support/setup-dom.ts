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

// happy-dom's `<dialog>` has a bare `showModal` and `close`. Pinned here as a browser behaves for what a test
// can see (the element gains and loses `open`); a test asserting the calls puts its own spies over these.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

// happy-dom answers `matchMedia` with "no preference" to everything. This reports the preference that says not
// to wait for a transition, so Modal closes at once rather than holding for a `transitionend` nothing fires.
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

// happy-dom's default stylesheet leaves an inline element's `display` empty, where a browser reports `inline`
// (happy-dom issue #2467). dom-accessibility-api reads it to space an accessible name's parts, so names came
// out with spaces inside words. The inline elements are declared here; `:where` keeps specificity at zero.
const defaults = document.createElement('style');
defaults.setAttribute('data-test-default-styles', '');
defaults.textContent =
  ':where(a, abbr, b, bdi, bdo, cite, code, data, dfn, em, i, kbd, mark, q, s, samp, small, span, strong, sub, sup, time, u, var, label) { display: inline; }';
document.head.append(defaults);

// happy-dom 21 has no `<search>` element, so `createElement('search')` gave an `HTMLUnknownElement` and React
// warned. The library builds elements from one table of tag name to class, so `<search>` is added to it as a
// plain `HTMLElement`; a custom element cannot stand in, as its name needs a hyphen.
HTMLElementConfig.search = {
  className: 'HTMLElement',
  contentModel: HTMLElementConfigContentModelEnum.anyDescendants,
};
