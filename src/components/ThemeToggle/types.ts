export interface ThemeToggleProps {
  /**
   * `corner` (the default) is the disc pinned to the window's top-right
   * corner, for pages with no application shell. `inline` is a round disc in
   * the flow, for the shell's bar.
   */
  variant?: 'corner' | 'inline';
}
