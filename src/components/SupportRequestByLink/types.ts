import type { SupportSenderRequestEntry } from '../SupportSenderRequest/types';

/** The request as the page draws it: the sender's view of it, less what a signed-out sender never has. */
export type LinkedRequest = Pick<
  SupportSenderRequestEntry,
  'id' | 'about' | 'subject' | 'status' | 'message' | 'createdAt' | 'replies'
>;

export type LinkState =
  | { phase: 'loading' }
  | { phase: 'missing' }
  | { phase: 'failed'; message: string }
  | { phase: 'found'; request: LinkedRequest };
