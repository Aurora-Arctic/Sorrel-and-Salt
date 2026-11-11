import { ORIGIN } from './constants';
import type { MemberPauseNotifier } from '@/modules/coven';
import type { DocumentMailingNotifier } from '@/modules/documents';
import type {
  AccessPauseNotifier,
  EmailVerificationSender,
  InvitationSender,
  PasswordSetter,
} from '@/modules/identity';
import type { SupportNotifier, TimeoutNotifier } from '@/modules/support';

// The sender for a hand-built GraphQL context in a test that sends nothing:
// a call is the test's mistake, so it throws rather than passing silently.
function unexpected(name: string): never {
  throw new Error(`the test's context was not expected to ${name}`);
}

export const noSender: EmailVerificationSender = {
  resend: async () => unexpected('resend a verification mail'),
  requestChange: async () => unexpected('request an email change'),
  sessionIsFresh: async () => unexpected('check the session'),
  notifyChangeRequested: async () => unexpected('notify the current address'),
  defer: () => unexpected('defer a send'),
};

export const noInvitationSender: InvitationSender = {
  invitation: async () => unexpected('mail an invitation'),
};

export const noPasswordSetter: PasswordSetter = {
  set: async () => unexpected('set a password'),
  sessionIsFresh: async () => unexpected('read a session'),
};

export const noSupportNotifier: SupportNotifier = {
  origin: async () => unexpected('resolve an origin'),
};

export const noPauseNotifier: TimeoutNotifier & AccessPauseNotifier & MemberPauseNotifier = {
  origin: async () => ORIGIN,
};

export const noDocumentMailingNotifier: DocumentMailingNotifier = {
  origin: async () => ORIGIN,
};

export const PAUSE_MESSAGE = 'A fixture message to the user.';
