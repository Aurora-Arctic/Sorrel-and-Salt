import type { EmailVerificationSender, InvitationSender } from '@/modules/identity';

// The sender for a hand-built GraphQL context in a test that sends nothing:
// a call is the test's mistake, so it throws rather than passing silently.
function unexpected(name: string): never {
  throw new Error(`the test's context was not expected to ${name}`);
}

export const noSender: EmailVerificationSender = {
  resend: async () => unexpected('resend a verification mail'),
  requestChange: async () => unexpected('request an email change'),
};

export const noInvitationSender: InvitationSender = {
  siteInvitation: async () => unexpected('mail an invitation'),
};
