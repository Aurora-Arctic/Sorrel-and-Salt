import { faq } from './build';

export const FAQ_ENTRIES = [
  faq(
    1,
    'Do I Need an Account to Read the Compendium?',
    "No. The Compendium, the shared reference of ingredients, and each of its entry pages can be read without an account. Your coven's own ingredients and grimoire need an account and a seat in that coven.",
  ),
  faq(
    2,
    'Why Did Signing In Only Give Me the Demo Coven?',
    "The site is invite-gated. Signing in by any method creates an account and gives you an Observer seat in the Demo Coven, which is read-only. A coven of your own, or a seat in someone else's, comes from an invitation, a printed card, or a Keeper granting it.",
  ),
  faq(
    3,
    'How Do I Get My Own Coven?',
    'You need permission to create one. Accepting an invitation, redeeming a printed card, or a Keeper granting it gives you that permission, and only a Keeper takes it away. Once you have it, choose "Create Coven" in the coven switcher.',
  ),
  faq(
    4,
    'Who Can See My Spells?',
    'A private spell is seen by its author alone. A spell shared with the coven is seen by every member, Observers included. Other covens never see either.',
  ),
  faq(
    5,
    "Why Can't a Complete Spell Go Back to Private or Draft?",
    'A complete spell\'s visibility only widens, and it never returns to a draft. To change it, use "Duplicate" to make a private draft copy. Or delete the spell if it should not be there.',
  ),
  faq(
    6,
    'Can I Convert Grams to Millilitres?',
    'No. Conversion works only within one kind of measure: weight to weight, or volume to volume. Grams to millilitres would need the density of each ingredient, and the site holds no such table, so it refuses rather than guessing. Counted units such as pieces, drops and pinches never convert.',
  ),
  faq(
    7,
    "What's the Difference Between the Compendium and My Ingredients?",
    "The Compendium is the shared reference of what exists, curated by the site's Keepers and curators. Ingredients are your coven's own: what you have, with your stock. You can add a Compendium entry to your Ingredients, or make an ingredient of your own.",
  ),
  faq(
    8,
    "Why Can't I Edit a Compendium Entry?",
    'Only curators and Keepers edit the Compendium. You can add your own notes with "Annotate", or choose "Make It Ours" to turn the entry into your coven\'s own ingredient, which you can then edit.',
  ),
  faq(
    9,
    'How Do I Change My Email?',
    "Open your account's email page and enter the new address. We send a confirmation link to it, and your address changes only when that link is used. Your session must be under 24 hours old, so sign in again first if it is not.",
  ),
  faq(
    10,
    "I'm Locked Out of My Password",
    'Five wrong passwords lock password sign-in for a while: 1 minute, then 5, then 15, then 60 minutes each time. Choose "Forgot Password?" to get a reset link, which goes to a verified address and lasts 15 minutes. Signing in with Discord, Google, Microsoft or a passkey is never locked.',
  ),
  faq(
    11,
    'How Do I Leave a Coven?',
    'Open the coven and choose "Leave Coven". You lose access to its ingredients and its grimoire until a Steward invites you back, and your own entries stay with the coven. The last Steward cannot leave: make another member a Steward first, or delete the coven if you are the only member.',
  ),
  faq(
    12,
    'How Do I Ask for Help or Report an Accessibility Bug?',
    'Send a support request. Pick the topic that fits, such as Accessibility ("Something you cannot use or read.") or Bug ("Something is broken or wrong."), give a subject and a message, and choose "Send Request". You can send one without signing in; we reply to the email address you give.',
  ),
];
