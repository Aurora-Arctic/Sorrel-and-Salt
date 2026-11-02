import type { Metadata } from 'next';
import Link from 'next/link';
import DocumentPage from '../../../components/DocumentPage';
import { SITE_NAME, siteUrl } from '../../../lib/site';
import { TERMS_UPDATED_ON, TERMS_VERSION } from '../../../lib/terms-version';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: `The rules of ${SITE_NAME}: who may use it, what is yours, what the site promises and what it does not.`,
  alternates: { canonical: siteUrl('/terms') },
};

// The one public document every account agrees to. Its version and date come from one constant
// the agreement gate reads too, so the page can never show a version the gate does not check. Every
// statement is drawn from the code, DESIGN.md or a cited law, and the working notes cite each one
// (claude-docs/design-decisions/m15.57-terms-of-use-notes.md). No session is read: a visitor and a
// member read the same page.
export default function TermsOfUsePage() {
  return (
    <DocumentPage
      title="Terms of Use"
      lede={`The rules of ${SITE_NAME}: who may use it, what is yours, what the site promises and what it does not.`}
      updatedOn={TERMS_UPDATED_ON}
    >
      <p>
        <strong>Version {TERMS_VERSION}.</strong> When these terms change, the version changes with
        them, and the site asks you to agree to the new version before you use it again.
      </p>

      <h2>The Short Version</h2>
      <ul>
        <li>The site is free, carries no advertising and sells nothing about you.</li>
        <li>
          What you write stays yours. The site shows it only to the people you chose to share it
          with.
        </li>
        <li>Treat the people here, and the traditions their practice comes from, with respect.</li>
        <li>
          The ingredient information here is a reference, not advice. Read the{' '}
          <Link href="/disclaimer">Disclaimer</Link> before you act on any of it.
        </li>
        <li>
          The site is run by people in their spare time. It may go down, change or end, and we will
          say so plainly when it does.
        </li>
      </ul>

      <h2>Who May Use the Site</h2>
      <p>
        Anyone may read the public compendium without an account. Signing in by any method gives you
        an account and a viewer's seat in the demo coven, and nothing more: creating a coven of your
        own needs an invitation, or a grant from a site admin. There is no way to buy your way in.
      </p>
      <p>
        You must be at least thirteen years old. That is the youngest age at which the data
        protection law of the United Kingdom lets an online service rely on a person's own consent,
        and the site relies on yours.
      </p>
      <p>
        Your account is yours alone. Keep your sign-in details to yourself, and tell us through the{' '}
        <Link href="/support">support form</Link> if you think someone else has used them.
      </p>

      <h2>What Is Yours</h2>
      <p>
        Everything you write in a coven stays yours: your ingredients, your stock, your spells,
        their steps and their workings. The site claims no ownership over any of it, and takes no
        right to use it beyond storing it and showing it to the people your coven settings allow. It
        is never sold, never used to train anything and never shown outside the coven it was written
        in.
      </p>
      <p>
        A spell marked private is shown to you alone. Once a spell is complete and shared with your
        coven, it cannot be made private again, because the people who have seen it may already rely
        on it; to change a shared spell, make a draft copy of it.
      </p>
      <p>
        A coven's owner may delete the coven, and may remove any member from it. Any member may
        leave a coven at any time. The demo coven, where every account begins, cannot be deleted.
      </p>

      <h2>The Compendium</h2>
      <p>
        The compendium is written and checked by the site's admins and curators. Every entry records
        where its information came from, and an entry with no source stays on the curators' list of
        work to do. It is a reference for people who practise, and it is offered as one: the{' '}
        <Link href="/disclaimer">Disclaimer</Link> is part of these terms, and so is the{' '}
        <Link href="/code-of-ethics">Code of Ethics</Link>.
      </p>

      <h2>How to Treat Each Other</h2>
      <p>
        The <Link href="/code-of-ethics">Code of Ethics</Link> says what the site stands for, and it
        binds everyone who uses it. In short: no bigotry, in any form, towards anyone; no claiming a
        closed practice as your own; and honesty about what you know and where you learned it.
      </p>
      <p>
        The tools the site has today for keeping to this are small, and we name them rather than
        promise more. A coven's owner may remove a member from the coven. A site admin may stop a
        person sending support requests for a time, and may take away the right to create covens.
        There is no button that closes an account, so an admin who needs to close one does it by
        hand in the database and says so.
      </p>

      <h2>What the Site Promises, and What It Does Not</h2>
      <p>
        The site is offered free and as it is. The people who run it do their best to keep it up and
        to keep your data safe, and they describe plainly what it keeps in the{' '}
        <Link href="/privacy">Privacy Policy</Link>. They cannot promise that it will always be
        available, that it will never lose anything, or that every entry in the compendium is
        correct and complete.
      </p>
      <p>
        You are responsible for how you use what you read here. The people who run the site are
        responsible for what the law says they are responsible for, and these terms do not try to
        take any right from you that the law gives you.
      </p>

      <h2>Leaving</h2>
      <p>
        You may stop using the site at any time. You can leave any coven from its page. To have your
        account or anything in it erased, ask through the{' '}
        <Link href="/support?support=privacy">support form</Link>, choosing Privacy &amp; Data;
        until an erase-my-account button exists, the site's admin does it by hand and tells you when
        it is done. What you delete yourself is marked deleted rather than erased, as the Privacy
        Policy explains.
      </p>

      <h2>Agreeing to These Terms</h2>
      <p>
        The first time you sign in after these terms are published, the site shows you this text and
        asks you to agree before it shows you any other page that needs an account. It records which
        version you agreed to and when. The public pages, this one included, need no agreement to
        read.
      </p>
      <p>
        When the terms change, the version at the top changes, and the site asks you to agree to the
        new version the same way. You can read the new version before you agree to it, and you can
        come back to this page at any time.
      </p>

      <h2>Changes to These Terms</h2>
      <p>
        These terms change only by a new version, never quietly. The site's code is public, so
        anyone can check that the terms describe what the code does.
      </p>

      <h2>Sources</h2>
      <ol className="document-page__sources">
        <li>
          United Kingdom. <em>Data Protection Act 2018</em>, c. 12, s. 9 (as enacted). Accessed 2
          November 2026.{' '}
          <a href="https://www.legislation.gov.uk/ukpga/2018/12/section/9/enacted">
            https://www.legislation.gov.uk/ukpga/2018/12/section/9/enacted
          </a>
          .
        </li>
        <li>
          European Union. <em>Regulation (EU) 2016/679 (General Data Protection Regulation)</em>,
          art. 8. Accessed 2 November 2026.{' '}
          <a href="https://gdpr-info.eu/art-8-gdpr/">https://gdpr-info.eu/art-8-gdpr/</a>.
        </li>
      </ol>
    </DocumentPage>
  );
}
