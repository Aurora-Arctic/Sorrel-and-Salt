import AboutPillars from '@/components/AboutPillars';
import AboutRoles from '@/components/AboutRoles';
import {
  AnnotateIcon,
  BookIcon,
  CauldronIcon,
  CovenIcon,
  KeyIcon,
  SigilIcon,
  StockIcon,
} from '@/components/IconTip';
import type { DocumentPlaceholders } from '@/components/DocumentPage/types';

// The words on the cards live here and are not versioned: a keeper edits the prose around them, not these.
export const ABOUT_PLACEHOLDERS: DocumentPlaceholders = {
  aboutPillars: (
    <AboutPillars
      pillars={[
        {
          kicker: 'The Compendium',
          icon: <BookIcon />,
          accent: 'accent',
          heading: 'What Exists',
          text: 'The ingredient reference, curated by the site’s keepers and open for anyone to read.',
        },
        {
          kicker: 'Ingredients',
          icon: <StockIcon />,
          accent: 'clay',
          heading: 'What You Have',
          text: 'Every jar, bundle, and bottle a coven keeps, with how much of each is left on the shelf.',
        },
        {
          kicker: 'The Grimoire',
          icon: <CauldronIcon />,
          accent: 'sloe',
          heading: 'What You Make',
          text: 'The spells a coven has written, tried, and kept, and how each one turned out.',
        },
        {
          kicker: 'The Coven',
          icon: <CovenIcon />,
          accent: 'woad',
          heading: 'Who’s With You',
          text: 'A circle with its own Ingredients and Grimoire, joined by invitation.',
        },
      ]}
    />
  ),
  aboutRoles: (
    <AboutRoles
      roles={[
        {
          heading: 'The Owner',
          icon: <SigilIcon />,
          text: 'Holds the primary keeper account, the one no one can revoke. Every rule on the site applies to the owner as to anyone else.',
        },
        {
          heading: 'Keepers',
          icon: <KeyIcon />,
          text: 'Manage who uses the site: minting invitations, granting the right to create covens, changing site roles, and reading support requests. Every keeper holds a steward’s seat in the demo coven.',
        },
        {
          heading: 'Curators',
          icon: <AnnotateIcon />,
          text: 'Curate the Compendium, its vocabularies, and its references, and read the support requests a keeper passes on. A curator adds no claim without a source.',
        },
      ]}
    />
  ),
};
