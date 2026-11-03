---
key: privacy
title: Privacy Policy
lede: What Sorrel & Salt keeps about you, who processes it, how long it is kept and who can see it.
published: 2026-11-03
---

## The Short Version

- The site keeps only what it needs to sign you in and to run your covens.
- It shows no advertising and sells nothing about you.
- It sets cookies only for signing in: the one that keeps you signed in, and one that remembers which sign-in method you used last. Your light or dark theme is kept in your own browser, not sent to the site.
- What you delete is marked deleted rather than erased. To have something erased, ask through the [support form](?support=privacy).
- Who can see what is set out at the end, one card per kind of data, role by role.

## What Is Stored

### Your Account

Signing in creates an account holding your name, your email, whether that email is verified, and a link to the picture your sign-in provider shared (if it shared one).

Your email changes only when you verify the new one. Until then the old email stays, and the new one appears only in the verification link the site sends.

### How You Sign In

- **A provider** (Discord, Google, Microsoft or Facebook): the site keeps the provider's name, your id with that provider, and the tokens and permission scope the provider issues to the site.
- **A password:** the site keeps a locked form of it, which can never be turned back into the password, and never the password itself.
- **A passkey:** the site keeps the key's public half, its name, the kind of device it lives on, whether it is backed up and a counter. The private half never leaves your device.
- **An authenticator app:** the site keeps the shared secret and your backup codes in a locked form.

### Your Sessions

Each time you sign in, session info is stored: this includes the network address (IP address) you came from and the browser details your browser sent. The site stores these with every session, for security purposes. No screen shows them to anyone. A session stops working when it expires.

### Rate-Limit Counters

To slow down malicious actors, the sign-in routes count requests by network address and route. A support request sent without an account is counted by network address and by email for twenty-four hours.

### Who Wrote What

Nearly every row carries four stamps: who created it and when, and who last changed it and when. A row that is deleted gains two more: who deleted it and when. These stamps are how the site shows "edited by" names.

Every change to a site role or to the right to create covens is also written to a ledger that nobody can edit through the site: who changed it, how, when and any note the keeper wrote. The ledger exists so that every change a keeper makes to these rights can be clearly tracked, to prevent admin abuse.

### What a Coven Holds

A coven holds its name, its members with their roles and when each joined, its invitations (the invited email, the role offered and any note), its ingredients and their stock, and its grimoire: every spell, its steps and its workings, with who wrote each. A spell marked private is shown only to the person who wrote it. Nobody else in the coven sees it, its stewards included, though it is stored in the database. A working can be private too, even on a shared spell: it is shown only to the person who recorded it and to any coven member named on it.

A printed invitation card is bound to no email. When someone opens a card's link and is refused, the attempt is recorded against their account with the reason.

### Support Requests

A support request keeps what you chose to write (its subject and message), the page you sent it from, the error code if you sent it from an error page, its status, who it is assigned to and any replies. A request sent without an account keeps the email you gave so that a reply can reach you. A time-out a keeper sets on a requestor is kept as history. Before a request is saved, the page address is cleaned: an invitation code in it is replaced and anything after a "?" is dropped. A curator sees only requests a keeper marked for curators or assigned to them, without the requestor's email or the coven named in the page address. A keeper sees them with the requestor's email.

### Time-Outs and Pauses

When a keeper times you out of support, pauses your access to the site, or a coven steward pauses your access to their coven, a record is kept about you. It holds the end date if there is one, who set it, the note they wrote, and the message they wrote to you, where they wrote one. You are emailed once when one is set, at the address on your account. The email carries the message and the end date, never the note, which only staff or the coven's stewards see. Lifting one sends no email.

### Emails About Document Changes

When a keeper emails every account about a change to a site document, a record is kept for each account the mailing goes to. It holds which mailing it belongs to, your account's id, and the time your email went out, with the usual stamps of who created and last changed it. It does not hold your email address or the email's text: the address is read from your account at the moment the email is sent. No screen shows these records to anyone. A keeper sees only how many accounts a mailing has reached.

## Who Sees It

### Who Can See What

Each line below comes from the rule the site enforces in its services, not from what a screen happens to show. "Coven" means the coven in which you hold that role; every account holds an observer seat in the demo coven, and every site keeper a steward seat there. A developer with database access means a person who can read the database directly. Database access is given to as few developers as possible, and only to those who need it to run the site.

{access-cards}

### Who Processes It

The site runs on other companies' services. Each one handles some of your data to do its job, and none is given it for any other purpose.

| Service                              | What It Does                             | What It Handles                                                                                                        |
| ------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Vercel                               | Hosts the site and runs its code         | Every request, including your network address, and the server's logs, which carry an error reference when a page fails |
| Neon                                 | Holds the database                       | Everything listed under "What Is Stored"                                                                               |
| Resend                               | Sends the site's mail                    | Your email and the mail's text: verification links, invitations, notices                                               |
| Discord, Google, Microsoft, Facebook | Sign you in, when you choose one of them | They learn that you signed in to Sorrel & Salt, and hand the site your name, email and picture                         |

## Keeping and Removing It

### How Long It Is Kept

Most tables use a soft delete: a deleted row is marked with who deleted it and when, and the site stops showing it, but the row stays in the database. So today, "deleted" does not mean "erased". This applies to covens and their memberships, ingredients, spells and support replies alike.

It works this way for two reasons: a spell keeps showing what went into it even after one of those ingredients is deleted, and a later version of the site can offer to bring back something deleted by mistake. That second feature does not exist yet.

A support request closes by itself seven days after it is resolved. Twelve months after it closes, a job that runs once a day anonymises it, within a day: its subject is replaced with “Anonymised support request.”, its message, page address and the text of every reply are emptied, and the email and account it was sent from are removed from it. Its topic, status and dates are kept, so the site can still count requests by topic and month.

Some rows are removed outright:

- An account that signed in through a provider but never verified its email lapses an hour after its last verification mail, or three hours after it was created, whichever comes first. A background job started at sign-up removes the account, with its sessions and provider rows, once it lapses, and a daily check removes any lapsed account that job missed.
- A row that only pairs two things, an ingredient with a category or a spell with a category, is removed when the pairing is removed.
- A passkey you remove is removed.
- The counters that slow down repeated sign-in attempts are removed once they are out of date.

The record that an email about a document change was sent to you is kept indefinitely. Nothing deletes or anonymises it. It goes only if your account row is removed outright, which today happens only to the unverified accounts above, and those are never emailed.

### How to Ask for Removal

There is no "delete my account" button yet, and no self-service export. Until those are built, write to the site keepers through the [support form](?support=privacy). You can send one without an account. Say what you want erased, and the site's admin will do it and tell you when it is done.

You can leave a coven yourself from the coven's page, and a coven's steward can delete the coven. Both are soft deletes.

## What the Site Does Not Do

- It shows no advertising and runs no tracking script.
- It does not sell, rent or share your data. The services named above handle it only to run the site.

## Changes to This Policy

When the text changes, the date at the top changes with it.

A keeper may also email every account about a change once it is published. Nothing is sent on its own: a keeper chooses whether a change is worth an email, so a small fix may not bring one. The email goes to the verified address on your account. It names the document, says in a line the admin writes what changed, and links to the page; it does not carry the text. When the terms change, it also says you will be asked to agree to them the next time you visit. You cannot turn these emails off. A paused account is still emailed; a deleted one is not.
