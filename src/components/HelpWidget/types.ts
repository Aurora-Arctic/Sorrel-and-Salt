import type { Route } from 'next';

/** Who can put a refusal right, as the invitation refusals widget words it. */
export type RefusalFixer = 'You' | 'Whoever Sent It' | 'A Keeper' | 'No One Needs To';

interface RefusalFix {
  who: RefusalFixer;
  /** One sentence: what the reader does now. */
  now: string;
}

/** The button the accept page shows beside a refusal. */
interface RefusalAction {
  label: string;
  href: Route;
}

export interface RefusalFixes {
  link: RefusalFix;
  /** For the printed card's own wording, where the service has one for the reason. */
  card?: RefusalFix;
  action?: RefusalAction;
}

/** One message the accept page can give, with its fix, as the widget's island draws it. */
export interface RefusalEntry extends RefusalFix {
  key: string;
  message: string;
  card: boolean;
  action?: RefusalAction;
}
