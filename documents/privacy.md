---
key: privacy
title: Privacy Policy
lede: What Sorrel & Salt keeps about you, who processes it, how long it is kept and who can see it.
published: 2026-11-01
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

Every change to a site role or to the right to create covens is also written to a ledger that nobody can edit through the site: who changed it, how, when and any note the admin wrote. The ledger exists so that every change an admin makes to these rights can be clearly tracked, to prevent admin abuse.

### What a Coven Holds

A coven holds its name, its members with their roles and when each joined, its invitations (the invited email, the role offered and any note), its ingredients and their stock, and its grimoire: every spell, its steps and its workings, with who wrote each. A spell marked private is shown only to the person who wrote it. Nobody else in the coven sees it, its owners included, though it is stored in the database. A working can be private too, even on a shared spell: it is shown only to the person who recorded it and to any coven member named on it.

A printed invitation card is bound to no email. When someone opens a card's link and is refused, the attempt is recorded against their account with the reason.

### Support Requests

A support request keeps what you chose to write (its subject and message), the page you sent it from, the error code if you sent it from an error page, its status, who it is assigned to and any replies. A request sent without an account keeps the email you gave so that a reply can reach you. A time-out an admin sets on a requestor is kept as history. Before a request is saved, the page address is cleaned: an invitation code in it is replaced and anything after a "?" is dropped. A curator sees only requests an admin marked for curators or assigned to them, without the requestor's email or the coven named in the page address. An admin sees them with the requestor's email.

## Who Sees It

### Who Can See What

Each line below comes from the rule the site enforces in its services, not from what a screen happens to show. "Coven" means the coven in which you hold that role; every account holds a viewer seat in the demo coven, and every site admin an owner seat there. A developer with database access means a person who can read the database directly. Database access is given to as few developers as possible, and only to those who need it to run the site.

| Kind of Data                                                                                              | Coven Owner                    | Coven Member                   | Coven Viewer                                  | Site Curator                                                                                                                         | Site Admin                                | A Developer with Database Access                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Your name and the picture your sign-in provider shared                                                    | Yes, for everyone in the coven | Yes, for everyone in the coven | No: a viewer does not see the list of members | Yes, as the name beside a compendium edit                                                                                            | Yes, for every account                    | Yes                                                                                                                                                                                                                    |
| Your email                                                                                                | Yes, for everyone in the coven | No                             | No                                            | No                                                                                                                                   | Yes, for every account                    | Yes                                                                                                                                                                                                                    |
| Which covens you belong to, and your role in each                                                         | Only this coven                | Only this coven                | No                                            | No                                                                                                                                   | Yes, by coven name and role               | Yes                                                                                                                                                                                                                    |
| Your sign-in details: which providers you use, your sessions, the network address and browser they record | No                             | No                             | No                                            | No                                                                                                                                   | Which providers you use, and nothing else | Yes                                                                                                                                                                                                                    |
| Your password, passkey and authenticator secrets                                                          | No                             | No                             | No                                            | No                                                                                                                                   | No                                        | Only in a locked form: your password can never be turned back into the original, the authenticator secrets cannot be read without a key kept outside the database, and a passkey's private half never reaches the site |
| A coven's ingredients and stock                                                                           | Yes                            | Yes                            | Yes                                           | No                                                                                                                                   | No                                        | Yes                                                                                                                                                                                                                    |
| A coven's shared spells and workings                                                                      | Yes                            | Yes                            | Yes                                           | No                                                                                                                                   | No                                        | Yes                                                                                                                                                                                                                    |
| A private spell                                                                                           | Only your own                  | Only your own                  | Only your own                                 | No                                                                                                                                   | Only their own, in the demo coven         | Yes                                                                                                                                                                                                                    |
| Your support requests and the replies to them                                                             | No                             | No                             | No                                            | Only requests an admin marked for curators or assigned to them, without the requestor's email or the coven named in the page address | Yes, with your email                      | Yes                                                                                                                                                                                                                    |
| Who wrote or changed a row, and when                                                                      | Yes, within the coven          | Yes, within the coven          | Yes, within the coven                         | Yes, on the compendium and its lists                                                                                                 | Yes, on accounts and on the compendium    | Yes                                                                                                                                                                                                                    |

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

Some rows are removed outright:

- An account that signed in through a provider but never verified its email lapses an hour after its last verification mail, or three hours after it was created, whichever comes first. The next sign-in on the site removes every lapsed account, with its sessions and provider rows.
- A row that only pairs two things, an ingredient with a category or a spell with a category, is removed when the pairing is removed.
- A passkey you remove is removed.
- The counters that slow down repeated sign-in attempts are removed once they are out of date.

### How to Ask for Removal

There is no "delete my account" button yet, and no self-service export. Until those are built, write to the site admins through the [support form](?support=privacy). You can send one without an account. Say what you want erased, and the site's admin will do it and tell you when it is done.

You can leave a coven yourself from the coven's page, and a coven's owner can delete the coven. Both are soft deletes.

## What the Site Does Not Do

- It shows no advertising and runs no tracking script.
- It does not sell, rent or share your data. The services named above handle it only to run the site.

## Changes to This Policy

When the text changes, the date at the top changes with it.
