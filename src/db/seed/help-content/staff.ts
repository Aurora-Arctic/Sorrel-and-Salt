import { article, subPage } from './build';

const curating = article(
  10,
  'Curating a Compendium Entry',
  'How curators and Keepers add and correct Compendium entries.',
  `[[Curator|Curators]] and [[Keeper|Keepers]] curate the [[Compendium]], its vocabularies and the site documents, and review [[Support Request|support requests]]. They have no access to any [[Coven|coven]]'s ingredients or [[Grimoire|grimoire]], except the [[Demo Coven]].

A curator can use filters ordinary readers do not see: Reviewed, Hidden, No Refs and No Form, and a sort by how well sourced an entry is.`,
  'staff',
);
const curatingPages = [
  subPage(
    curating,
    1,
    'Source an Entry With References',
    'Attaching the sources an entry rests on.',
    `What the [[Compendium]] says, it sources. In the ingredient form, add a reference to the ingredient or to a form. Each reference has a "Locator", which points to where in the work the claim is found, a "Name Basis" and "Supports". "New Reference" adds a work that is not yet in the list.

Entries with no references show under the No Refs filter.`,
  ),
  subPage(
    curating,
    2,
    'Formal Names, Common Names and Needs-Review',
    'Which names identify an ingredient and which do not.',
    `A [[Formal Name|formal name]] is a unique identifier and a [[Common Name|common name]] never is. An ingredient's identity is its formal name alone, and its folk names are only other names for it.

When the name a source uses cannot be matched to a formal name, do not guess. Mark that name as unresolved and mark the entry file needs-review: an approved file may hold no unresolved name. A needs-review file must end with a "Questions for the Curator" section saying what is to be settled, and the seed writes only approved files, so it waits in the [[Curator|curator]]'s queue (the seed-queue script lists it).

In the [[Compendium]] filters, a curator's "Reviewed" choice has the values Any, Reviewed and Needs Review. Needs Review keeps the entries that have no curator review mark; Reviewed keeps those that have one.`,
  ),
];

const vocab = article(
  11,
  'Vocabularies and Categories',
  'The lists curators keep that the rest of the site draws on.',
  `[[Curator|Curators]] keep the categories, the groups they are filed under, and the other curated lists: astrology, deities and the traditions they belong to, and the values an ingredient's form can take. They are the same for every [[Coven|coven]], so a change shows everywhere.

Deleting a category group moves its categories rather than removing them. A category's slug comes from its own name alone, so renaming a group does not change it. Two items cannot share a slug.`,
  'staff',
);

const queue = article(
  12,
  'Working the Support Queue',
  'How curators and Keepers answer support requests.',
  `Requests appear under [[Support Request|Support Requests]], in a tab per status, and can be filtered by "About", by error number and by sender. A [[Keeper]] sees every request, and a [[Curator|curator]] only those marked "Shared With Curators" or assigned to them. A curator does not see a signed-out sender's address, though a reply still reaches it.

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
    'Time a Sender Out and Link a Request to an Issue',
    'Stopping a sender, and linking a request to a GitHub issue.',
    `A [[Keeper]] can time out a signed-in user, or a signed-out sender's address, until a date or with no end. It needs a note and a message of 500 characters or fewer. The sender cannot send new requests meanwhile; earlier ones stay and staff can still reply. A signed-in user is mailed the message and a signed-out sender is not. "Lift" ends one at once.

In the "Issue" panel a Keeper links a request to a GitHub issue on this repository, or clears the link. The field "GitHub Issue" takes an issue link, or a link opened from the project board.`,
    'keeper',
  ),
];

const grants = article(
  13,
  'Granting Coven Creation or the Keeper Role',
  'Who can become a Keeper or create covens.',
  `Only a [[Keeper]] grants or revokes the right to create [[Coven|covens]], and only a Keeper makes another Keeper. Accepting an invitation, a printed card, or being made a Keeper or [[Curator|curator]] turns the right on. Every change is recorded; see "Read the Privilege Ledger".

While Keeper changes are paused, a Keeper other than the primary Keeper cannot grant or revoke the Keeper role or approve or revoke coven creation. See "Pausing Keeper Changes".`,
  'keeper',
);

const pausingKeeper = article(
  14,
  'Pausing Keeper Changes',
  'How the primary Keeper freezes changes to Keeper roles.',
  `The primary Keeper is the Keeper whose address is the one the site was set up with. Only they can choose "Pause Keeper Changes" or "Resume Keeper Changes". While paused, no other Keeper can grant or revoke the Keeper role, approve or revoke coven creation, invite a Keeper, or [[Pause|pause]] a Keeper's access. The primary Keeper's own changes still pass.`,
  'keeper',
);

const inviteStaff = article(
  15,
  'Inviting a Curator or Keeper',
  'Giving someone a site role.',
  `Accepting a site invitation raises the person's role to [[Curator|curator]] or [[Keeper]], never lowers it, and turns on their right to create [[Coven|covens]]. A Keeper also gets a [[Steward]] seat in the [[Demo Coven]]. While Keeper changes are paused, the invitation cannot be accepted until they are resumed.`,
  'keeper',
);

const cards = article(
  16,
  'Minting Printed Cards',
  'Making printed invitation cards.',
  `Choose "Mint Cards". Set the "Number of Sheets" (each sheet holds 10 cards, up to 50 sheets), "Expires On" (90 days from now unless you change it), a "Note" of up to 500 characters, and whether to tick "Print Backs" and "Beta Testers".

Each card's token is shown once, at minting. Only a hash is stored, so a token cannot be shown again. A card seats nobody and grants no role: it lets an account create a [[Coven|coven]], once per account.`,
  'keeper',
);
const cardPages = [
  subPage(
    cards,
    1,
    'Read Card Sign-Ups',
    'Who has accepted a printed card.',
    `Open Card Sign-Ups in the Keepers area. "Filter Card Sign-Ups" searches by "Name, Email or Batch". The columns are Name, Email, Accepted On, Batch, Beta and Covens Owned, which reads "None yet" for an account that has made no coven. Choose "Download CSV" to save the list as \`card-sign-ups.csv\`.`,
    'keeper',
  ),
];

const businessCards = article(
  17,
  'Make Your Business Cards',
  'Printing your own business cards from the Keepers area.',
  `Open Business Cards in the Keepers area. It makes a Letter sheet of ten business cards with your name, email and phone. Fill in "Name", "Email" and "Phone", all required. The switch "Include Backs" adds the backs. Choose "Generate".

The PDF is built in your browser and nothing you type is saved. The file is named \`business-cards-\`, then your name made into a slug, then \`.pdf\`, and the page says "Saved as <file>." If it fails, it says "The PDF could not be built. Try again."`,
  'keeper',
);

const documentsArticle = article(
  18,
  'Editing Site Documents',
  'Changing the privacy policy, disclaimer, code of ethics and terms.',
  `[[Keeper|Keepers]] edit the site's documents. An edit opens a draft; publishing the draft makes a new version and shows it at once. You can discard a draft, and published versions stay. If someone else has changed the draft since you opened it, your save is refused and the editor shows where it stands now. A document's title and lede can be changed without making a new version.`,
  'keeper',
);

const documentPages = [
  subPage(
    documentsArticle,
    1,
    'Mail a New Version to Every Account',
    'Telling every account that a document changed.',
    `Open Documents in the Keepers area. There are tabs for Terms of Use, Disclaimer, Code of Ethics, Privacy Policy and "Email Updates". The "Email Every Account" panel lists the documents under "Changed since the last email", and the number of accounts and days.

Each changed document needs a "Summary of the <document>": what changed in that version, in your words. Every account reads it in the email. Choose "Send Emails" to confirm. Each account may be asked to agree again at its next visit.

A mailing pauses when the mail provider's monthly allowance is used, and "Resume Mailing" restarts it. A "Last Email" heading shows how far the last mailing got.`,
    'keeper',
  ),
];

const writingHelp = article(
  19,
  'Writing Help Articles',
  'How a Keeper adds, edits and deletes help entries.',
  `Only a [[Keeper]] writes help. Open Help in the Keepers area. A [[Curator|curator]] reads staff help and writes none of it.

The page lists every help entry you can read, whatever its kind or audience, from A to Z by title, 25 to a page. Use "Prev" and "Next" to move between pages. The columns are Title, Kind, Audience and Position; a glossary term has no audience, and an entry with no position leaves that cell empty. Choose "Add Help Article" to add an entry, or the edit link on a row to change one. Either opens a form over the list.

The help centre holds three kinds of entry: FAQ questions, articles and glossary terms. An article can have sub pages one level deep. A sub page cannot have sub pages of its own.

To delete an entry, choose Delete in its form and confirm. Deleting an article that still has sub pages is refused, and the form shows why: delete or move the sub pages first.

A save changes the public pages at once. The shipped entries are loaded by the seed. It restates an entry nobody has edited to the seed's current text, leaves an entry a person edited as they wrote it, and never brings back one that has been deleted.`,
  'keeper',
);
const writingHelpPages = [
  subPage(
    writingHelp,
    1,
    'The Help Article Form',
    'The fields of the form and what each one does.',
    `The form has these fields:

- "Kind": FAQ, Article or Term. You choose it when adding. It cannot be changed afterwards, so the field is disabled when editing.
- "Title": required.
- "Slug": the last part of the entry's address. Leave it empty and it comes from the title. See Slugs and Addresses.
- "Summary": a short line. Articles show it beside their link.
- "Body": required, written in Markdown. A region named "Preview" under it shows the body as it will read, and raw HTML in a body appears as plain text.
- "Parent": an article only. See Audiences, Parents and Sub Pages.
- "Audience": every kind except a term. Public, Staff or [[Keeper]].
- "Position": every kind except a term. A whole number, which sets the entry's place in the public FAQ and in the list of articles. Entries with no position come last.

To give a word a tooltip that explains it, mark it in the body as \`[[Term]]\`, or as \`[[Term|shown text]]\` to show other words, such as a plural. The part before the bar must be the title or address of a glossary term, in any case. Readers see the shown text as a link to the glossary with a tooltip. Marks do nothing in a heading, a link or code, and the preview shows them as typed. A save that marks a term the glossary does not hold is refused on "Body", naming the term, so add the term first.

The save button is named for the kind: "Save FAQ Entry", "Save Article" or "Save Term". A refusal from the server is shown on the field it concerns; the form stays open so you can correct it. If you cancel after changing a field, the form asks before it discards your changes.`,
  ),
  subPage(
    writingHelp,
    2,
    'Audiences, Parents and Sub Pages',
    'Who can read an entry, and how a sub page relates to its parent.',
    `An entry's audience says who can read it: Public means anyone, Staff means [[Curator|curators]] and [[Keeper|Keepers]], and Keeper means Keepers alone.

A glossary term is always public. Its form has no Audience, Parent or Position field, and the server refuses a term with any of them.

An FAQ question has an audience and a position, but no parent. Only an article can have a parent, chosen in "Parent". The choices are "No Parent" and every other top-level article. An article that has sub pages of its own cannot become a sub page, and an article cannot be its own parent.

A sub page's audience is its parent's or narrower, in the order Public, Staff, Keeper. Once you choose a parent, the Audience field offers only that parent's audience and the narrower ones, and if the audience you had set is wider than the parent's it is raised to the parent's. The server refuses a wider one too. The rule also runs the other way: you cannot narrow a parent below one of its sub pages.`,
  ),
  subPage(
    writingHelp,
    3,
    'Slugs and Addresses',
    'How an entry gets its address, and which slugs are taken.',
    `An entry's slug is the last part of its address. If you leave "Slug" empty when adding, the slug is made from the title. A slug you type is run through the same process, so it is lower case, with words joined by hyphens and other punctuation dropped. When you change a title, the slug stays as it was, because a link may hold it; only a slug you change in the form moves it.

A slug must hold a letter or a number. It must also be unique within its kind: no two FAQ questions share one, no two terms share one, and no two articles share one, a sub page included. An FAQ question and an article may share a slug. The form shows "Another article holds that slug" and its like on the Slug field.

The names glossary, staff and search are reserved, since each is a page beneath /help. The form refuses them on the Slug field.

The address comes from the kind, the audience and the parent:

- A public article is at /help/ then its slug; a public sub page is at /help/ then its parent's slug, a slash and its own.
- A staff or [[Keeper]] article is at /help/staff/ then its slug, and its sub pages beneath it in the same way.
- An FAQ question is an anchor on the page of its audience: /help for a Public question and /help/staff for a Staff or Keeper one.
- A glossary term is an anchor on /help/glossary.

Opening a sub page at its top-level address redirects to the address beneath its parent.`,
  ),
  subPage(
    writingHelp,
    4,
    'Who Reads What',
    'The reach of each kind of reader.',
    `A signed-out reader and any signed-in user who is not staff reads Public entries. A [[Curator|curator]] reads Public and Staff entries, and a [[Keeper]] reads all three. A curator reads staff help at /help/staff, which lists the Staff and Keeper entries. A curator is not shown a Keeper entry, even by its address.

Search shows a reader only the entries that reader may read, so a Staff entry never appears in a public search. See "Search the Help Centre" for how it ranks.

The search page is not indexed by search engines, and neither are the pages of Staff help.`,
  ),
];

const pauseUser = article(
  20,
  "Pause a User's Access",
  'Stopping an account from using the site for a while.',
  `Open Users in the Keepers area, open the user, and find the "Site Access" section. A [[Pause|pause]] needs a note, seen by staff only, and a "Message to User". Each is required and up to 500 characters. Choose how long it lasts, then confirm. The toasts read "Access paused." and "Pause lifted."

The primary [[Keeper]], yourself, and stand-in accounts cannot be paused. A user who is already paused must be lifted first. Setting a pause ends every session of the user. While Keeper changes are paused, a Keeper other than the primary Keeper cannot pause a Keeper.

A paused user sees "Access Paused". The rest of the site reopens after the end, or once a Keeper lifts the pause if there is no end date. Support stays reachable, and the [[Compendium]] stays open to everyone.`,
  'keeper',
);

const ledger = article(
  21,
  'Read the Privilege Ledger',
  'The record of who was granted or lost a site privilege.',
  `Open Privilege Changes in the Keepers area, which only a [[Keeper]] can read. "Filter Privilege Changes" searches by "Name or Email" and by "Privilege": Keeper, Curator or Coven Creation.

The columns are When, User, Privilege, Change (Granted or Revoked), How (Seeded, By an admin, Invitation accepted, Card accepted or Manual fix), Changed By and Note.`,
  'keeper',
);

export const STAFF_ARTICLES = [
  curating,
  ...curatingPages,
  vocab,
  queue,
  ...queuePages,
  grants,
  pausingKeeper,
  inviteStaff,
  cards,
  ...cardPages,
  businessCards,
  documentsArticle,
  ...documentPages,
  writingHelp,
  ...writingHelpPages,
  pauseUser,
  ledger,
];
