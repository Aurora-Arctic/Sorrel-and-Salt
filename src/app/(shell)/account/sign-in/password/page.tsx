import type { Metadata } from 'next';
import PasswordSection from '../../../../../components/PasswordSection';
import { hasPassword, linkedAccounts, requireSession } from '../../../../../lib/request-session';

export const metadata: Metadata = {
  title: 'Password — Sorrel & Salt',
};

export default async function PasswordPage() {
  await requireSession();
  const [passwordHeld, linked] = await Promise.all([hasPassword(), linkedAccounts()]);

  return (
    <section className="page-frame__section panel" aria-labelledby="account-password-heading">
      <div className="header">
        <h2 id="account-password-heading">Password</h2>
        <p className="lede">
          {passwordHeld
            ? 'Changing your password signs out every other device signed in to your account.'
            : linked.length > 0
              ? 'Set a password to sign in with your email address as well as your providers.'
              : 'Set a password to sign in with your email address as well.'}
        </p>
      </div>
      <PasswordSection hasPassword={passwordHeld} />
    </section>
  );
}
