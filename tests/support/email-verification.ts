import type { MemberPauseNotifier } from '@/modules/coven';
import type { DocumentMailingNotifier } from '@/modules/documents';
import type {
  AccessPauseNotifier,
  EmailVerificationSender,
  InvitationSender,
  PasswordSetter,
} from '@/modules/identity';
import type { AnonymousMinter, SupportNotifier, TimeoutNotifier } from '@/modules/support';

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

/** For a test that builds a GraphQL context and sends no signed-out support request. */
export const noAnonymousMinter: AnonymousMinter = {
  mint: async () => unexpected('mint an anonymous account'),
};

export const noSupportNotifier: SupportNotifier = {
  origin: async () => unexpected('resolve an origin'),
};

/** For a test that sets a time-out or pause and does not look at the mail: it gives the origin a pause mail's run carries. */
export const noPauseNotifier: TimeoutNotifier & AccessPauseNotifier & MemberPauseNotifier = {
  origin: async () => 'http://localhost:3000',
};

/** The origin a document mailing’s links are built on, for a test that starts no real run. */
export const noDocumentMailingNotifier: DocumentMailingNotifier = {
  origin: async () => 'http://localhost:3000',
};

/** The message to the user that a time-out or site access pause must carry, for a test that does not look at the mail. */
export const PAUSE_MESSAGE = 'A fixture message to the user.';
