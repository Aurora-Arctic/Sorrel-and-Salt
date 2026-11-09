/**
 * The words a reader may use that an entry's text does not, by the entry's seed key: a synonym or a plainer word, so the search
 * finds the entry for a question phrased in them. Indexed beside the summary. A keeper edits them in the Help editor.
 */
export const SEARCH_TERMS: Record<string, string> = {
  'article/troubleshooting/i-cannot-sign-in':
    "can't can cannot unable fail failed refused login log in locked out",
  'article/troubleshooting/my-invitation-link-does-not-work':
    'group join joining broken expired invalid',
  'article/the-compendium/the-toxic-flag-and-safety-notes':
    'poisonous poison poisonous danger dangerous harmful unsafe',
  'article/grimoire/duplicate-a-spell': 'copy copies clone make a copy',
  'article/your-coven/invite-someone': 'invitation add new member person join someone coven',
  'article/your-coven/remove-a-member-or-leave': 'leave leaving quit join joined exit remove kick',
  'article/your-coven/pause-and-lift-a-members-access':
    'stop block suspend disable login log in temporarily restore',
  'article/account-and-security/passwords-and-lockout':
    'reset forgot forget change recover locked out',
  'faq/who-can-see-my-spells': 'write written author share visible visibility',
  'article/curating-a-compendium-entry/formal-names-common-names-and-needs-review':
    'scientific latin botanical name unsure doubt',
};
