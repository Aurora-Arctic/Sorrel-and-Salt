import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/page-metadata';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import PageHeader from '@/components/PageHeader';
import PageFrame from '@/components/PageFrame';
import { PendingLink } from '@/lib/navigation';

export const metadata: Metadata = noIndexMetadata('Forgot Password');

// The (public) layout draws the site bar and holds the `main`, so the frame is a `div`; the page is open to a signed-out visitor.
export default function ForgotPasswordPage() {
  return (
    <PageFrame as="div" narrow className="page-frame--in-column">
      <div className="panel">
        <PageHeader
          className="card-page-header"
          headingClassName="auth-title"
          title="Forgot Your Password?"
          lede={
            <>Enter your email address and we&apos;ll send you a link to choose a new password.</>
          }
        />
        <ForgotPasswordForm />
        <p className="forgot-password-form__back">
          <PendingLink href="/sign-in">Back to Sign In</PendingLink>
        </p>
      </div>
    </PageFrame>
  );
}
