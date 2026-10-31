import type { EmailVerificationSender, InvitationSender, PasswordSetter } from '@/modules/identity';
import type { SupportNotifier } from '@/modules/support';

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
  siteInvitation: async () => unexpected('mail an invitation'),
  workspaceInvitation: async () => unexpected('mail a coven invitation'),
};

export const noPasswordSetter: PasswordSetter = {
  set: async () => unexpected('set a password'),
  sessionIsFresh: async () => unexpected('read a session'),
};

export const noSupportNotifier: SupportNotifier = {
  replyWaiting: async () => unexpected('mail a support reply notice'),
  signedOutReceived: async () => unexpected('mail a signed-out receipt'),
  signedOutReply: async () => unexpected('mail a signed-out reply'),
};
