import { devices } from '@playwright/test';

// The window widths the specs set (`setViewportSize`, `test.use({ viewport })`). A spec takes a width from
// here and never writes one: tests/guards/viewport-widths.test.ts refuses a literal, and checks each
// restated width below against the compiled stylesheets and TABLET_BAND.

// The one phone width outside the list: the narrowest window the app supports. A bare number because no
// stylesheet has an edge there.
export const PHONE_WIDTH = 375;

// The desktop projects' own window, read from the device they run so it cannot drift from it.
export const DESKTOP_WIDTH = devices['Desktop Chrome'].viewport.width;

// Window widths a media query turns on. Restated from the `$shell-*` variables in src/scss/_variables.scss
// because a spec cannot import Sass; the guard compares each to the compiled `@media` edges. A query is
// `max-width` this value (below) or `min-width` this value plus 0.01rem (above), so this width and one
// past it fall either side.
export const BREAKPOINTS = {
  phone: 640,
  tablet: 896,
  // The width a page with a menu stands three columns from (`page-with-nav-wide` in _mixins.scss).
  pageWithNavWide: 928,
};

// A width inside a band, away from its edges.
export const BAND_WIDTHS = {
  // Above the phone edge and under the tablet edge, where the tablet layout applies.
  tablet: 800,
};

// The page header's own container-query edges (`container-from`/`container-to` on `page-header`). They
// are widths of the header, not the window: add PAGE_HEADER_GUTTER for the window that gives one.
export const PAGE_HEADER = {
  addBelow: 350,
  actionBelow: 400,
  narrowColumn: 448,
  tabbedReflow: 536,
  tabbedPlus: 680,
  tabbedReflowLabelled: 700,
};

// What a page column takes off the window before the page header: its inline padding on both sides.
export const PAGE_HEADER_GUTTER = 32;
