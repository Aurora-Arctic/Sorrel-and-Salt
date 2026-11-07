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
  `Accepting a site invitation raises the person's role to curator or Keeper, never lowers it, and turns on their right to create covens. A Keeper also gets a Steward seat in the Demo Coven. While Keeper changes are paused, the invitation cannot be accepted until they are resumed.`,
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
  'How a Keeper adds, edits and deletes help entries.',
  `Only a Keeper writes help. Open Help in the Keepers area. A curator reads staff help and writes none of it.

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
- "Audience": every kind except a term. Public, Staff or Keeper.
- "Position": every kind except a term. A whole number, which sets the entry's place in the public FAQ and in the list of articles. Entries with no position come last.

The save button is named for the kind: "Save FAQ Entry", "Save Article" or "Save Term". A refusal from the server is shown on the field it concerns; the form stays open so you can correct it. If you cancel after changing a field, the form asks before it discards your changes.`,
  ),
  subPage(
    writingHelp,
    2,
    'Audiences, Parents and Sub Pages',
    'Who can read an entry, and how a sub page relates to its parent.',
    `An entry's audience says who can read it: Public means anyone, Staff means curators and Keepers, and Keeper means Keepers alone.

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
- A staff or Keeper article is at /help/staff/ then its slug, and its sub pages beneath it in the same way.
- An FAQ question is an anchor on the page of its audience: /help for a Public question and /help/staff for a Staff or Keeper one.
- A glossary term is an anchor on /help/glossary.

Opening a sub page at its top-level address redirects to the address beneath its parent.`,
  ),
  subPage(
    writingHelp,
    4,
    'Who Reads What, and How Search Finds It',
    'The reach of each kind of reader, and how the help search ranks.',
    `A signed-out reader and any signed-in user who is not staff reads Public entries. A curator reads Public and Staff entries, and a Keeper reads all three. A curator reads staff help at /help/staff, which lists the Staff and Keeper entries. A curator is not shown a Keeper entry, even by its address.

The search is at /help/search and takes a query in "q". A blank query finds nothing. It looks in the title, the summary and the body, and a match in the title ranks above one in the summary, which ranks above one in the body. If no entry matches the words, it falls back to titles close to what was typed, so a misspelt title still finds its page. Search shows a reader only the entries that reader may read, so a Staff entry never appears in a public search.

A search page is not indexed by search engines, and the pages of Staff help are not either.`,
  ),
];

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
  ...writingHelpPages,
];
