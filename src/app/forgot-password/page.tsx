import type { Metadata } from 'next';
import Link from 'next/link';
import ForgotPasswordForm from '../../components/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot Password — Sorrel & Salt',
  // A second guard beside robots.txt, which leaves this path out of its allow list: a crawler that
  // fetches the page anyway is told not to list it.
  robots: { index: false },
};

// No AppShell: DESIGN.md §9 scopes it to signed-in pages, and this page is reachable while signed out.
export default function ForgotPasswordPage() {
  return (
    <main className="page-frame page-frame--narrow">
      <div className="panel">
        <div className="header">
          <h1>Forgot Your Password?</h1>
          <p className="lede">
            Enter your email address and we&apos;ll send you a link to choose a new password.
          </p>
        </div>
        <ForgotPasswordForm />
        <p>
          <Link href="/sign-in">Back to Sign In</Link>
        </p>
      </div>
    </main>
  );
}
