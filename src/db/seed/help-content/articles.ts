import { guide, subPage } from './build';

const gettingStarted = guide(
  1,
  'Getting Started',
  'How to sign in, what the Demo Coven is, and how invitations and printed cards bring you into a coven.',
  `Sorrel & Salt is invite-gated. Signing in by any method gives you an account and an [[Observer]] seat in the [[Demo Coven]], and nothing else. The [[Compendium]] is the one store of entries anyone can read without an account; this help, Support and the site's documents are open too.

The sub pages below cover signing in, the Demo Coven, accepting an invitation, redeeming a printed card and searching this help. If something is not working, the Troubleshooting section lists the usual causes.`,
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
    'Accept an Invitation',
    'How to accept an invitation sent to your email address.',
    `An [[Invitation|invitation]] seats you in a [[Coven|coven]] as an [[Observer]] or a [[Practitioner]]. It is mailed to an address, and your account's verified email address must match that address. Accepting also lets you create covens of your own.

Open the link in the email, sign in if the page asks you to, and choose "Accept Invitation". You can also accept from your account page: its "Invitations" section lists "Your Invitations" with "Accept" and "Decline" on each row, and "Decline" asks you to confirm in "Decline Invitation".

An invitation lasts seven days, and it never lowers a role you already hold. If the link does not work, the page says why. "My Invitation Link Does Not Work", in Troubleshooting, lists each reason and what to do.`,
  ),
  subPage(
    gettingStarted,
    4,
    'Redeem a Printed Card',
    'What a printed card does and how to use it.',
    `A printed card is handed to you by a [[Keeper]]. It carries a link and a QR code. Unlike an [[Invitation|invitation]], it is tied to no email address and seats you in no [[Coven|coven]], and it grants no role. What it does is let your account create a coven, once per account.

Open the link, or scan the QR code, and sign in if asked. When the card is accepted you land on the "Create Coven" page with the note "Your card is accepted: you can now start a coven." and you will be the coven's [[Steward]]. See "Create a Coven" for the next step.

A card you have already used says so and points you to your account to start a coven. If you have already used one card, a second is refused and stays free for someone else. A card that is not valid, has been withdrawn or has expired is refused too, and the page says which. "My Invitation Link Does Not Work" gives the wording.`,
  ),
  subPage(
    gettingStarted,
    5,
    'Search the Help Centre',
    'How to find a help page by what it says.',
    `Type in the "Search Help" box and choose "Search". The results page is titled "Search Help". A blank search finds nothing.

You can type a whole question. The search finds a page that has any of your words, and puts a page that has all of them first. A match in the title ranks above a match in the summary, and a match in the summary ranks above one in the body. If no page matches the words, it falls back to titles close to what you typed, so a misspelt title still finds its page.

You are shown only the pages you may read. Pages for [[Curator|curators]] and [[Keeper|Keepers]] never appear in a public search. Search engines do not index the results page.`,
  ),
];

const compendium = guide(
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
    'Search and Filter the Compendium',
    'How to search the Compendium and narrow the list.',
    `A search needs at least 2 characters. The filter panel can narrow the list by:

- Categories, with "Match" set to All (an entry must be in every chosen [[Category|category]]) or Any (in at least one).
- Forms.
- Toxic: Any, Toxic or Not Toxic.
- Source: All, Local or [[Compendium]].
- In Stock, and Low Stock Only.
- "In My Covens", which keeps the entries your [[Coven|covens]] hold.
- Elements, Celestial Bodies, Zodiac and Deities.

Some filters, such as Reviewed, are for [[Curator|curators]] only.`,
  ),
  subPage(
    compendium,
    2,
    'Read an Entry and Its Sources',
    'What an entry page shows and where its claims come from.',
    `An entry's page shows its [[Formal Name|formal name]], folk names, description, safety notes, correspondences and categories, and each form it comes in as its own [[Variant|variant]] beneath it.

What the [[Compendium]] says, it sources. A source is a [[Reference|reference]]: a work with a locator pointing to where in it the claim is found. A reference can also say what it supports, and the basis of a name.

![The Rosemary entry page in the Compendium, signed out, showing its formal name, a Reviewed By Curator mark, its description, correspondences, folk names and categories, its two forms, Herb and Oil, with a caution on the oil, and its references](/help/screens/compendium-entry.png "An entry page, read without signing in.")`,
  ),
  subPage(
    compendium,
    3,
    'The Toxic Flag and Safety Notes',
    'How toxicity is marked on an ingredient and on each form.',
    `An ingredient and each of its forms carry safety notes and a toxic flag. A form's flag is its own: a form's note reads "This form adds only its Toxic mark to what the ingredient says."

> **Take Care:** The entry page shows toxic if the ingredient or any of its forms is toxic.

The Toxic filter keeps an entry flagged on itself or on any live form.`,
  ),
];

const yourCoven = guide(
  3,
  'Your Coven',
  'Roles, invitations, pauses, and joining, leaving or deleting a coven.',
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
- **[[Steward]]**: everything a Practitioner can do, plus seeing members' email addresses, renaming the coven, inviting, changing and removing members, pausing a member, and deleting the coven.

The table shows each thing a role may do, from the rules the app checks:

::widget[role-permission-table]

A Steward renames a coven in the "Rename Coven" section of its page. The address follows the new name, and the old address still opens the coven. The [[Demo Coven]] cannot be renamed. A Steward cannot be paused. A [[Keeper]]'s site role is separate from these.`,
  ),
  subPage(
    yourCoven,
    2,
    'Create a Coven',
    'How to start a coven of your own.',
    `Starting a [[Coven|coven]] needs permission. You get it by accepting an [[Invitation|invitation]], by redeeming a printed card, or when a [[Keeper]] grants it. Only a Keeper takes it away, and covens you already made stay.

With permission, choose "Create Coven" in the coven switcher. The page says "Start a coven of your own. You will be its steward." Enter a "Name" and choose "Create Coven". You become the coven's [[Steward]].

Without permission, the page says: "Creating a coven needs an invitation from someone already using Sorrel & Salt, or a keeper's approval."`,
  ),
  subPage(
    yourCoven,
    3,
    'Invite Someone',
    'How a Steward invites a new member.',
    `A [[Steward]] chooses "Invite", which opens "Invite Someone". Enter their "Email Address", pick a "Role", and choose "Send Invitation".

An [[Invitation|invitation]] grants [[Observer]] or [[Practitioner]] only. A Steward makes someone a Steward afterwards. An invitation lasts seven days, and a second invitation to the same address replaces the pending one. An address that already belongs to a member is refused, and invitations are limited to 20 in 60 minutes.`,
  ),
  subPage(
    yourCoven,
    4,
    "Pause and Lift a Member's Access",
    "How a Steward stops a member's access for a while, and restores it.",
    `A [[Pause|pause]] keeps a member's place in the [[Coven|coven]] but stops them opening it or changing anything in it until the pause ends. Only a [[Steward]] pauses a member, and a Steward's own access cannot be paused.

Open the member and find the "Coven Access" section. Choose "Pause Access", then pick how long: 1 Day, 1 Week, 1 Month, Until a Date, or No End Date. A date must be in the future. You can add a note, seen by the coven's Stewards only, and a message to the member that is emailed to them. Each is up to 500 characters. If the email fails, the pause still stands.

While a pause stands, a second pause is refused. Choose "Lift Pause" and confirm with "Lift" to restore access sooner.

A paused member who opens the coven sees "Access Paused" with the time it ends, or a note that it has no end date. They can still ask the coven's Steward, or Support, about it, choose "Leave Coven", or open their other covens from "Your Other Covens".`,
  ),
  subPage(
    yourCoven,
    5,
    'Remove a Member or Leave',
    'How a seat ends, by removal or by leaving.',
    `A [[Steward]] can remove a member: choose "Remove" on the member, then confirm in "Remove Member". The seat is ended. If the member is invited back, the same seat is revived with the role on the new invitation. The last Steward cannot be removed.

Any member, a [[Pause|paused]] one too, can choose "Leave Coven" and confirm. The page says: "You lose access to its ingredients and its grimoire until a steward invites you back." Your own entries stay with the [[Coven|coven]].

If you are the only Steward and other members remain, leaving opens a choice titled "What Happens to the Coven?". Choose "Hand It to" a member you pick under "New Steward", and "Promote and Leave" makes them a Steward first, then you leave. That is two steps: if the leave fails, you stay and the coven has two Stewards. The other choice is "Delete Coven". If you are the only member, delete the coven instead of leaving it.`,
  ),
  subPage(
    yourCoven,
    6,
    'Delete a Coven',
    'What deleting a coven does and who can do it.',
    `Only a [[Steward]] can delete a [[Coven|coven]]. Open the coven and find the "Delete Coven" section.

> **Take Care:** Once deleted, the coven becomes inaccessible to every member, Stewards included. The page warns: "Nothing is destroyed, but only an administrator with database access can restore it."

The [[Demo Coven]] cannot be deleted.`,
  ),
];

const ingredients = guide(
  4,
  'Ingredients',
  "Your coven's own ingredients and stock: what you have.",
  `Ingredients are your [[Coven|coven]]'s own list of what it holds. They come from the [[Compendium]] or are made by you, and each can carry stock.

The sub pages cover adding, forms, stock, finding ingredients, and annotating a Compendium entry. Adding and changing here needs a Practitioner or Steward seat; an Observer reads only.`,
);
const ingredientPages = [
  subPage(
    ingredients,
    1,
    'Add an Ingredient',
    'The two ways an ingredient joins your list.',
    `Choose "Add Ingredient". The form asks for a classification and a [[Formal Name|formal name]], then folk names, a description, safety notes, a toxic mark, an element, celestial bodies, zodiac signs and categories. It is grouped into Identity, Details & Care, Correspondences, Relations and Sources. Correspondences also holds Colours and Deities, and Relations holds Categories and Substitute Ingredients.

If the formal name matches a [[Compendium]] entry, the form offers "Add to My Ingredients: <name>" so you can hold the shared entry instead of a duplicate.

The form saves itself as you work; see "Your Spell Saves Itself" for how that works.`,
  ),
  subPage(
    ingredients,
    2,
    'Variants and Forms',
    'How one ingredient comes in several forms.',
    `An ingredient's identity is its [[Formal Name|formal name]] alone. Each form it comes in, such as dried or fresh, is a [[Variant|variant]] beneath it. A variant adds to its ingredient and never removes anything from it. A form is typed as text. The field suggests from the list curators keep, and from your own coven's forms, but you can type a form that is on neither.

A form can have its own safety notes and toxic mark.

An ingredient can also list folk names. A folk name can replace the displayed name, and it is never a unique identifier, so two ingredients may share one.`,
  ),
  subPage(
    ingredients,
    3,
    'Track Stock',
    'How quantity, units and the low-stock badge work.',
    `Each form has one stock jar per [[Coven|coven]]. A jar holds a "Quantity" (which may be blank), a "Unit" and a "Low Stock At" level. A Practitioner or Steward chooses "Edit Stock" on an ingredient to change it.

"Low Stock At" sets the amount at or below which the jar is badged Low Stock, and zero turns the badge off. A jar at zero shows Out of Stock; a jar with no quantity shows no badge. If you set no threshold, a counted unit defaults to 3, and grams and millilitres to 10 g or 15 ml; a jar without a unit has none.

Units are milligrams, grams, kilograms, ounces and pounds for weight; millilitres, litres, teaspoons, tablespoons, UK and US fluid ounces and cups for volume; and pieces, drops and pinches for counts. Changing the unit keeps the numbers as typed. It does not convert them.`,
  ),
  subPage(
    ingredients,
    4,
    'Find Ingredients',
    'Finding ingredients by name, category and stock.',
    `Use "Filter Ingredients" to narrow your list by category, form, toxic mark and stock.`,
  ),
  subPage(
    ingredients,
    5,
    'Annotate an Entry or Make It Ours',
    'Changing how your coven sees a Compendium entry.',
    `A [[Compendium]] entry your [[Coven|coven]] holds has a menu with Edit Stock, Annotate, Make It Ours and Remove. Only a Practitioner or Steward sees these; an Observer reads only.

**Annotate** opens a form with seven fields: Label, Description, Safety Notes, Elements, and lists of celestial bodies, zodiac signs and colours. Each field has "Restore Original" to go back to the Compendium's text. The Label stands in for the Compendium's name on your pages, and a label must be unlike every other label and every ingredient name in your coven. The form saves itself as you work.

**Make It Ours** asks "Make <name> your coven's own?" and explains: "You get a copy with your annotations. Your jars and spells move to the copy. Updates in the Compendium won't affect it." Choose "Make It Ours" to confirm.`,
  ),
];

const grimoire = guide(
  5,
  'Grimoire',
  "Your coven's spells: what you make.",
  `The [[Grimoire]] is your [[Coven|coven]]'s list of spells. A spell has a title, an intent, a jar description, seal wax, steps, optional timing and notes, and categories. Writing here needs a Practitioner or Steward seat; an Observer reads only.`,
);
const grimoirePages = [
  subPage(
    grimoire,
    1,
    'Build a Spell',
    'The parts of a spell and where each goes.',
    `In the spell builder, fill in "Title", "Intent", "Jar Description" and "Seal Wax". Add steps. Under "When to Work It", pick "Moon Phase" and "Day"; these are suggestions. Add a note under Notes, and assign categories.

![The spell builder open on a draft spell, Hearth Protection Jar, with every section open and three steps: Rosemary, Bay Laurel and Selenite](/help/screens/spell-builder.png "The spell builder, every section open.")`,
  ),
  subPage(
    grimoire,
    2,
    'Steps and Units',
    'What a step can hold, and what the stock marks mean.',
    `A step is an instruction, an ingredient, or a custom name. A custom name is never added to your Ingredients and adds nothing to a spell's derived categories. A step with an ingredient or a name may carry a quantity and a unit. A spell may use one form in several steps, and steps keep the order you give them.

A step that names an ingredient is checked against your jars. There are six results:

- **Out**: "The jar is empty, so there is nothing to put in."
- **Not Enough**: "The jar holds less than this step needs."
- **Units Differ**: "The units don't match, so it can't tell if you have enough."
- **Low**: "The jar is at or below the coven's Low mark."
- **One-Off**: "Used in this spell only; not kept in your cupboard."
- **No jar**: the ingredient has no jar, and the "In the Cupboard" panel says you have no jar.

A form used in several steps is judged on the sum of its steps. Units are converted only within one dimension, so a weight cannot be set against a volume or a count. The marks also show on the spell's recipe page.`,
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

> **Take Care:** A complete spell shared with the coven cannot be made private again, and a complete spell cannot go back to a draft.

The page says: "Duplicate it to get a private copy you can change, or delete it if it should not be there."`,
  ),
  subPage(
    grimoire,
    5,
    'Duplicate a Spell',
    'Making a private draft copy.',
    `A Practitioner or Steward can choose "Duplicate". The copy's title gets " (Copy)", and it is a private draft. The recipe is copied; workings, the revision count and history stay behind. A category that has been deleted is not carried over.`,
  ),
  subPage(
    grimoire,
    6,
    'Find and Preview Spells',
    'Filtering the Grimoire, the Drafts list, and the spell preview.',
    `The [[Grimoire]] has two tabs, Spells and Drafts. The Drafts tab lists draft spells.

"Filter the Grimoire" narrows the list by "Moon Phases", "Days of the Week", "Coven Members" and visibility. The moon phases are New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon, Waning Gibbous, Last Quarter, Waning Crescent, Dark Moon, Waxing Moon and Waning Moon. Days start on Monday. The list shows the most recently updated spells first.

On a spell's page, the preview has a "Screen Awake" toggle, with the tips "Keep the Screen from Sleeping" and "Let the Screen Sleep".`,
  ),
  subPage(
    grimoire,
    7,
    'Your Spell Saves Itself',
    'How autosave works and what its messages mean.',
    `The spell builder, the ingredient form and the Annotate form each save as you work. This is [[Autosave]].

A save starts 3 seconds after your last change, and at most 30 seconds into a long run of changes. It also saves when the tab is hidden or focus leaves the form. A copy is kept in your browser until the server confirms the save, and the browser asks before the tab closes with an unsaved change.

The status shows "Saving…", then "Saved <time>", or "Draft saved <time>" for a draft. If a save fails it tries again after 2, 5 and 15 seconds. After that it stops at "Could not save." with "Retry". If someone else changed the same thing first, you can choose "Reload Latest" or "Keep My Version". Each state looks like this:

::widget[autosave-status]

The spell builder saves first when you choose Close, and it never sends a blank new instruction.`,
  ),
];

const workings = guide(
  6,
  'Workings',
  'Recording that a spell was worked, and taking stock out.',
  `A working is a record that a spell was worked: on a date, by participants, with a note. Recording and completing one needs a Practitioner or Steward seat; an Observer reads only.`,
);
const workingPages = [
  subPage(
    workings,
    1,
    'Record a Working',
    'How to record that you worked a spell.',
    `A Practitioner or Steward chooses "Record a Working" on a spell. Set the Date, name the Participants, who must be members of the [[Coven|coven]], and add a Note. A working of a draft spell is refused, and a working cannot be more widely visible than its spell: a private spell's working cannot be shared until the spell is. Nothing leaves your jars until the working is completed.`,
  ),
  subPage(
    workings,
    2,
    'Complete a Working and Take Stock Out',
    'What completing does to your jars.',
    `A Practitioner or Steward chooses "Complete Working". The dialog lists the Deductions it will take from your jars: for each, how much it takes, how much the jar holds and what is left. To change a jar first, choose its "Edit Stock". The summary says "Completing takes nothing from the jars for N ingredient(s)." for any ingredient it skips. It skips one when the units differ, the jar has no amount, the step has no amount, the ingredient is not in stock, or it is a one-off ingredient.

The recorder or a named participant can complete it. A jar short of stock goes to zero and the shortfall is recorded. If a deduction fails, the working stays a draft and nothing is taken. Deleting a working never puts stock back, and only its recorder can delete it. A completed working's visibility only widens.`,
  ),
];

const account = guide(
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
    `A password is 15 to 128 characters, and a password known from a data breach is refused. Five wrong passwords lock password sign-in for 1 minute, and each following lock lasts 5, 15 and then 60 minutes, which repeats. A quiet 24 hours restarts the count. While locked, even the right password is refused. Provider and passkey sign-in are never locked.

"Forgot Password?" then "Send Reset Link" mails a link that lasts 15 minutes, to a verified address only. Resetting a password signs out every session, so you sign in again afterwards.`,
  ),
  subPage(
    account,
    2,
    'Sign-In Methods',
    'The ways you can sign in, and how to add or remove one.',
    `The "Sign-In Methods" section lists a row for each provider, with "Add" or "Remove". "Remove" opens "Remove Sign-In Method" to confirm. There are also rows for Password ("Set Password" or "Manage Password") and Passkeys ("Manage Passkeys"). You cannot remove the last way you have to sign in: its Remove is greyed with a reason.

Under Passkeys, choose "Add a Passkey". You can "Rename" or "Remove" one. Sign in with "Sign In with a Passkey".`,
  ),
  subPage(
    account,
    3,
    'Turn On Two-Factor Sign-In',
    'Two-factor sign-in with a code from an app.',
    `Choose "Turn On Two-Factor" and confirm with "Confirm Your Password". You get a key you can copy ("Copy Key") and ten backup codes, each usable once, which you can "Copy", "Download" or "Print". The codes are shown once. "Turn Off Two-Factor" turns it off.

Two-factor guards password sign-ins only. An account with no password is told to "Set a Password" first. Too many wrong codes lock this step for 15 minutes.`,
  ),
  subPage(
    account,
    4,
    'Change Your Email',
    'How your address changes.',
    `Open "Your Email" and choose "Send Confirmation". Your address changes only when you use the link sent to the new one, which lasts one hour. Your session must be under 24 hours old, and you can ask again after 60 seconds. The old address is sent a notice. A new address that someone else already holds gets the same answer and no mail.`,
  ),
];

const support = guide(
  8,
  'Support',
  'How to ask for help and follow a reply.',
  `[[Support Request|Support requests]] go to the site's [[Keeper|Keepers]] and [[Curator|curators]]. [[Observer|Observers]] can send them too.`,
);
const supportPages = [
  subPage(
    support,
    1,
    'Send a Support Request',
    'The request form.',
    `Both forms ask "What Is This About?", which is required. The signed-in form then asks for the Page, a Subject and a Message. The signed-out form asks your email address ("We reply to this address."), a Subject and a Message. Choose "Send Request". The signed-in form offers Accessibility, Bug, Account & Sign-In, [[Compendium]] Entry, Privacy & Data, Feedback and Question. The signed-out form offers Accessibility, Bug, Account & Sign-In, Privacy & Data and Question.

A request you sent while signed out moves to your account once the account has that address verified.`,
  ),
  subPage(
    support,
    2,
    'Read and Answer a Reply',
    'Following a request while signed in.',
    `A reply is read on the support page behind sign-in, and the email only tells you one has arrived. Staff replies are tagged "Staff" and your own "You".

Write under "Your Reply" and choose "Reply". Choose "Resolve" if your question is answered. A request that has been timed out cannot be replied to. A closed request shows "This request is closed." with "Open Your Follow-Up", or tells you to write a new request from Support.`,
  ),
  subPage(
    support,
    3,
    'Read a Reply Without Signing In',
    'Following a request sent while signed out.',
    `The email only tells you a reply has arrived. Open the link in it to read the reply at \`/support/request\`. Only the newest link works, and it lasts 30 days. A closed request no longer opens.

Write under "Your Reply", up to 4,000 characters, and choose "Reply". A client takes 60 reads a day, and a request takes 5 replies a day.`,
  ),
  subPage(
    support,
    4,
    'What the Statuses Mean',
    'The four states of a request.',
    `- **Open**: waiting for us.
- **Waiting on Sender**: we asked you something. Your reply reopens it.
- **Resolved**: answered. You can resolve your own. If you write again it reopens, and otherwise it is closed seven days later.
- **Closed**: finished. A message after that starts a new, linked request.`,
  ),
];

const troubleshooting = guide(
  9,
  'Troubleshooting',
  'Causes and fixes for the most common problems.',
  `Each page here starts from what you see and lists the usual causes. If none fits, send a [[Support Request|support request]].`,
);
const troubleshootingPages = [
  subPage(
    troubleshooting,
    1,
    'I Cannot Sign In',
    'Why a sign-in is refused.',
    `- A password sign-in that fails five times locks for 1 minute, then 5, 15 and 60 minutes. While locked, even the right password is refused. A passkey or provider sign-in still works. See "Passwords and Lockout".
- A password under 15 characters, or one known from a data breach, is refused when you set it.
- If you turned on two-factor sign-in, the next step asks for "Code From Your App". Choose "Use a Backup Code" if you have lost the app.
- A provider button is greyed when this copy of the site has no credentials for it. Use another method.`,
  ),
  subPage(
    troubleshooting,
    2,
    'My Invitation Link Does Not Work',
    'The reason each refusal gives and what to do.',
    `The page tells you the reason. Each reason, and what to do about it:

::widget[invitation-refusals]

The reason "Keeper changes are paused" applies to invitations from a [[Keeper]] only.`,
  ),
  subPage(
    troubleshooting,
    3,
    'I Cannot Complete a Working',
    'Why "Complete Working" is refused.',
    `- "A working can't be completed before its day."
- "This working is already complete."
- The spell is a draft: "A spell takes workings once the spell is complete."
- Only the person who recorded a working, or someone named on it, can change it. Only its recorder can delete it.
- A private spell's working cannot be shared with the coven: "Share the spell first."
- A participant must be a member of the coven: "Choose a member of this coven".`,
  ),
  subPage(
    troubleshooting,
    4,
    'I Cannot Convert a Unit',
    'Why a conversion is refused.',
    `Conversion works within one dimension only: weight to weight, or volume to volume. A weight cannot become a volume, because no table of densities exists. A count (pieces, drops and pinches) cannot be converted at all. The refusal is given as a result, never a guess. Try a conversion here; it uses the same rule as the app:

::widget[unit-converter]

Within volume, a teaspoon is 5 ml, a tablespoon is 15 ml and a cup is 250 ml. Changing the unit on a jar keeps the numbers as typed and does not convert them.`,
  ),
  subPage(
    troubleshooting,
    5,
    'I Cannot Remove or Leave',
    'Why a seat cannot end.',
    `- "This is the last steward, and a coven needs one. Make another member a steward first."
- "You are the only member. Delete the coven instead of leaving it."
- Removing someone who is not in the coven says "That person is not a member of this coven".

If you are the only Steward, "Leave Coven" opens "What Happens to the Coven?" to hand it to another member or delete it. See "Remove a Member or Leave".`,
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
  troubleshooting,
  ...troubleshootingPages,
];
