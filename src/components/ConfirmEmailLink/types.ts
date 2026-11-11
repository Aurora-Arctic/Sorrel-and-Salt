export interface ConfirmEmailLinkProps {
  /** Where the email page is: `emailPagePath(next)`, or the address the server worked out. */
  href: string;
  /** The button's style, quiet beside other choices and solid when it is the one thing to do. */
  tone?: 'quiet' | 'solid';
}
