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
        <li>
          The site is free, carries no advertising and sells nothing about you. That is a promise,
          not a description of today.
        </li>
        <li>
          What you write stays yours. The site shows it only to the people you chose to share it
          with, and never uses it to train anything.
        </li>
        <li>Treat the people here, and the traditions their practice comes from, with respect.</li>
        <li>
          The ingredient information here is a reference, not advice. Read the{' '}
          <Link href="/disclaimer">Disclaimer</Link> before you act on any of it.
        </li>
        <li>
          Today the site is run by people in their spare time. It may go down, change or end, and we
          will say so plainly when it does.
        </li>
      </ul>

      <h2>Who May Use the Site</h2>
      <p>
        Anyone may read the public compendium without an account. Signing in by any method gives you
        an account and a viewer's seat in the demo coven, and nothing more: creating a coven of your
        own needs an invitation, or a grant from a site admin. There is no way to buy your way in.
      </p>
      <p>
        You must be at least thirteen years old. The site is run from the United States, whose
        Children's Online Privacy Protection Act treats anyone under thirteen as a child whose
        personal information an online service may not collect without a parent's consent, and the
        site does not ask for a parent's consent.
      </p>
      <p>
        Your account is yours alone. Keep your sign-in details to yourself, and tell us through the{' '}
        <Link href="/support">support form</Link> if you think someone else has used them.
      </p>

      <h2>What Is Yours</h2>
      <p>
        Everything you write in a coven stays yours: your ingredients, your stock, your spells,
        their steps and their workings. The site claims no ownership over any of it, and takes no
        right to use it beyond storing it and showing it to the people your coven settings allow. We
        promise that it is never sold, never used to train anything and never shown outside the
        coven it was written in.
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
        The <Link href="/code-of-ethics">Code of Ethics</Link> says what the site stands for. Its
        section "What Everyone Agrees To" binds every account, and agreeing to these terms is
        agreeing to it. In short: no bigotry, in any form, towards anyone; no claiming a closed
        practice as your own; taking only what can be spared; and honesty about what you know and
        where you learned it.
      </p>
      <p>
        The Code of Ethics goes on to ask more of the people who run the site. Its sections for
        curators, for admins and for the site's owner each add to the one before, and bind whoever
        holds that role for as long as they hold it.
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

      <h2>What the Site Is Not Liable For</h2>
      <p>
        This section limits what you could claim from the people who run the site. It is written to
        be read, not hidden, so here is what it does and what it does not do.
      </p>
      <ul>
        <li>
          <strong>Not liable for:</strong> the site being unavailable, slow or changed; anything you
          lose because a page was wrong, incomplete or out of date; anything you do with what you
          read here, including with any ingredient; and anything a coven's members write to one
          another.
        </li>
        <li>
          <strong>Up to what point:</strong> the site charges nothing, so the most the people who
          run it will owe you for any claim about it is what you paid them for it, which is nothing.
        </li>
        <li>
          <strong>What this cannot remove:</strong> any liability the law does not let a site
          exclude, and any right the law gives you that it does not let you give up. Washington's
          Consumer Protection Act, for instance, declares unfair or deceptive acts in trade unlawful
          and lets a person injured by one sue; these terms do not take that away. Washington law
          also treats a limitation of damages as invalid where it is unconscionable, that is, so
          one-sided that a court will not enforce it, and this one is meant to be read as the narrow
          limit it says it is and no more.
        </li>
      </ul>

      <h2>Which Law Applies</h2>
      <p>
        The site is run from the State of Washington, in the United States, and these terms are
        governed by the law of that state. Nothing in them takes away a protection that the law of
        the place you live gives you and does not let you give up.
      </p>

      <h2>Settling a Dispute</h2>
      <p>
        If you and the site's owner have a dispute about these terms or the site, each of you first
        tries arbitration: a neutral person hears both sides and gives a decision. The arbitration
        is non-binding, which means the decision is advice, not an order, and either of you may
        reject it. Nobody gives up the right to go to court, or the right to bring a claim together
        with other people, by agreeing to these terms.
      </p>
      <p>
        Whoever asks for the arbitration pays the arbitrator. The site's owner does not pay for an
        arbitration a member starts, and a member does not pay for one the owner starts.
      </p>
      <p>
        A person who cannot afford that may skip arbitration and go straight to court. The test is
        the one Washington's courts use when they waive their own filing fees for people who cannot
        pay them, General Rule 34: you qualify if you receive help from a needs-based programme such
        as TANF, SSI, poverty-related veterans' benefits or food stamps; or your household income is
        at or below 125 per cent of the federal poverty guideline; or it is above that line but your
        recurring basic living expenses leave you unable to pay; or other compelling circumstances
        show you cannot pay. You check yourself against those guidelines; you need no order from
        anyone first. The court looks at the same question when you ask it to waive your filing
        fees. If the claim of hardship was false, the owner may raise that in the same case. The
        point of this is simple: a person with a real claim is never priced out of court.
      </p>
      <p>
        If arbitration does not settle the dispute, either of you may take it to the state courts of
        Washington in Spokane County, where the Spokane County Superior Court sits, and you and the
        site's owner each agree to that court hearing it.
      </p>

      <p>
        Once a dispute is in court, Washington law lets the judge order whichever side brought a
        claim or a defence that the judge finds frivolous and advanced without reasonable cause to
        pay the other side's reasonable expenses, including lawyer's fees. That works in either
        direction, against the site's owner as much as against you, and it is the court's decision,
        not the arbitrator's.
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
        Right after you sign up, and again whenever the version you last agreed to is not the
        current one, the site sends you to its acceptance page, at /account/terms, before it shows
        you any other page that needs an account. There you read the terms and agree to them with a
        click, and the site records which version you agreed to and when. The public pages, this one
        included, need no agreement to read.
      </p>

      <h2>Updates to These Terms</h2>
      <p>
        These terms are refreshed from time to time, and only ever by a new version with a new date
        at the top, never quietly. When that happens, each account is asked to agree again at its
        next page that needs an account, on the same acceptance page. Anything an account does on
        the site after an update is bound by the updated terms. You can read the new version before
        you agree to it, and you can come back to this page at any time. The site's code is public,
        so anyone can check that the terms describe what the code does.
      </p>

      <h2>Sources</h2>
      <ol className="document-page__sources">
        <li>
          Washington Courts.{' '}
          <em>
            General Rule 34: Waiver of Court and Clerk's Fees and Charges in Civil Matters on the
            Basis of Indigency
          </em>
          , (a)(3)–(4). Adopted 28 December 2010, amended 1 January 2023. Accessed 2 November 2026.{' '}
          <a href="https://www.courts.wa.gov/court_rules/pdf/GR/GA_GR_34_00_00.pdf">
            https://www.courts.wa.gov/court_rules/pdf/GR/GA_GR_34_00_00.pdf
          </a>
          .
        </li>
        <li>
          Washington State Legislature. <em>Revised Code of Washington</em>, 7.04A.030, "When
          chapter applies", and 7.04A.060, "Validity of agreement to arbitrate" (Uniform Arbitration
          Act). Accessed 2 November 2026.{' '}
          <a href="https://app.leg.wa.gov/RCW/default.aspx?cite=7.04A.030">
            https://app.leg.wa.gov/RCW/default.aspx?cite=7.04A.030
          </a>
          ,{' '}
          <a href="https://app.leg.wa.gov/RCW/default.aspx?cite=7.04A.060">
            https://app.leg.wa.gov/RCW/default.aspx?cite=7.04A.060
          </a>
          .
        </li>
        <li>
          Washington State Legislature. <em>Revised Code of Washington</em>, 7.06.050, "Decision and
          award—Appeals—Trial—Judgment" (Arbitration of Civil Actions). Accessed 2 November 2026.{' '}
          <a href="https://app.leg.wa.gov/RCW/default.aspx?cite=7.06.050">
            https://app.leg.wa.gov/RCW/default.aspx?cite=7.06.050
          </a>
          .
        </li>
        <li>
          Washington State Legislature. <em>Revised Code of Washington</em>, 19.86.020, "Unfair
          competition, practices, declared unlawful", and 19.86.090, "Civil action for damages".
          Accessed 2 November 2026.{' '}
          <a href="https://app.leg.wa.gov/RCW/default.aspx?cite=19.86.020">
            https://app.leg.wa.gov/RCW/default.aspx?cite=19.86.020
          </a>
          ,{' '}
          <a href="https://app.leg.wa.gov/RCW/default.aspx?cite=19.86.090">
            https://app.leg.wa.gov/RCW/default.aspx?cite=19.86.090
          </a>
          .
        </li>
        <li>
          Washington State Legislature. <em>Revised Code of Washington</em>, 62A.2-719, "Contractual
          modification or limitation of remedy". Accessed 2 November 2026.{' '}
          <a href="https://app.leg.wa.gov/RCW/default.aspx?cite=62A.2-719">
            https://app.leg.wa.gov/RCW/default.aspx?cite=62A.2-719
          </a>
          .
        </li>
        <li>
          Washington Courts. "Court Directory: Spokane County." Accessed 2 November 2026.{' '}
          <a href="https://www.courts.wa.gov/court_dir/orgs/291.html">
            https://www.courts.wa.gov/court_dir/orgs/291.html
          </a>
          .
        </li>
        <li>
          United States. <em>Children's Online Privacy Protection Act</em>, 15 U.S.C. § 6501
          (Definitions). Legal Information Institute, Cornell Law School. Accessed 2 November 2026.{' '}
          <a href="https://www.law.cornell.edu/uscode/text/15/6501">
            https://www.law.cornell.edu/uscode/text/15/6501
          </a>
          .
        </li>
        <li>
          United States. <em>Children's Online Privacy Protection Rule</em>, 16 C.F.R. part 312, §§
          312.1 and 312.2. Legal Information Institute, Cornell Law School. Accessed 2 November
          2026.{' '}
          <a href="https://www.law.cornell.edu/cfr/text/16/part-312">
            https://www.law.cornell.edu/cfr/text/16/part-312
          </a>
          .
        </li>
        <li>
          Washington State Legislature. <em>Revised Code of Washington</em>, 4.84.185, "Prevailing
          party to receive expenses for opposing frivolous action or defense". Accessed 2 November
          2026.{' '}
          <a href="https://app.leg.wa.gov/RCW/default.aspx?cite=4.84.185">
            https://app.leg.wa.gov/RCW/default.aspx?cite=4.84.185
          </a>
          .
        </li>
      </ol>
    </DocumentPage>
  );
}
