import { article, subPage } from './build';

const gettingStarted = article(
  1,
  'Getting Started',
  'How to sign in, what the Demo Coven is, and how invitations and printed cards bring you into a coven.',
  `Sorrel & Salt is invite-gated. Signing in by any method gives you an account and an [[Observer]] seat in the [[Demo Coven]], and nothing else. The [[Compendium]] is the one part anyone can read without an account.

The sub pages below cover signing in, the Demo Coven, and invitations and printed cards.`,
);
const gettingStartedPages = [
  subPage(
    gettingStarted,
    1,
    'Signing In',
    'The ways to sign in or create an account.',
    `Choose "Sign In" and the panel says "Sign in or create an account." You can use:

- "Continue with Discord", "Continue with Google" or "Continue with Microsoft".
- "Sign In with a Passkey".
- "Continue with Email", then "Sign In with Email" for an existing account or "Create an Account with Email" for a new one.

If you forget a password, choose "Forgot Password?". Passwords are 15 to 128 characters long.

If you have turned on two-factor sign-in, the next step asks for "Code From Your App". You can choose "Use a Backup Code" instead, or "Trust This Device for 30 Days".`,
  ),
  subPage(
    gettingStarted,
    2,
    'The Demo Coven',
    'The shared practice coven every new account is seated in.',
    `The [[Demo Coven]] is a [[Coven|coven]] that exists on every copy of the site and cannot be deleted. Signing up seats you in it as an [[Observer]], so you can read its ingredients and [[Grimoire|grimoire]] but write nothing. It is listed last in your coven switcher.

[[Keeper|Keepers]] hold a [[Steward]] seat there. A Keeper has no access to any other coven's ingredients or grimoire.`,
  ),
  subPage(
    gettingStarted,
    3,
    'Accepting an Invitation or a Printed Card',
    'What an invitation or a printed card does when you use it.',
    `An invitation seats you in a [[Coven|coven]] as an [[Observer]] or a [[Practitioner]]. To accept it, your account's verified email address must match the address the invitation was sent to. Accepting also lets you create covens of your own.

An invitation never lowers a role you already hold. If the link does not work, the page says why: the invitation is invalid, already accepted, declined, revoked or expired, it was sent to a different address, your address is not yet confirmed, or the coven has since been deleted.

A printed card seats you nowhere and grants no role. It lets your account create a coven, once per account. A [[Keeper]] mints cards; see the Keeper pages.`,
  ),
];

const compendium = article(
  2,
  'The Compendium',
  'The shared reference of ingredients, readable by anyone.',
  `The [[Compendium]] is the global reference of what exists, curated by the site's [[Keeper|Keepers]] and [[Curator|curators]]. Its pages are readable without an account. Nothing about any [[Coven|coven]] follows you out of it.

Each entry has a [[Formal Name|formal name]], which identifies it, and may list folk names, a description, safety notes, a toxic mark, correspondences and the sources it rests on. You cannot edit an entry, but you can add it to your coven's Ingredients.`,
);
const compendiumPages = [
  subPage(
    compendium,
    1,
    'Searching and Filtering',
    'How to search the Compendium and narrow the list.',
    `A search needs at least 2 characters. The filter panel can narrow the list by:

- Categories, with "Match" set to All (an entry must be in every chosen category) or Any (in at least one).
- Forms.
- Toxic: Any, Toxic or Not Toxic.
- Source: All, Local or [[Compendium]].
- In Stock, and Low Stock Only.
- In My [[Coven|Covens]].
- Elements, Celestial Bodies, Zodiac and Deities.

Some filters, such as Reviewed, are for [[Curator|curators]] only.`,
  ),
  subPage(
    compendium,
    2,
    'Reading an Entry and Its Sources',
    'What an entry page shows and where its claims come from.',
    `An entry's page shows its [[Formal Name|formal name]], folk names, description, safety notes, correspondences and categories, and each form it comes in as its own [[Variant|variant]] beneath it.

What the [[Compendium]] says, it sources. A source is a reference: a work with a locator pointing to where in it the claim is found. A source can also say what it supports, and the basis of a name.`,
  ),
  subPage(
    compendium,
    3,
    'The Toxic Flag and Safety Notes',
    'How toxicity is marked on an ingredient and on each form.',
    `An ingredient and each of its forms carry safety notes and a toxic flag. A form's flag is its own: a form form-note reads "This form adds only its Toxic mark to what the ingredient says."

The entry page shows toxic if the ingredient or any of its forms is toxic. The Toxic filter keeps an entry flagged on itself or on any live form.`,
  ),
];

const yourCoven = article(
  3,
  'Your Coven',
  'Roles, invitations, and joining or leaving a coven.',
  `A [[Coven|coven]] is a group that shares ingredients and a [[Grimoire|grimoire]]. Every member has one of three roles, shown as [[Steward]], [[Practitioner]] or [[Observer]].`,
);
const yourCovenPages = [
  subPage(
    yourCoven,
    1,
    'Steward, Practitioner and Observer',
    'What each coven role can do.',
    `- **[[Observer]]**: reads ingredients, stock, spells and workings, and the [[Coven|coven]] itself. Writes nothing.
- **[[Practitioner]]**: adds, edits and removes ingredients, spells and workings, reads and updates stock, and sees the other members.
- **[[Steward]]**: everything a Practitioner can do, plus seeing members' email addresses, inviting, changing and removing members, pausing a member, and editing or deleting the coven.

A Steward cannot be paused. A [[Keeper]]'s site role is separate from these.`,
  ),
  subPage(
    yourCoven,
    2,
    'Inviting Someone',
    'How a Steward invites a new member.',
    `A [[Steward]] chooses "Invite", which opens "Invite Someone". Enter their "Email Address", pick a "Role", and choose "Send Invitation".

An invitation grants [[Observer]] or [[Practitioner]] only. A Steward makes someone a Steward afterwards. An invitation lasts seven days, and a second invitation to the same address replaces the pending one. An address that already belongs to a member is refused, and invitations are limited to 20 in 60 minutes.`,
  ),
  subPage(
    yourCoven,
    3,
    'Removing Members and Leaving',
    'How a seat ends, by removal or by leaving.',
    `A [[Steward]] can remove a member. The seat is ended, and the member invited back has the same seat revived. The last Steward cannot be removed.

Any member, a paused one too, can choose "Leave Coven". You lose access to its ingredients and its [[Grimoire|grimoire]] until a Steward invites you back, and your own entries stay with the [[Coven|coven]]. If you are the last Steward, make another member a Steward first. If you are the only member, delete the coven instead.`,
  ),
];

const ingredients = article(
  4,
  'Ingredients',
  "Your coven's own ingredients and stock: what you have.",
  `Ingredients are your [[Coven|coven]]'s own list of what it holds. They come from the [[Compendium]] or are made by you, and each can carry stock.

The sub pages cover adding, forms, stock and filters.`,
);
const ingredientPages = [
  subPage(
    ingredients,
    1,
    'Adding From the Compendium or Making Your Own',
    'The two ways an ingredient joins your list.',
    `Choose "Add Ingredient". The form asks for a classification and a [[Formal Name|formal name]], then folk names, a description, safety notes, a toxic mark, an element, celestial bodies, zodiac signs and categories. It is grouped into Identity, Details & Care, Correspondences, Relations and Sources. Correspondences also holds Colours and Deities, and Relations holds Categories and Substitute Ingredients.

If the formal name matches a [[Compendium]] entry, the form offers "Add to My Ingredients: <name>" so you can hold the shared entry instead of a duplicate.

An entry's menu offers Annotate, Make It Ours, Remove, Edit Stock and Delete Ingredient. "Make It Ours" turns a held Compendium entry into your own.`,
  ),
  subPage(
    ingredients,
    2,
    'Variants and Forms',
    'How one ingredient comes in several forms.',
    `An ingredient's identity is its [[Formal Name|formal name]] alone. Each form it comes in, such as dried or fresh, is a [[Variant|variant]] beneath it. A variant adds to its ingredient and never removes anything from it. A form is plain text, not a choice from a list.

A form can have its own safety notes and toxic mark.`,
  ),
  subPage(
    ingredients,
    3,
    'Stock Levels',
    'How quantity, units and the low-stock badge work.',
    `Each form has one stock jar per [[Coven|coven]]. A jar holds a "Quantity" (which may be blank), a "Unit", a source and an acquired date.

"Low Stock At" sets the amount at or below which the jar is badged Low Stock, and zero turns the badge off. A jar at nothing shows Out of Stock. If you set no threshold, a counted unit defaults to 3, and grams and millilitres to 10 g or 15 ml; a jar without a unit has none.

Units are milligrams, grams, kilograms, ounces and pounds for weight; millilitres, litres, teaspoons, tablespoons, UK and US fluid ounces and cups for volume; and pieces, drops and pinches for counts.`,
  ),
  subPage(
    ingredients,
    4,
    'Folk Names and Category Filters',
    'Finding ingredients by other names and by category.',
    `An ingredient can list folk names. A folk name can replace the displayed name. A folk name is never a unique identifier, so two ingredients may share one.

Ingredients can be listed by category, form, toxic mark and stock.`,
  ),
];

const grimoire = article(
  5,
  'Grimoire',
  "Your coven's spells: what you make.",
  `The [[Grimoire]] is your [[Coven|coven]]'s list of spells. A spell has a title, an intent, a jar description, seal wax, steps, optional timing and notes, and categories.`,
);
const grimoirePages = [
  subPage(
    grimoire,
    1,
    'Building a Spell',
    'The parts of a spell and where each goes.',
    `In the spell builder, fill in "Title", "Intent", "Jar Description" and "Seal Wax". Add steps. Under "When to Work It", pick "Moon Phase" and "Day"; these are suggestions. Add a note under Notes, and assign categories.`,
  ),
  subPage(
    grimoire,
    2,
    'Steps and Units',
    'What a step can hold.',
    `A step is an instruction, an ingredient, or a custom name. A custom name is never added to your Ingredients and adds nothing to a spell's derived categories. A step with an ingredient or a name may carry a quantity and a unit. A spell may use one form in several steps, and steps keep the order you give them.`,
  ),
  subPage(
    grimoire,
    3,
    'Intent Against Derived Categories',
    'The difference between the categories you assign and those your ingredients bring.',
    `Assigned categories are what the spell intends. Derived categories are the ones its ingredients carry. They are different things.

The "Category Match" panel compares them in three rows: Carried (intended and present), Missing (assigned, and nothing in the jar carries it), and Extra (present but not intended). Before there is anything to compare it reads "Nothing to compare yet." or "Assign categories to compare."`,
  ),
  subPage(
    grimoire,
    4,
    'Drafts, Private and Shared',
    'The status and visibility of a spell.',
    `A spell is a draft or complete. It is private, seen by its author alone, or shared with the [[Coven|coven]], seen by every member including [[Observer|Observers]]. A complete spell needs a title.

A complete spell shared with the coven cannot be made private again, and a complete spell cannot go back to a draft. The page says: "Duplicate it to get a private copy you can change, or delete it if it should not be there."`,
  ),
  subPage(
    grimoire,
    5,
    'Duplicating a Spell',
    'Making a private draft copy.',
    `Choose "Duplicate". The copy's title gets " (Copy)", and it is a private draft. The recipe is copied; workings, the revision count and history stay behind. A category that has been deleted is not carried over.`,
  ),
  subPage(
    grimoire,
    6,
    'Quick Look and Preview',
    'Looking at a spell or an ingredient without leaving the list.',
    `The eye on a list opens a quick look: the details in a window over the list. A spell's preview has a "Screen Awake" toggle, with the tips "Keep the Screen from Sleeping" and "Let the Screen Sleep".`,
  ),
  subPage(
    grimoire,
    7,
    'Moon Phase and Day Filters',
    'Finding spells by when they are worked.',
    `The [[Grimoire]] can be filtered by "Moon Phases", "Days of the Week", "Coven Members" and visibility. The moon phases are New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon, Waning Gibbous, Last Quarter, Waning Crescent, Dark Moon, Waxing Moon and Waning Moon. Days start on Monday.

Orders are recently updated, recently created and title.`,
  ),
];

const workings = article(
  6,
  'Workings',
  'Recording that a spell was worked, and taking stock out.',
  `A working is a record that a spell was worked: on a date, by participants, with a note.`,
);
const workingPages = [
  subPage(
    workings,
    1,
    'Recording a Working',
    'How to record that you worked a spell.',
    `On a spell, choose "Record a Working". Set the Date, name the Participants, who must be members of the [[Coven|coven]], and add a Note. A working of a draft spell is refused, and a working cannot be more widely visible than its spell. Nothing leaves your jars until the working is completed.`,
  ),
  subPage(
    workings,
    2,
    'Completing a Working and Taking Stock Out',
    'What completing does to your jars.',
    `Choose "Complete Working". The dialog lists the Deductions to take from your jars, and its fields (Name, Form, Quantity, Unit and "Add to Jar") let you adjust them. The recorder or a named participant can complete it. It is refused if already complete, if the spell is a draft, or if the day is yet to come.

A jar short of stock goes to zero and the shortfall is recorded. If a deduction fails, the working stays a draft and nothing is taken. Deleting a working never puts stock back, and only its recorder can delete it. A completed working's visibility only widens.`,
  ),
];

const account = article(
  7,
  'Account and Security',
  'Passwords, lockout, passkeys, two-factor sign-in and your email.',
  `Your account's "Sign-In" tab has four sections: "Sign-In Methods", "Password", "Two-Factor Sign-In" and "Passkeys". You cannot remove the last way you have to sign in.`,
);
const accountPages = [
  subPage(
    account,
    1,
    'Passwords and Lockout',
    'Password rules, resets and what locks an account.',
    `A password is 15 to 128 characters. Five wrong passwords lock password sign-in for 1 minute, and each following lock lasts 5, 15 and then 60 minutes, which repeats. A quiet 24 hours restarts the count. Provider and passkey sign-in are never locked.

"Forgot Password?" then "Send Reset Link" mails a link that lasts 15 minutes, to a verified address only. Resetting a password signs out your other sessions.`,
  ),
  subPage(
    account,
    2,
    'Passkeys',
    'Signing in without a password.',
    `Under Passkeys, choose "Add a Passkey". You can "Rename" or "Remove" one. Sign in with "Sign In with a Passkey".`,
  ),
  subPage(
    account,
    3,
    'Authenticator App',
    'Two-factor sign-in with a code from an app.',
    `Choose "Turn On Two-Factor" and confirm with "Confirm Your Password". You get a key you can copy ("Copy Key") and ten backup codes, each usable once, which you can "Copy", "Download" or "Print". "Turn Off Two-Factor" turns it off.

Too many wrong codes lock this step for 15 minutes.`,
  ),
  subPage(
    account,
    4,
    'Changing Your Email',
    'How your address changes.',
    `Open "Your Email" and choose "Send Confirmation". Your address changes only when you use the link sent to the new one, which lasts one hour. Your session must be under 24 hours old, and you can ask again after 60 seconds. The old address is sent a notice. A new address that someone else already holds gets the same answer and no mail.`,
  ),
];

const support = article(
  8,
  'Support',
  'How to ask for help and follow a reply.',
  `[[Support Request|Support requests]] go to the site's [[Keeper|Keepers]] and [[Curator|curators]]. [[Observer|Observers]] can send them too.`,
);
const supportPages = [
  subPage(
    support,
    1,
    'Sending a Request and Reading Replies',
    'The request form and where replies arrive.',
    `Both forms ask "What Is This About?", which is required. The signed-in form then asks for the Page, a Subject and a Message. The signed-out form asks your email address ("We reply to this address."), a Subject and a Message. Choose "Send Request". The signed-in form offers Accessibility, Bug, Account & Sign-In, [[Compendium]] Entry, Privacy & Data, Feedback and Question. The signed-out form offers Accessibility, Bug, Account & Sign-In, Privacy & Data and Question.

A reply is read on the support page behind sign-in, and the email only tells you one has arrived. A signed-out sender is mailed the reply whole. Reply with "Your Reply". A reply is at most 4,000 characters. A request you sent while signed out moves to your account once the account has that address verified.`,
  ),
  subPage(
    support,
    2,
    'What the Statuses Mean',
    'The four states of a request.',
    `- **Open**: waiting for us.
- **Waiting on Sender**: we asked you something. Your reply reopens it.
- **Resolved**: answered. You can resolve your own. If you write again it reopens, and otherwise it is closed seven days later.
- **Closed**: finished. A message after that starts a new, linked request.`,
  ),
];

export const PUBLIC_ARTICLES = [
  gettingStarted,
  ...gettingStartedPages,
  compendium,
  ...compendiumPages,
  yourCoven,
  ...yourCovenPages,
  ingredients,
  ...ingredientPages,
  grimoire,
  ...grimoirePages,
  workings,
  ...workingPages,
  account,
  ...accountPages,
  support,
  ...supportPages,
];
