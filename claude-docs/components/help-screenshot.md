# HelpScreenshot

`src/components/HelpScreenshot/` is a help article's screenshot: a button holding the picture, which opens it full size in a dialog over the page. `renderMarkdown` draws it inside the `.figure` for a paragraph that is one image; the markdown and the files are in [`help-pages.md`](help-pages.md), "Screenshots".

It is a client component built on `ModalButton` ([`modal.md`](modal.md)), so a click, Enter or Space opens the dialog, Escape or Close shuts it, and the focus goes back to the button. The button is named "Enlarge: <alt text>". The dialog takes `size="picture"`, as wide as a screenshot is captured (1024px) plus the dialog's padding and never wider than the window, and `readingBody`, so its body scrolls a picture taller than the screen and takes the focus from the keyboard. In it the picture is one `role="img"` element named by the alt text.

Both the button and the dialog hold the two pictures, the light file and `<name>.dark.png`, each with an empty alt. The `.screenshot` primitive (`src/scss/_primitives.scss`) shows the dark one by default and the light one under the light theme's selectors, so either place shows only the picture for the reader's theme. It also holds each picture to `max-width: 100%`, so a picture is never wider than the figure, nor the figure than the article section it sits in.

The button is drawn as the picture alone: no fill, border or padding, `cursor: zoom-in`, and the focus ring on `:focus-visible`.

Story: `Pages / Help / HelpScreenshot` in `index.stories.tsx`. Tests: `tests/components/DocumentPage/help-figures.test.tsx`; the theme, the zoom and the widths in a browser in `tests/e2e/help-pages.spec.ts`, "screenshots".
