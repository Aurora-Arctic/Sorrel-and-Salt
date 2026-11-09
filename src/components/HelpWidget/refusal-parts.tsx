import type { ReactElement } from 'react';
import type { RefusalFixer } from './types';

// Drawn by both the server list and the client answer, so this file takes no directive.

const TONE: Record<RefusalFixer, string> = {
  You: 'you',
  'Whoever Sent It': 'sender',
  'A Keeper': 'keeper',
  'No One Needs To': 'none',
};

export const RefusalWho = ({ who }: { who: RefusalFixer }): ReactElement => (
  <span className={`help-widget__who help-widget__who--${TONE[who]}`}>{who}</span>
);

export const PrintedCardMark = (): ReactElement => (
  <span className="badge badge--muted help-widget__card">Printed Card</span>
);
