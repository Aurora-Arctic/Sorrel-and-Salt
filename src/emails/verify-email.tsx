import { SOCIAL_PROVIDERS } from '../lib/social-providers';
import { Action, EmailLayout, Paragraph, renderParts } from './parts/layout';
import type { Message, ProviderId } from '../lib/types';
import type { VerifyEmailProps } from './types';

const SUBJECT = 'Confirm Your Email for Sorrel & Salt.';

function providerList(providers: readonly ProviderId[]): string {
  const labels = SOCIAL_PROVIDERS.filter((provider) => providers.includes(provider.id)).map(
    (provider) => provider.label,
  );
  return labels.length > 1
    ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
    : (labels[0] ?? '');
}

export function VerifyEmail({
  url,
  purpose = 'sign-up',
  providers,
  origin = new URL(url).origin,
  part,
}: VerifyEmailProps) {
  const signedUpWith = providerList(providers);
  return (
    <EmailLayout preview={SUBJECT} heading="Confirm Your Email" origin={origin}>
      <Paragraph>
        {purpose === 'change'
          ? 'Someone asked to use this email address for their Sorrel & Salt account'
          : 'Someone made a Sorrel & Salt account with this email address'}
        {signedUpWith && purpose === 'sign-up' && <>, using {signedUpWith}</>}.
      </Paragraph>
      <Paragraph>
        {part === 'html'
          ? 'If that was you, click the button below within one hour, in the same browser where you are signed in to Sorrel & Salt.'
          : 'If that was you, open the link below within one hour, in the same browser where you are signed in to Sorrel & Salt.'}
      </Paragraph>
      <Action href={url} label="Confirm my email" part={part} />
      <Paragraph muted>If it wasn&apos;t you, you can ignore this email.</Paragraph>
    </EmailLayout>
  );
}

/** The verification mail for `to`, rendered to the html and plain text `send` takes. */
export async function verifyEmailMessage({
  to,
  ...props
}: Omit<VerifyEmailProps, 'part'> & { to: string }): Promise<Message> {
  return {
    to,
    subject: SUBJECT,
    ...(await renderParts((part) => <VerifyEmail {...props} part={part} />)),
  };
}
