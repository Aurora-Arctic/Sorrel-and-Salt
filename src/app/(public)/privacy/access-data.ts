import type { AccessRole, AccessRow } from '@/components/AccessCards/types';

/** Who may see each kind of data: one row per kind, one cell per role, each cell drawn from the service that enforces it. */
export const PRIVACY_ACCESS_ROWS: AccessRow[] = [
  {
    data: 'Your name and the picture your sign-in provider shared',
    cells: [
      { mark: 'yes', text: 'Yes, for everyone in the coven' },
      { mark: 'yes', text: 'Yes, for everyone in the coven' },
      { mark: 'no', text: 'No: a viewer does not see the list of members' },
      { mark: 'yes', text: 'Yes, as the name beside a compendium edit' },
      { mark: 'yes', text: 'Yes, for every account' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Your email',
    cells: [
      { mark: 'yes', text: 'Yes, for everyone in the coven' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'yes', text: 'Yes, for every account' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Which covens you belong to, and your role in each',
    cells: [
      { mark: 'part', text: 'Only this coven' },
      { mark: 'part', text: 'Only this coven' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'yes', text: 'Yes, by coven name and role' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Your sign-in details: which providers you use, your sessions, the network address and browser they record',
    cells: [
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'part', text: 'Which providers you use, and nothing else' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Your password, passkey and authenticator secrets',
    cells: [
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      {
        mark: 'part',
        text: "Only in a locked form: your password can never be turned back into the original, the authenticator secrets cannot be read without a key kept outside the database, and a passkey's private half never reaches the site",
      },
    ],
  },
  {
    data: "A coven's ingredients and stock",
    cells: [
      { mark: 'yes', text: 'Yes' },
      { mark: 'yes', text: 'Yes' },
      { mark: 'yes', text: 'Yes' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: "A coven's shared spells and workings",
    cells: [
      { mark: 'yes', text: 'Yes' },
      { mark: 'yes', text: 'Yes' },
      { mark: 'yes', text: 'Yes' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'A private spell',
    cells: [
      { mark: 'part', text: 'Only your own' },
      { mark: 'part', text: 'Only your own' },
      { mark: 'part', text: 'Only your own' },
      { mark: 'no', text: 'No' },
      { mark: 'part', text: 'Only their own, in the demo coven' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Your support requests and the replies to them',
    cells: [
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      {
        mark: 'part',
        text: "Only requests an admin marked for curators or assigned to them, without the requestor's email or the coven named in the page address",
      },
      { mark: 'yes', text: 'Yes, with your email' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Which emails about a document change were sent to you, and when',
    cells: [
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'part', text: 'Only how many accounts a mailing has reached, never which' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Who wrote or changed a row, and when',
    cells: [
      { mark: 'yes', text: 'Yes, within the coven' },
      { mark: 'yes', text: 'Yes, within the coven' },
      { mark: 'yes', text: 'Yes, within the coven' },
      { mark: 'yes', text: 'Yes, on the compendium and its lists' },
      { mark: 'yes', text: 'Yes, on accounts and on the compendium' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
];

/** The roles, in column order, each with the short label over its column. */
export const PRIVACY_ACCESS_ROLES: AccessRole[] = [
  { name: 'Coven Owner', short: 'Own' },
  { name: 'Coven Member', short: 'Mem' },
  { name: 'Coven Viewer', short: 'View' },
  { name: 'Site Curator', short: 'Cur' },
  { name: 'Site Admin', short: 'Adm' },
  { name: 'A Developer with Database Access', short: 'Dev' },
];
