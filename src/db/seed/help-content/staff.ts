import { article, subPage } from './build';

const curating = article(
  9,
  'Curating a Compendium Entry',
  'How curators and Keepers add and correct Compendium entries.',
  `Curators and Keepers curate the Compendium, its vocabularies and the site documents, and review support requests. They have no access to any coven's ingredients or grimoire, except the Demo Coven.

A curator can use filters ordinary readers do not see: Reviewed, Hidden, No Refs and No Form, and a sort by how well sourced an entry is.`,
  'staff',
);
const curatingPages = [
  subPage(
    curating,
    1,
    'Sourcing With References',
    'Attaching the sources an entry rests on.',
    `What the Compendium says, it sources. In the ingredient form, add a reference to the ingredient or to a form. Each reference has a "Locator", which points to where in the work the claim is found, a "Name Basis" and "Supports". "New Reference" adds a work that is not yet in the list.

Entries with no references show under the No Refs filter.`,
  ),
  subPage(
    curating,
    2,
    'Formal Names, Common Names and Needs-Review',
    'Which names identify an ingredient and which do not.',
    `A formal name is a unique identifier and a common name never is. An ingredient's identity is its formal name alone, and its folk names are only other names for it.

When the name a source uses cannot be matched to a formal name, do not guess. Mark that name as unresolved and mark the entry file needs-review: an approved file may hold no unresolved name. A needs-review file must end with a "Questions for the Curator" section saying what is to be settled, and the seed writes only approved files, so it waits in the curator's queue (the seed-queue script lists it).

In the Compendium filters, a curator's "Reviewed" choice has the values Any, Reviewed and Needs Review. Needs Review keeps the entries that have no curator review mark; Reviewed keeps those that have one.`,
  ),
];

const vocab = article(
  10,
  'Vocabularies and Categories',
  'The lists curators keep that the rest of the site draws on.',
  `Curators keep the categories, the groups they are filed under, and the other curated lists: astrology, deities and the traditions they belong to, and the values an ingredient's form can take. They are the same for every coven, so a change shows everywhere.

Deleting a category group moves its categories rather than removing them. A category's slug comes from its own name alone, so renaming a group does not change it. Two items cannot share a slug.`,
  'staff',
);

const queue = article(
  11,
  'Working the Support Queue',
  'How curators and Keepers answer support requests.',
  `Requests appear under Support Requests, which can be filtered by status and by "About". A Keeper sees every request, and a curator only those marked "Shared With Curators" or assigned to them. A curator does not see a signed-out sender's address, though a reply still reaches it.

A Keeper can reply to any request and a curator only to one assigned to them. Internal notes are seen by staff only, are never mailed, and change no status. A Keeper assigns a request ("Assignee").`,
  'staff',
);
const queuePages = [
  subPage(
    queue,
    1,
    'What the Statuses Mean for Staff',
    'How a request moves between statuses.',
    `- A reply marked "Waiting on Sender" moves an open request to Waiting on Sender.
- "Resolve" marks an open or waiting request resolved. A sender can resolve their own.
- A sender's message reopens a waiting or resolved request and keeps its assignee.
- A resolved request is closed by a job seven days later, and staff can close any request. A sender's message on a closed request opens a new linked request.
- Replies to a closed request are refused.`,
  ),
  subPage(
    queue,
    2,
    'Timing a Sender Out and Turning a Request Into an Issue',
    'Stopping a sender, and linking a request to a GitHub issue.',
    `A Keeper can time out a signed-in user, or a signed-out sender's address, until a date or with no end. It needs a note and a message of 500 characters or fewer. The sender cannot send new requests meanwhile; earlier ones stay and staff can still reply. A signed-in user is mailed the message and a signed-out sender is not. "Lift" ends one at once.

In the "Issue" panel a Keeper links a request to a GitHub issue on this repository, or clears the link. The field "GitHub Issue" takes an issue link, or a link opened from the project board.`,
    'keeper',
  ),
];

const grants = article(
  12,
  "Keeper and Coven-Creation Grants, and the Primary Keeper's Pause",
  'Who can become a Keeper or create covens, and how the primary Keeper can freeze changes.',
  `Only a Keeper grants or revokes the right to create covens, and only a Keeper makes another Keeper. Accepting an invitation, a printed card, or being made a Keeper or curator turns the right on.

The primary Keeper is the Keeper whose address is the one the site was set up with. Only they can choose "Pause Keeper Changes" or "Resume Keeper Changes". While paused, no other Keeper can grant or revoke the Keeper role, approve or revoke coven creation, or invite a Keeper. The primary Keeper's own changes still pass.`,
  'keeper',
);

const inviteStaff = article(
  13,
  'Inviting a Curator or Keeper',
  'Giving someone a site role.',
  `A site invitation raises a person's role and nothing else. A pause on Keeper changes blocks it.`,
  'keeper',
);

const cards = article(
  14,
  'Minting Printed Cards',
  'Making printed invitation cards.',
  `Choose "Mint Cards". Set the "Number of Sheets" (each sheet holds 10 cards, up to 50 sheets), "Expires On" (90 days from now unless you change it), a "Note" of up to 500 characters, and whether to tick "Print Backs" and "Beta Testers".

Each card's token is shown once, at minting. Only a hash is stored, so a token cannot be shown again. A card seats nobody and grants no role: it lets an account create a coven, once per account.`,
  'keeper',
);

const documentsArticle = article(
  15,
  'Editing Site Documents',
  'Changing the privacy policy, disclaimer, code of ethics and terms.',
  `Keepers edit the site's documents. An edit opens a draft; publishing the draft makes a new version and shows it at once. You can discard a draft, and published versions stay. If someone else has changed the draft since you opened it, your save is refused and the editor shows where it stands now. A document's title and lede can be changed without making a new version.`,
  'keeper',
);

const writingHelp = article(
  16,
  'Writing Help Articles',
  'How help entries are organised.',
  `The help centre holds three kinds of entry: FAQ questions, articles and glossary terms. Each has an audience: public, staff or keeper. An article can have sub pages one level deep, and a sub page's audience is its parent's or narrower. A glossary term is always public and has no position or parent. Each entry's address comes from its title.

The shipped entries are loaded by the seed. It restates an entry nobody has edited to the seed's current text, leaves an entry a person edited as they wrote it, and never brings back one a person deleted. The names glossary, staff and search are reserved and cannot be used as an address.`,
  'keeper',
);

export const STAFF_ARTICLES = [
  curating,
  ...curatingPages,
  vocab,
  queue,
  ...queuePages,
  grants,
  inviteStaff,
  cards,
  documentsArticle,
  writingHelp,
];
