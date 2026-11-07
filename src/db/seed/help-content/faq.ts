import { faq } from './build';

export const FAQ_ENTRIES = [
  faq(
    1,
    'Do I Need an Account to Read the Compendium?',
    `No. The [[Compendium]], the shared reference of ingredients, and each of its entry pages can be read without an account. Your [[Coven|coven]]'s own ingredients and [[Grimoire|grimoire]] need an account and a seat in that coven.`,
  ),
  faq(
    2,
    'Why Did Signing In Only Give Me the Demo Coven?',
    `The site is invite-gated. Signing in by any method creates an account and gives you an [[Observer]] seat in the [[Demo Coven]], which is read-only. A [[Coven|coven]] of your own, or a seat in someone else's, comes from an invitation, a printed card, or a [[Keeper]] granting it.`,
  ),
  faq(
    3,
    'How Do I Get My Own Coven?',
    `You need permission to create one. Accepting an invitation, redeeming a printed card, or a [[Keeper]] granting it gives you that permission, and only a Keeper takes it away. Once you have it, choose "Create Coven" in the [[Coven|coven]] switcher.`,
  ),
  faq(
    4,
    'Why Was I Sent to the Terms Page?',
    'You have not yet agreed to the current terms of use. The page at `/account/terms` shows the version and its last updated date, and lists what changed under "Updated Since You Last Agreed". Choose "Agree & Continue" and you go on to where you were headed.',
  ),
  faq(
    5,
    "What's the Difference Between the Compendium and My Ingredients?",
    `The [[Compendium]] is the shared reference of what exists, curated by the site's [[Keeper|Keepers]] and [[Curator|curators]]. Ingredients are your [[Coven|coven]]'s own: what you have, with your stock. You can add a Compendium entry to your Ingredients, or make an ingredient of your own.`,
  ),
  faq(
    6,
    "Why Can't I Edit a Compendium Entry?",
    `Only [[Curator|curators]] and [[Keeper|Keepers]] edit the [[Compendium]]. You can add your own notes with "Annotate", or choose "Make It Ours" to turn the entry into your [[Coven|coven]]'s own ingredient, which you can then edit.`,
  ),
  faq(
    7,
    'Who Can See My Spells?',
    `A private spell is seen by its author alone. A spell shared with the [[Coven|coven]] is seen by every member, [[Observer|Observers]] included. Other covens never see either.`,
  ),
  faq(
    8,
    "Why Can't a Complete Spell Go Back to Private or Draft?",
    'A complete spell\'s visibility only widens, and it never returns to a draft. To change it, use "Duplicate" to make a private draft copy.',
  ),
  faq(
    9,
    'Does My Spell Save Automatically?',
    `Yes. The spell builder saves as you work, and so do the ingredient form and the Annotate form. This is [[Autosave]]. The status beside the form shows "Saving…" and then "Saved <time>". If a save fails it retries, and then offers "Retry".`,
  ),
  faq(
    10,
    'Why Does My Spell Say a Step Is Short?',
    'A step that names an ingredient is checked against your jar. "Not Enough" means the jar holds less than the step needs, "Out" means it is empty, "Units Differ" means the units cannot be compared, and "Low" means the jar is at or below its Low mark. "Steps and Units" lists all six results.',
  ),
  faq(
    11,
    'Can I Convert Grams to Millilitres?',
    'No. Conversion works only within one kind of measure, and grams to millilitres would need a density the site does not hold. "I Cannot Convert a Unit" explains the rules.',
  ),
  faq(
    12,
    'How Do I Change My Email?',
    "Open your account's email page and enter the new address. We send a confirmation link to it, and your address changes only when that link is used.",
  ),
  faq(
    13,
    "I'm Locked Out of My Password",
    'Five wrong passwords lock password sign-in for a while. Choose "Forgot Password?" to get a reset link, which goes to a verified address and lasts 15 minutes. Signing in with Discord, Google, Microsoft or a passkey is never locked.',
  ),
  faq(
    14,
    'Why Is My Access Paused?',
    `A [[Steward]] can [[Pause]] a member's access to one [[Coven|coven]], and a [[Keeper]] can pause an account's access to the site. The page shows when the pause ends, or that it has no end date. You can still ask the coven's Steward, or Support, about it.`,
  ),
  faq(
    15,
    'How Do I Leave a Coven?',
    `Open the [[Coven|coven]] and choose "Leave Coven". You lose access to its ingredients and its [[Grimoire|grimoire]] until a [[Steward]] invites you back. If you are the only Steward, you are asked what happens to the coven first.`,
  ),
  faq(
    16,
    'How Do I Ask for Help or Report an Accessibility Bug?',
    `Send a [[Support Request|support request]]. Pick the topic that fits, such as Accessibility ("Something you cannot use or read.") or Bug ("Something is broken or wrong."), give a subject and a message, and choose "Send Request". You can send one without signing in; we reply to the email address you give.`,
  ),
  faq(
    17,
    'Can I Undo a Change in a Form?',
    'Yes. The spell builder, the ingredient form and the group forms have "Undo" and "Redo" buttons. Ctrl or Cmd with Z undoes, and with Shift redoes. Typing counts as one step until you pause for half a second, and the list keeps 100 steps. "Restore Original" in the Annotate form is a different thing: it puts back the Compendium\'s text.',
  ),
];
