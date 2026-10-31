import type { Metadata } from 'next';
import ResetPasswordForm from '../../components/ResetPasswordForm';
import type { ResetPasswordPageProps } from './types';

export const metadata: Metadata = {
  title: 'Choose a New Password — Sorrel & Salt',
  // A second guard beside robots.txt, which leaves this path out of its allow list: a crawler that
  // fetches the page anyway is told not to list it.
  robots: { index: false },
};

// Better Auth's mailed link checks its token and opens this page with `?token=`, or with
// `?error=INVALID_TOKEN` for one spent or expired; the form offers a new link for any page without a usable
// token (claude-docs/auth/passwords.md, "Reset and change"). No AppShell: the page is reachable signed out.
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token, error } = await searchParams;
  const usable =
    typeof token === 'string' && token !== '' && error === undefined ? token : undefined;

  return (
    <main className="page-frame page-frame--narrow">
      <div className="panel">
        <div className="header">
          <h1 className="reset-password-form__heading">Choose a New Password</h1>
          <p className="lede">
            Your new password signs out every device signed in to your account.
          </p>
        </div>
        <ResetPasswordForm token={usable} />
      </div>
    </main>
  );
}
