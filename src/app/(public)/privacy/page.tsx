import type { Metadata } from 'next';
import Link from 'next/link';
import DocumentPage from '../../../components/DocumentPage';
import { SITE_NAME, siteUrl } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `What personal data ${SITE_NAME} keeps, who processes it, how long it is kept and who can see it.`,
  alternates: { canonical: siteUrl('/privacy') },
};

/** The day this text last changed. */
const UPDATED_ON = new Date('2026-11-01T00:00:00Z');

/** Who may see each kind of data: one row per kind, one cell per role, each cell drawn from the service that enforces it. */
const ACCESS_ROWS: { data: string; cells: [string, string, string, string, string, string] }[] = [
  {
    data: 'Your name and the picture your sign-in provider shared',
    cells: [
      'Yes, for everyone in the coven',
      'Yes, for everyone in the coven',
      'No: a viewer does not see the list of members',
      'Yes, as the name beside a compendium edit',
      'Yes, for every account',
      'Yes',
    ],
  },
  {
    data: 'Your email address',
    cells: ['Yes, for everyone in the coven', 'No', 'No', 'No', 'Yes, for every account', 'Yes'],
  },
  {
    data: 'Which covens you belong to, and your role in each',
    cells: ['Only this coven', 'Only this coven', 'No', 'No', 'Yes, by coven name and role', 'Yes'],
  },
  {
    data: 'Your sign-in details: which providers you use, your sessions, the network address and browser they record',
    cells: ['No', 'No', 'No', 'No', 'Which providers you use, and nothing else', 'Yes'],
  },
  {
    data: 'Your password, passkey and authenticator secrets',
    cells: ['No', 'No', 'No', 'No', 'No', 'Only in the scrambled form the site stores'],
  },
  {
    data: "A coven's ingredients and stock",
    cells: ['Yes', 'Yes', 'Yes', 'No', 'No, except in the demo coven', 'Yes'],
  },
  {
    data: "A coven's shared spells and workings",
    cells: ['Yes', 'Yes', 'Yes', 'No', 'No, except in the demo coven', 'Yes'],
  },
  {
    data: 'A private spell',
    cells: [
      'Only your own',
      'Only your own',
      'Only your own',
      'No',
      'Only their own, in the demo coven',
      'Yes',
    ],
  },
  {
    data: 'Your support requests and the replies to them',
    cells: [
      'No',
      'No',
      'No',
      'Only requests an admin marked for curators or assigned to them, with your address hidden',
      'Yes, with your address',
      'Yes',
    ],
  },
  {
    data: 'Who wrote or changed a row, and when',
    cells: [
      'Yes, within the coven',
      'Yes, within the coven',
      'Yes, within the coven',
      'Yes, on the compendium and its lists',
      'Yes, on accounts and on the compendium',
      'Yes',
    ],
  },
];

const ROLES = [
  'Coven owner',
  'Coven member',
  'Coven viewer',
  'Site curator',
  'Site admin',
  'A developer with database access',
];

// The one public document that describes what the site keeps about a person. Every statement in it
// is drawn from the schema, a service or DESIGN.md, and the working notes cite each one
// (claude-docs/design-decisions/m15.2-privacy-policy-notes.md). No session is read: a visitor and a
// member read the same page.
export default function PrivacyPolicyPage() {
  return (
    <DocumentPage
      title="Privacy Policy"
      lede={`What ${SITE_NAME} keeps about you, who processes it, how long it is kept and who can see it.`}
      updatedOn={UPDATED_ON}
    >
      <h2>The Short Version</h2>
      <ul>
        <li>The site keeps only what it needs to sign you in and to run your covens.</li>
        <li>It shows no advertising and sells nothing about you.</li>
        <li>
          It sets cookies only for signing in: the one that keeps you signed in, and one that
          remembers which sign-in method you used last. Your light or dark theme is kept in your own
          browser, not sent to the site.
        </li>
        <li>
          What you delete is marked deleted rather than erased. To have something erased, ask
          through the <Link href="/support?support=privacy">support form</Link>.
        </li>
        <li>Who can see what is set out in a table at the end, role by role.</li>
      </ul>

      <h2>What Is Stored</h2>
      <h3>Your Account</h3>
      <p>
        Signing in creates an account holding your name, your email address, whether that address is
        verified, and a link to the picture your sign-in provider shared (if it shared one).
      </p>
      <p>
        Your email address changes only when you verify the new one. Until then the old address
        stays, and the new one appears only in the verification link the site sends.
      </p>

      <h3>How You Sign In</h3>
      <ul>
        <li>
          <strong>A provider</strong> (Discord, Google, Microsoft or Facebook): the site keeps the
          provider's name, your id with that provider, and the tokens and permission scope the
          provider issues to the site.
        </li>
        <li>
          <strong>A password:</strong> the site keeps a scrambled form of it (a hash, made with
          scrypt), never the password itself.
        </li>
        <li>
          <strong>A passkey:</strong> the site keeps the key's public half, its name, the kind of
          device it lives on, whether it is backed up and a counter. The private half never leaves
          your device.
        </li>
        <li>
          <strong>An authenticator app:</strong> the site keeps the shared secret and your backup
          codes in an encrypted form.
        </li>
      </ul>

      <h3>Your Sessions</h3>
      <p>
        Each time you sign in, a session row is written: a token that matches the cookie in your
        browser, when the session expires, the network address (IP address) you came from and the
        browser details your browser sent. Signing in to another account as an admin, which is
        possible only outside production, records which admin did so.
      </p>

      <h3>Verification Links</h3>
      <p>
        A link the site mails you, to verify an address or reset a password, is kept as a row
        holding what it identifies, its value and when it expires.
      </p>

      <h3>Rate-Limit Counters</h3>
      <p>
        To slow down guessing, the sign-in routes count requests by network address and route. A
        support request sent without an account is counted by network address and by email address
        for twenty-four hours.
      </p>

      <h3>Who Wrote What</h3>
      <p>
        Nearly every row carries four stamps: who created it and when, and who last changed it and
        when. A row that is deleted gains two more: who deleted it and when. These stamps are how
        the site shows "edited by" names, and they are written from your session, never from
        anything the browser sends.
      </p>
      <p>
        Every change to a site role or to the right to create covens is also written to a ledger
        that cannot be edited: who changed it, how, when and any note the admin wrote.
      </p>

      <h3>What a Coven Holds</h3>
      <p>
        A coven holds its name, its members with their roles and when each joined, its invitations
        (the invited address, the role offered and any note), its ingredients and their stock, and
        its grimoire: every spell, its steps and its workings, with who wrote each. A spell marked
        private is still stored in the coven; the site shows it only to its author.
      </p>
      <p>
        A printed invitation card is bound to no address. When someone opens a card's link and is
        refused, the attempt is recorded against their account with the reason.
      </p>

      <h3>Support Requests</h3>
      <p>
        A support request keeps what you chose to write (its subject and message), the page you sent
        it from, the error code if you sent it from an error page, its status, who it is assigned to
        and any replies. A request sent without an account keeps the email address you gave so that
        a reply can reach you. A time-out an admin sets on a sender is kept as history.
      </p>

      <h2>Who Processes It</h2>
      <p>
        The site runs on other companies' services. Each one handles some of your data to do its
        job, and none is given it for any other purpose.
      </p>
      <div className="data-table-frame">
        <table className="data-table" aria-label="Who processes your data">
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">What it does</th>
              <th scope="col">What it handles</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel</td>
              <td>Hosts the site and runs its code</td>
              <td>
                Every request, including your network address, and the server's logs, which carry an
                error reference when a page fails
              </td>
            </tr>
            <tr>
              <td>Neon</td>
              <td>Holds the database</td>
              <td>Everything listed under "What Is Stored"</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Sends the site's mail on production</td>
              <td>Your address and the mail's text: verification links, invitations, notices</td>
            </tr>
            <tr>
              <td>Mailtrap</td>
              <td>Captures the mail of the staging site, which delivers none</td>
              <td>The same, for test accounts on staging</td>
            </tr>
            <tr>
              <td>Discord, Google, Microsoft, Facebook</td>
              <td>Sign you in, when you choose one of them</td>
              <td>
                They learn that you signed in to {SITE_NAME}, and hand the site your name, address
                and picture
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>How Long It Is Kept</h2>
      <p>
        Most tables use a soft delete: a deleted row is marked with who deleted it and when, and the
        site stops showing it, but the row stays in the database. So today, "deleted" does not mean
        "erased". This applies to covens and their memberships, ingredients, spells and support
        replies alike.
      </p>
      <p>
        It works this way for two reasons: a spell keeps showing what went into it even after one of
        those ingredients is deleted, and a later version of the site can offer to bring back
        something deleted by mistake. That second feature does not exist yet.
      </p>
      <p>Some rows are removed outright:</p>
      <ul>
        <li>
          An account that signed in through a provider but never verified its address lapses an hour
          after its last verification mail, or three hours after it was created, whichever comes
          first. The next sign-in on the site removes every lapsed account, with its sessions and
          provider rows.
        </li>
        <li>
          A row that only pairs two things, an ingredient with a category or a spell with a
          category, is removed when the pairing is removed.
        </li>
        <li>A passkey you remove is removed.</li>
      </ul>
      <p>
        Sessions carry an expiry date, and the sign-in library writes and prunes the rate-limit
        counters itself.
      </p>

      <h2>How to Ask for Removal</h2>
      <p>
        There is no "delete my account" button yet, and no self-service export. Until those are
        built, write to whoever runs the site through the{' '}
        <Link href="/support?support=privacy">support form</Link>, choosing Privacy &amp; Data. You
        can send one without an account. Say what you want erased, and the site's admin will do it
        by hand in the database and tell you when it is done.
      </p>
      <p>
        You can leave a coven yourself from the coven's page, and a coven's owner can delete the
        coven. Both are soft deletes.
      </p>

      <h2>Who Can See What</h2>
      <p>
        Each cell below comes from the rule the site enforces in its services, not from what a
        screen happens to show. "Coven" means the coven in which you hold that role; every account
        holds a viewer seat in the demo coven, and every site admin an owner seat there. A developer
        with database access means a person who can read the database directly, which the site's
        authorisation rules cannot limit.
      </p>
      <div className="data-table-frame">
        <table className="data-table" aria-label="Who can see what">
          <thead>
            <tr>
              <th scope="col">Data</th>
              {ROLES.map((role) => (
                <th key={role} scope="col">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACCESS_ROWS.map(({ data, cells }) => (
              <tr key={data}>
                <th scope="row">{data}</th>
                {cells.map((cell, index) => (
                  <td key={ROLES[index]}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>What the Site Does Not Do</h2>
      <ul>
        <li>It shows no advertising and runs no tracking script.</li>
        <li>It sells, rents or shares your data with nobody, beyond the services named above.</li>
      </ul>

      <h2>Changes to This Policy</h2>
      <p>
        When the text changes, the date at the top changes with it. The site's code is public, so
        anyone can check that the policy describes what the code does.
      </p>
    </DocumentPage>
  );
}
