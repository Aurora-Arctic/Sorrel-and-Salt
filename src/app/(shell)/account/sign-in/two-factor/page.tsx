import type { Metadata } from 'next';
import Link from 'next/link';
import TwoFactorSettings from '../../../../../components/PasswordSection/two-factor';
import { hasPassword, requireSession } from '../../../../../lib/request-session';
import { ACCOUNT_PASSWORD_PATH } from '../../../../../lib/sign-in';
import { getMe } from '@/modules/identity';

export const metadata: Metadata = {
  title: 'Two-Factor Sign-In — Sorrel & Salt',
};

export default async function TwoFactorPage() {
  const session = await requireSession();
  const [me, passwordHeld] = await Promise.all([getMe(session), hasPassword()]);

  return (
    <section className="page-frame__section panel" aria-labelledby="account-two-factor-heading">
      <div className="header">
        <h2 id="account-two-factor-heading">Two-Factor Sign-In</h2>
        <p className="lede">
          Ask for a code from an authenticator app, as well as your password, when you sign in.
        </p>
      </div>
      {/* Two-factor guards password sign-ins alone, so an account with no password has nothing to turn on. */}
      {passwordHeld ? (
        <TwoFactorSettings enabled={me.twoFactorEnabled} />
      ) : (
        <p>
          Two-factor guards password sign-ins, and this account has no password.{' '}
          <Link href={ACCOUNT_PASSWORD_PATH}>Set a Password</Link> first.
        </p>
      )}
    </section>
  );
}
