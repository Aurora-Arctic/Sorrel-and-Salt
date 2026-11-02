import type { Metadata } from 'next';
import Link from 'next/link';
import AccessCards from '../../../components/AccessCards';
import type { AccessRole, AccessRow } from '../../../components/AccessCards/types';
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
const ACCESS_ROWS: AccessRow[] = [
  {
    data: 'Your name and the picture your sign-in provider shared',
    cells: [
      { mark: 'yes', text: 'Yes, for everyone in the coven' },
      { mark: 'yes', text: 'Yes, for everyone in the coven' },
      { mark: 'no', text: 'No: a viewer does not see the list of members' },
      { mark: 'yes', text: 'Yes, as the name beside a compendium edit' },
      { mark: 'yes', text: 'Yes, for every account' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Your email address',
    cells: [
      { mark: 'yes', text: 'Yes, for everyone in the coven' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'yes', text: 'Yes, for every account' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Which covens you belong to, and your role in each',
    cells: [
      { mark: 'part', text: 'Only this coven' },
      { mark: 'part', text: 'Only this coven' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'yes', text: 'Yes, by coven name and role' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Your sign-in details: which providers you use, your sessions, the network address and browser they record',
    cells: [
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'part', text: 'Which providers you use, and nothing else' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Your password, passkey and authenticator secrets',
    cells: [
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      {
        mark: 'part',
        text: "Only in a locked form: your password can never be turned back into the original, the authenticator secrets cannot be read without a key kept outside the database, and a passkey's private half never reaches the site",
      },
    ],
  },
  {
    data: "A coven's ingredients and stock",
    cells: [
      { mark: 'yes', text: 'Yes' },
      { mark: 'yes', text: 'Yes' },
      { mark: 'yes', text: 'Yes' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: "A coven's shared spells and workings",
    cells: [
      { mark: 'yes', text: 'Yes' },
      { mark: 'yes', text: 'Yes' },
      { mark: 'yes', text: 'Yes' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'A private spell',
    cells: [
      { mark: 'part', text: 'Only your own' },
      { mark: 'part', text: 'Only your own' },
      { mark: 'part', text: 'Only your own' },
      { mark: 'no', text: 'No' },
      { mark: 'part', text: 'Only their own, in the demo coven' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Your support requests and the replies to them',
    cells: [
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      {
        mark: 'part',
        text: "Only requests an admin marked for curators or assigned to them, without the requestor's email or the coven named in the page address",
      },
      { mark: 'yes', text: 'Yes, with your email' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Who wrote or changed a row, and when',
    cells: [
      { mark: 'yes', text: 'Yes, within the coven' },
      { mark: 'yes', text: 'Yes, within the coven' },
      { mark: 'yes', text: 'Yes, within the coven' },
      { mark: 'yes', text: 'Yes, on the compendium and its lists' },
      { mark: 'yes', text: 'Yes, on accounts and on the compendium' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
];

/** The roles, in column order, each with the short label over its column. */
const ROLES: AccessRole[] = [
  { name: 'Coven Owner', short: 'Own' },
  { name: 'Coven Member', short: 'Mem' },
  { name: 'Coven Viewer', short: 'View' },
  { name: 'Site Curator', short: 'Cur' },
  { name: 'Site Admin', short: 'Adm' },
  { name: 'A Developer with Database Access', short: 'Dev' },
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
        <li>Who can see what is set out at the end, one card per kind of data, role by role.</li>
      </ul>

      <h2>What Is Stored</h2>
      <h3>Your Account</h3>
      <p>
        Signing in creates an account holding your name, your email address, whether that email is
        verified, and a link to the picture your sign-in provider shared (if it shared one).
      </p>
      <p>
        Your email address changes only when you verify the new one. Until then the old email stays,
        and the new one appears only in the verification link the site sends.
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
        Each time you sign in, session info is stored: this includes the network address (IP
        address) you came from and the browser details your browser sent. The site stores these with
        every session, for security purposes. No screen shows them to anyone. A session stops
        working when it expires.
      </p>

      <h3>Rate-Limit Counters</h3>
      <p>
        To slow down malicious actors, the sign-in routes count requests by network address and
        route. A support request sent without an account is counted by network address and by email
        address for twenty-four hours.
      </p>

      <h3>Who Wrote What</h3>
      <p>
        Nearly every row carries four stamps: who created it and when, and who last changed it and
        when. A row that is deleted gains two more: who deleted it and when. These stamps are how
        the site shows "edited by" names.
      </p>
      <p>
        Every change to a site role or to the right to create covens is also written to a ledger
        that nobody can edit through the site: who changed it, how, when and any note the admin
        wrote. The ledger exists so that every change an admin makes to these rights can be clearly
        tracked, to prevent admin abuse.
      </p>

      <h3>What a Coven Holds</h3>
      <p>
        A coven holds its name, its members with their roles and when each joined, its invitations
        (the invited email, the role offered and any note), its ingredients and their stock, and its
        grimoire: every spell, its steps and its workings, with who wrote each. A spell marked
        private is shown only to the person who wrote it. Nobody else in the coven sees it, its
        owners included, though it is stored in the database. A working can be private too, even on
        a shared spell: it is shown only to the person who recorded it and to any coven member named
        on it.
      </p>
      <p>
        A printed invitation card is bound to no email. When someone opens a card's link and is
        refused, the attempt is recorded against their account with the reason.
      </p>

      <h3>Support Requests</h3>
      <p>
        A support request keeps what you chose to write (its subject and message), the page you sent
        it from, the error code if you sent it from an error page, its status, who it is assigned to
        and any replies. A request sent without an account keeps the email address you gave so that
        a reply can reach you. A time-out an admin sets on a sender is kept as history. Before a
        request is saved, the page address is cleaned: an invitation code in it is replaced and
        anything after a "?" is dropped. A curator reading a request never sees the sender's email
        address or the coven named in the page address; an admin sees both.
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
              <th scope="col">What It Does</th>
              <th scope="col">What It Handles</th>
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
              <td>Sends the site's mail</td>
              <td>Your email and the mail's text: verification links, invitations, notices</td>
            </tr>
            <tr>
              <td>Discord, Google, Microsoft, Facebook</td>
              <td>Sign you in, when you choose one of them</td>
              <td>
                They learn that you signed in to {SITE_NAME}, and hand the site your name, email and
                picture
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
          An account that signed in through a provider but never verified its email lapses an hour
          after its last verification mail, or three hours after it was created, whichever comes
          first. The next sign-in on the site removes every lapsed account, with its sessions and
          provider rows.
        </li>
        <li>
          A row that only pairs two things, an ingredient with a category or a spell with a
          category, is removed when the pairing is removed.
        </li>
        <li>A passkey you remove is removed.</li>
        <li>
          The counters that slow down repeated sign-in attempts are removed once they are out of
          date.
        </li>
      </ul>

      <h2>How to Ask for Removal</h2>
      <p>
        There is no "delete my account" button yet, and no self-service export. Until those are
        built, write to the site admins through the{' '}
        <Link href="/support?support=privacy">support form</Link>, choosing Privacy &amp; Data. You
        can send one without an account. Say what you want erased, and the site's admin will do it
        and tell you when it is done.
      </p>
      <p>
        You can leave a coven yourself from the coven's page, and a coven's owner can delete the
        coven. Both are soft deletes.
      </p>

      <h2>Who Can See What</h2>
      <p>
        Each line below comes from the rule the site enforces in its services, not from what a
        screen happens to show. "Coven" means the coven in which you hold that role; every account
        holds a viewer seat in the demo coven, and every site admin an owner seat there. A developer
        with database access means a person who can read the database directly. Database access is
        given to as few developers as possible, and only to those who need it to run the site.
      </p>
      <AccessCards roles={ROLES} rows={ACCESS_ROWS} />

      <h2>What the Site Does Not Do</h2>
      <ul>
        <li>It shows no advertising and runs no tracking script.</li>
        <li>
          It does not sell, rent or share your data. The services named above handle it only to run
          the site.
        </li>
      </ul>

      <h2>Changes to This Policy</h2>
      <p>When the text changes, the date at the top changes with it.</p>
    </DocumentPage>
  );
}
