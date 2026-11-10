import type { SupportSenderRequestEntry } from '../SupportSenderRequest/types';

export type LinkedRequest = Pick<
  SupportSenderRequestEntry,
  'id' | 'about' | 'subject' | 'status' | 'message' | 'createdAt' | 'replies'
>;

export type LinkState =
  | { phase: 'loading' }
  | { phase: 'missing' }
  | { phase: 'failed'; message: string }
  | { phase: 'found'; request: LinkedRequest };
