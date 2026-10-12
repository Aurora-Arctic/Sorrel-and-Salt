export interface ThemeToggleProps {
  /**
   * `corner` (the default) is the disc pinned to the window's top-right
   * corner, for pages with no application shell. `inline` is a round disc in
   * the flow, for the shell's bar and its phone account panel.
   */
  variant?: 'corner' | 'inline';
  /** `small` is the inline disc at the account panel's size; the corner ignores it. */
  size?: 'default' | 'small';
}
