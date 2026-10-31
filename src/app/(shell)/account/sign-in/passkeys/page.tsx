import type { Metadata } from 'next';
import Passkeys from '../../../../../components/Passkeys';
import { accountPasskeys, requireSession } from '../../../../../lib/request-session';

export const metadata: Metadata = {
  title: 'Passkeys — Sorrel & Salt',
};

export default async function PasskeysPage() {
  await requireSession();
  const passkeys = await accountPasskeys();

  return (
    <section className="page-frame__section panel" aria-labelledby="account-passkeys-heading">
      <div className="header">
        <h2 id="account-passkeys-heading">Passkeys</h2>
        <p className="lede">
          A passkey is tied to this website&rsquo;s address and to the device or password manager
          that holds it.
        </p>
      </div>
      <Passkeys passkeys={passkeys} />
    </section>
  );
}
