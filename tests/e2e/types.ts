/** A mailed message, as a spec reads it. */
export type MailpitMessage = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
};

// Mailpit's REST API answers in its own capitalisation: an address, a search
// hit, and the message a hit's id fetches.
export type Address = { Address: string };
export type Summary = { ID: string };
export type Detail = { From: Address; To: Address[]; Subject: string; Text: string; HTML: string };
