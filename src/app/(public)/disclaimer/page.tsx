import type { Metadata } from 'next';
import Link from 'next/link';
import SupportLink from '../../../components/SupportLink';
import DocumentPage, { SourceItem, SourceMarks } from '../../../components/DocumentPage';
import { SITE_NAME, siteUrl } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: `${SITE_NAME} is folklore and reference, not medical or professional advice, and its safety notes are not complete.`,
  alternates: { canonical: siteUrl('/disclaimer') },
};

/** The day this text last changed. */
const UPDATED_ON = new Date('2026-11-02T00:00:00Z');

// What the site's information is and is not. Every example is cited in the sources at the end; the
// working notes say where each sentence comes from
// (claude-docs/design-decisions/m15.3-disclaimer-notes.md). No session is read.
export default function DisclaimerPage() {
  return (
    <DocumentPage
      title="Disclaimer"
      lede="What the site's information is, what it is not, and why a safety note is never the whole story."
      updatedOn={UPDATED_ON}
    >
      <p>
        This disclaimer is part of the <Link href="/terms">Terms of Use</Link>: agreeing to the
        terms is agreeing to it.
      </p>
      <h2>The Short Version</h2>
      <ul>
        <li>
          {SITE_NAME} is folklore and reference. Nothing on it is medical, legal or other
          professional advice.
        </li>
        <li>
          The compendium is how its admins and curators read their sources. It is not an authority,
          and spirituality is personal.
        </li>
        <li>The site comes with no warranty. Its text can be wrong, out of date or incomplete.</li>
        <li>
          Safety notes are not complete. An ingredient with no safety note is not thereby safe.
        </li>
        <li>
          An ingredient can harm in a way its usual use does not suggest. Something eaten every day
          can burn the skin as an oil or irritate the lungs in the air.
        </li>
      </ul>

      <h2>Information, Not Advice</h2>
      <p>
        The compendium records what traditions, books and other sources say about ingredients: their
        correspondences, their folk names, the deities and festivals they are linked with, and what
        those sources say about handling them. It records these things so that a coven can look them
        up and cite them. It does not tell you what to do with them.
      </p>
      <p>
        If you are ill, pregnant, breastfeeding, taking medicine or caring for someone who is, ask a
        doctor, pharmacist or other qualified professional before you eat, drink, burn, inhale or
        put on your skin anything described here. If you think you or someone else has been
        poisoned, contact your local poison centre or emergency service straight away.
      </p>

      <h2>An Interpretation, Not an Authority</h2>
      <p>
        What the compendium says is its admins' and curators' understanding of the sources they have
        read. They choose which sources to cite and decide what each one means for an entry, and
        another reader of the same books could decide differently. The site is not an authority on
        any tradition or practice.
      </p>
      <p>
        Spirituality is personal. Your own practice, tradition and experience may differ from what
        you read here, and they are yours to follow.
      </p>

      <h2>No Warranty</h2>
      <p>
        The site is offered as it is. The people who run it do their best to cite a source for every
        claim and to mark what has not been checked, but they do not promise that any page is
        accurate, complete or current, and they accept no responsibility for what you do with it.
        Where a page cites a source, the source is the authority, not the page.
      </p>

      <h2>Safety Notes Are Not Complete</h2>
      <p>
        A safety note on an ingredient is what a cited source said about it, as far as the curators
        have read. It is not a toxicology report. A note may cover one hazard and miss another; it
        may describe the ingredient as a whole and say nothing about a particular form; and many
        ingredients have no note at all because nobody has written one yet, not because the
        ingredient is safe.
      </p>
      <p>
        So read every safety note as "at least this", never as "only this", and read the absence of
        a note as "nothing recorded", never as "nothing to worry about". The line under each
        ingredient's notes, and under each form's, says so and links here.
      </p>

      <h2>A Familiar Ingredient Can Still Harm</h2>
      <p>
        An ingredient that is safe in its usual use can be harmful in another. Changing the form,
        the dose or the route into the body changes the risk. Two documented cases, both of everyday
        foods:
      </p>
      <ul>
        <li>
          <strong>Bergamot.</strong> An essence from the peel of this citrus fruit flavours Earl
          Grey tea, and its peel is sometimes candied. The same oil on the skin, followed by
          ultraviolet light, has caused blistering burns within two to three days, because of a
          compound in it called bergapten.
          <SourceMarks cite="bergamot" numbers={[1, 2]} />
        </li>
        <li>
          <strong>Chilli.</strong> Many people enjoy the heat chilli peppers add to food. Yet the
          compound that gives that heat, capsaicin, causes pain and redness when its oils get on the
          skin, intense pain if juice reaches an eye, and, when inhaled, can trigger an asthma
          attack or respiratory distress in susceptible people.
          <SourceMarks cite="chilli" numbers={[3]} />
        </li>
      </ul>
      <p>
        These are just some examples about how risk changes with use. Please do your own research
        and ask a doctor, pharmacist or other qualified professional for advice.
      </p>

      <h2>Other Sites</h2>
      <p>
        The compendium links to the sources it cites. The site does not control those pages and does
        not vouch for them. Curators and admins try to use reputable sources but cannot control the
        words of other authors.
      </p>

      <h2>Questions</h2>
      <p>
        If a page is wrong, incomplete or dangerous, tell us through the{' '}
        <SupportLink about="compendium">support form</SupportLink>. A correction with a source is
        the most useful thing you can send.
      </p>

      <h2>Sources</h2>
      <ol className="document-page__sources">
        <SourceItem number={1} cites={['bergamot']}>
          Kaddu, Steven, Helmut Kerl, and Peter Wolf. "Accidental Bullous Phototoxic Reactions to
          Bergamot Aromatherapy Oil." <em>Journal of the American Academy of Dermatology</em> 45,
          no. 3 (2001): 458–61.{' '}
          <a href="https://doi.org/10.1067/mjd.2001.116226">
            https://doi.org/10.1067/mjd.2001.116226
          </a>
          .
        </SourceItem>
        <SourceItem number={2} cites={['bergamot']}>
          Wikipedia. "Bergamot Orange." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/Bergamot_orange">
            https://en.wikipedia.org/wiki/Bergamot_orange
          </a>
          .
        </SourceItem>
        <SourceItem number={3} cites={['chilli']}>
          McDaniel-Price, Amanda. "Capsaicin: When the Chili Is Too Hot." National Capital Poison
          Center. Accessed 1 November 2026.{' '}
          <a href="https://www.poison.org/articles/capsaicin-when-the-chili-is-too-hot">
            https://www.poison.org/articles/capsaicin-when-the-chili-is-too-hot
          </a>
          .
        </SourceItem>
      </ol>
    </DocumentPage>
  );
}
