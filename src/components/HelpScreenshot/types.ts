export interface HelpScreenshotProps {
  /** The light theme's picture, as the article writes it. */
  src: string;
  /** The dark theme's picture, `<name>.dark.png` beside it. */
  dark: string;
  /** The article's alt text: the button's name after "Enlarge:", and the enlarged image's name. */
  alt: string;
}
