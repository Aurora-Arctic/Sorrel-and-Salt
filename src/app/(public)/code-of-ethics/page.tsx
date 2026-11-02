import type { Metadata } from 'next';
import Link from 'next/link';
import DocumentPage from '../../../components/DocumentPage';
import { SITE_NAME, siteUrl } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'Code of Ethics',
  description: `What ${SITE_NAME} values, and how it handles the cultures, sourcing and access questions its subject raises.`,
  alternates: { canonical: siteUrl('/code-of-ethics') },
};

/** The day this text last changed. */
const UPDATED_ON = new Date('2026-11-02T00:00:00Z');

// What the site stands for. Each commitment is the site's own; each fact is cited in the Sources
// list at the end, and the working notes say where every sentence comes from
// (claude-docs/design-decisions/m15.4-code-of-ethics-notes.md). No session is read.
export default function CodeOfEthicsPage() {
  return (
    <DocumentPage
      title="Code of Ethics"
      lede={`What ${SITE_NAME} values, and how it handles the cultures, sourcing and access questions its subject raises.`}
      updatedOn={UPDATED_ON}
    >
      <h2>The Short Version</h2>
      <ul>
        <li>Everyone is welcome here, and bigotry is not.</li>
        <li>
          Other people's closed practices are theirs. The compendium records where an ingredient's
          lore comes from and does not hand out what is not ours to give.
        </li>
        <li>
          Take only what can be spared: no endangered plants, no animal parts from protected
          species, nothing poached.
        </li>
        <li>What the compendium says, it sources. A claim with no source is a claim to doubt.</li>
        <li>
          The site is built to be used by everyone, and an accessibility bug is a bug we fix first.
        </li>
        <li>No advertising, no selling of data, no owner above the community.</li>
      </ul>

      <h2>What Everyone Agrees To</h2>
      <p>
        The <Link href="/terms">Terms of Use</Link> make this section part of what every account
        agrees to. It is kept short on purpose. The sections after it say why each rule is here; the
        three at the end add to it for curators, admins and the site's owner, and bind whoever holds
        that role.
      </p>
      <ul>
        <li>
          Treat everyone here with respect. Racism, misogyny, transphobia, homophobia, ableism,
          antisemitism, Islamophobia and every other bigotry have no place on the site, in a coven
          or in a support request.
        </li>
        <li>
          Do not claim a closed practice as your own, and do not share what belongs to a people you
          are not part of.
        </li>
        <li>Take only what can be spared: no endangered plants, no parts of protected animals.</li>
        <li>
          Be honest about what you know and where you learned it, and say when you are unsure.
        </li>
        <li>
          Read the <Link href="/disclaimer">Disclaimer</Link> before you act on anything the
          compendium says.
        </li>
      </ul>

      <h2>What We Value</h2>
      <p>
        {SITE_NAME} is a grimoire for covens: a place for small groups of people to keep what they
        know, what they have and what they make. These are the values the people who run it hold
        themselves to, and ask of everyone who joins.
      </p>
      <ul>
        <li>
          <strong>Everyone is welcome.</strong> Witches, folk practitioners, the curious and the
          sceptical, of every race, nation, faith and none, every gender and every sexuality.
          Transgender, non-binary and queer practitioners are welcome here as themselves, without
          question or qualification. Racism, misogyny, transphobia, homophobia, ableism,
          antisemitism, Islamophobia and every other bigotry have no place here.
        </li>
        <li>
          <strong>Witchcraft's history is a gendered history.</strong> Between about 1400 and 1775,
          Europe and its colonies executed an estimated 40,000 to 60,000 people for witchcraft, and
          roughly four in five of them were women, in a period that held women to be less
          intelligent than men and more open to sin.<sup>7</sup> A site about witchcraft that is not
          feminist has forgotten whose history it is handling. Feminism here means the plain thing:
          that women, including trans women, are people whose knowledge, work and bodies are their
          own.
        </li>
        <li>
          <strong>Community over profit.</strong> The site shows no advertising, sells no data and
          charges nothing. It is run by people, for people, and the covens on it are run by their
          own members. We would rather the site stayed small and honest than grew by exploiting
          anyone, and we hold that what is shared should be shared fairly and decided together.
        </li>
        <li>
          <strong>Honesty.</strong> The site says what it does and does not do, in plain words, in
          its <Link href="/privacy">privacy policy</Link> and its{' '}
          <Link href="/disclaimer">disclaimer</Link>. Where it is unsure, it says so.
        </li>
      </ul>

      <h2>Closed Practices and Where Lore Comes From</h2>
      <p>
        Much of what a compendium of correspondences contains was taken from somewhere. Some of it
        comes from open traditions that invite anyone to learn. Some of it comes from closed
        practices: traditions that belong to a people, are passed on by initiation or by birth, and
        are not open to outsiders. Taking from a closed practice, without belonging to it, is
        appropriation, and it has a history of doing real harm.
      </p>
      <ul>
        <li>
          Smudging and the rites like it are ceremonies of particular Indigenous peoples of the
          Americas. Their purposes, their particulars and the plants they use vary widely between
          nations, and a plant burned by one may be taboo to another. Until 1978, when the United
          States passed the American Indian Religious Freedom Act, many of these practices had been
          prohibited by law; the Act's own findings say ceremonies had been "intruded upon,
          interfered with, and in a few instances banned". Today, mass-market "smudging kits" are
          sold against traditional prohibitions on selling spiritual medicines such as white sage,
          and Native activists have protested this as cultural misappropriation.<sup>2, 8</sup>
        </li>
        <li>
          Hoodoo was created by enslaved African Americans in the Southern United States, drawing on
          Central and West African spiritualities under slave codes that forbade them to gather. It
          was practised in secrecy, as a form of resistance, and by the twentieth century white
          drugstore owners and mail-order companies had appropriated it for profit. That
          appropriation remains a major concern for the people who hold the tradition.<sup>9</sup>
        </li>
      </ul>
      <p>So the site commits to this:</p>
      <ul>
        <li>
          The compendium records where an ingredient's lore comes from, by naming its sources. We
          commit that an entry whose lore comes from a closed practice will say so, name the people
          it belongs to, and not describe the ceremony.
        </li>
        <li>
          We commit to describing Indigenous, African diasporic and other closed traditions in the
          words their own practitioners use, cited to those practitioners where a source exists, and
          never to repackaging them as generic "witchcraft".
        </li>
        <li>
          A warning on an entry whose practice is closed, and ethical warnings on ingredients, are
          planned for the compendium and not yet built. Until they are, this page is the warning.
        </li>
        <li>
          If you belong to a tradition the compendium describes and it gets your tradition wrong,
          tell us through the <Link href="/support?support=compendium">support form</Link>. Your
          account of your own practice outranks any book on our shelf.
        </li>
      </ul>

      <h2>Ethical and Sustainable Sourcing</h2>
      <p>
        An ingredient that is sacred, scarce or both is not a commodity. The site asks every coven
        to take only what can be spared, and three plants sold for burning show why.
      </p>
      <ul>
        <li>
          <strong>White sage</strong> (<em>Salvia apiana</em>) is widely used by Native American
          peoples of the Pacific coast, and is being over-harvested for commercial smudging sticks,
          incense sticks and cones. Over-harvesting is reducing its wild population and range,
          illegal harvest is believed to be happening on public land, and in 2018 four people were
          arrested for taking 400 pounds of it. It is not on the United States' endangered species
          list, but conservationists are concerned for its survival. Grow your own, or buy from a
          grower, never from a wild harvest you cannot trace.<sup>1, 2</sup>
        </li>
        <li>
          <strong>Palo santo</strong> is two trees. <em>Bursera graveolens</em>, the one burned as
          incense in Bolivia, Ecuador and Peru, is assessed as Least Concern by the IUCN, and Peru
          permits only the collection of naturally fallen or dead wood.<sup>3</sup>{' '}
          <em>Bulnesia sarmientoi</em>, also called palo santo, has been listed as Endangered on the
          IUCN Red List since 2018 and in Appendix II of CITES since 2010, under pressure from
          deforestation of the Gran Chaco and global demand for its wood, extracts and oils.
          <sup>4</sup> Know which tree you are buying, and buy fallen wood.
        </li>
        <li>
          <strong>Indian sandalwood</strong> (<em>Santalum album</em>), burned as incense and held
          sacred in Hinduism, is assessed as Vulnerable by the IUCN because over-exploitation has
          put its wild population at risk of extinction, and India has banned its export.
          <sup>5</sup>
        </li>
        <li>
          <strong>Animal parts.</strong> CITES, the treaty in force since 1975 that protects
          endangered plants and animals from the threats of international trade, covers over 40,900
          species, subspecies and populations: Appendix I lists those threatened with extinction and
          given the highest protection, Appendix II those whose trade must be controlled to avoid
          use incompatible with their survival.<sup>6</sup> No bone, feather, fur, shell or tooth of
          a listed species belongs in a working, and the site will not help you source one.
        </li>
      </ul>
      <p>
        The site commits to recording an ingredient's IUCN and CITES status in the compendium where
        a source gives one, and to marking entries that ask for care in sourcing. Neither is built
        yet; both are planned.
      </p>

      <h2>Why the Compendium Cites Its Sources</h2>
      <p>
        Every claim in the compendium is meant to trace to a source: a book, a paper, a page, a
        practitioner. An entry with no source still saves, and sits on the curators' to-do list
        until it has one. A formal name is treated as a unique identifier and a common name never
        is, so a source is cited on an entry only when it names the plant without doubt.
      </p>
      <p>
        This is not pedantry. Folklore without provenance is where appropriation hides, where a
        hazard gets dropped from a copied list, and where one person's invention becomes "tradition"
        after three retellings. A source lets you check us, lets a practitioner see their own words
        credited, and lets a curator correct a mistake at its root. We prefer academic sources and
        the voices of the practitioners themselves, and we name an encyclopaedia where that is the
        best there is.
      </p>

      <h2>Accessibility</h2>
      <p>
        The site is built to be used by everyone: with a keyboard, with a screen reader, on a phone,
        at a large text size, in light or in dark. Its pages are checked against the Web Content
        Accessibility Guidelines, the W3C's standard for making web content accessible to people
        with disabilities, by an automated test in the browser suite that runs on every change, and
        the colours in both themes keep to the guidelines' contrast floor.<sup>10</sup> Automated
        checks do not find everything, so if something on the site does not work for you, that is a
        bug, and we commit to fixing accessibility bugs first.
      </p>
      <p>
        <Link href="/support?support=accessibility">Report an accessibility bug</Link>. The link
        opens the support form with Accessibility already chosen; you can send one without an
        account.
      </p>

      <h2>For Curators</h2>
      <p>
        A curator curates the compendium, its vocabularies and its references, and reads the support
        requests an admin has marked for curators or assigned to them. A curator agrees to
        everything above, and to this:
      </p>
      <ul>
        <li>
          Every entry you write or change says where it comes from. You add no claim you cannot
          source, and you leave an unsourced entry on the to-do list rather than guessing a source
          for it.
        </li>
        <li>
          You describe a closed practice in its own people's words, cited to them where a source
          exists, and you do not describe its ceremonies.
        </li>
        <li>
          You keep the compendium's safety notes honest: you write what a source says, you mark what
          has not been checked, and you never soften a hazard.
        </li>
        <li>
          A support request shows you what a sender chose to write, with their address hidden. You
          read it only to help, and you repeat nothing from it outside the request.
        </li>
        <li>
          Your curator role gives you nothing in any coven but your own. You do not use it, or ask
          an admin to use theirs, to reach another coven's ingredients or grimoire.
        </li>
      </ul>

      <h2>For Admins</h2>
      <p>
        An admin can do everything a curator can, and also manages who uses the site: an admin sees
        which covens a person belongs to, by name and role, grants and revokes the right to create
        covens, changes site roles, times out a support sender, mints invitations and holds an
        owner's seat in the demo coven. An admin agrees to everything above, and to this:
      </p>
      <ul>
        <li>
          You use each of those powers for the site's sake and never for your own: to keep people
          safe, to keep the compendium honest and to keep the site running. A grudge is not a
          reason.
        </li>
        <li>
          Every change you make to a person's role or rights is recorded with your name, and you
          write a note saying why wherever the screen offers one.
        </li>
        <li>
          You see a sender's email address and which covens a person belongs to. You use neither for
          anything but the request in front of you, and you share neither.
        </li>
        <li>
          A time-out on a support sender is the site's one sanction today, and you use it for abuse
          of the support form, not for disagreement.
        </li>
        <li>
          Your owner's seat in the demo coven is for showing people the site. The demo coven is a
          coven like any other to the people in it, and you treat what they write there as theirs.
        </li>
        <li>
          An admin's role gives you nothing in any other coven. The site's code refuses it, and so
          do you.
        </li>
      </ul>

      <h2>For the Site's Owner</h2>
      <p>
        The owner runs the site: its hosting, its database, its mail and its code, and holds the
        primary admin account, which no one can revoke. The owner agrees to everything above, and to
        this:
      </p>
      <ul>
        <li>
          The site stays free of advertising, sells no data and uses nothing anyone writes here to
          train anything. If any of that could ever change, the owner emails every account to say
          so, in writing, before it does.
        </li>
        <li>
          The owner reaches the database by hand only to do what a person has asked for, such as an
          erasure, or to fix a fault, and says so when it is done.
        </li>
        <li>
          Every rule on this page, and every change to the terms, applies to the owner as to anyone
          else, and a change to the terms is published as a new version that everyone agrees to
          again.
        </li>
        <li>
          The owner keeps the site's code public, so that anyone can check that these pages describe
          what it does.
        </li>
        <li>
          If the site must end, the owner says so ahead of time. The owner commits to building a way
          for people to take their own writing with them; it does not exist yet.
        </li>
      </ul>

      <h2>Sources</h2>
      <ol className="document-page__sources">
        <li>
          Wikipedia. "Salvia apiana." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/Salvia_apiana">
            https://en.wikipedia.org/wiki/Salvia_apiana
          </a>
          .
        </li>
        <li>
          Wikipedia. "Smudging." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/Smudging">
            https://en.wikipedia.org/wiki/Smudging
          </a>
          .
        </li>
        <li>
          Wikipedia. "Bursera graveolens." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/Bursera_graveolens">
            https://en.wikipedia.org/wiki/Bursera_graveolens
          </a>
          .
        </li>
        <li>
          Wikipedia. "Bulnesia sarmientoi." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/Bulnesia_sarmientoi">
            https://en.wikipedia.org/wiki/Bulnesia_sarmientoi
          </a>
          .
        </li>
        <li>
          Wikipedia. "Santalum album." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/Santalum_album">
            https://en.wikipedia.org/wiki/Santalum_album
          </a>
          .
        </li>
        <li>
          Wikipedia. "CITES." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/CITES">https://en.wikipedia.org/wiki/CITES</a>.
        </li>
        <li>
          Wikipedia. "Witch Trials in the Early Modern Period." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/Witch_trials_in_the_early_modern_period">
            https://en.wikipedia.org/wiki/Witch_trials_in_the_early_modern_period
          </a>
          .
        </li>
        <li>
          Wikipedia. "American Indian Religious Freedom Act." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/American_Indian_Religious_Freedom_Act">
            https://en.wikipedia.org/wiki/American_Indian_Religious_Freedom_Act
          </a>
          .
        </li>
        <li>
          Wikipedia. "Hoodoo (Spirituality)." Accessed 1 November 2026.{' '}
          <a href="https://en.wikipedia.org/wiki/Hoodoo_(spirituality)">
            https://en.wikipedia.org/wiki/Hoodoo_(spirituality)
          </a>
          .
        </li>
        <li>
          World Wide Web Consortium, Web Accessibility Initiative. "WCAG 2 Overview." Last updated
          17 September 2026.{' '}
          <a href="https://www.w3.org/WAI/standards-guidelines/wcag/">
            https://www.w3.org/WAI/standards-guidelines/wcag/
          </a>
          .
        </li>
      </ol>
    </DocumentPage>
  );
}
