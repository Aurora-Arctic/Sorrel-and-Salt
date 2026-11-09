# Promotional email consent

What the law and the mailbox providers require before a site sends promotional email, which mails Sorrel & Salt sends today and how each is classed, and the consent mechanism decided on. The decision is in [`design-decisions/support.md`](../design-decisions/support.md#promotional-email-needs-recorded-consent-withdrawn-in-one-click). The mail the site sends is listed in [`email.md`](../email.md), "What is sent".

**The short answer.** Every mail the site sends today is transactional (it confirms something the reader did, carries security information, or reports a change to the reader's own account). No mail sent today needs consent. The site sends no promotional mail, and none is planned. This document scopes the consent the site must hold before the first one.

**How to read the sources.** Each claim carries its URL and the date it was fetched, 2026-11-07. Fetch tools summarise a page through a small model, so a quotation is as the tool returned it and was not checked against the page text. Two sites refused every fetch with HTTP 403: `ico.org.uk` (the UK regulator) and `crtc.gc.ca` (the Canadian regulator). A claim that rests on a search-result summary of one of those pages is marked **(search summary)**. A statement that is the researcher's own reading is marked **(own reading)**. A statement no source was found for is marked **(unsourced)**. The gaps are collected in "Gaps" at the end.

Nothing here is legal advice, and nothing was taken from memory.

## Terms used

- **Transactional mail** is mail whose main purpose is to complete something the reader asked for, to carry security or account information, or to report a change to an account the reader already holds.
- **Promotional mail** (also called commercial, marketing or advertising mail) is mail whose main purpose is to advertise or promote something. Different laws use different words for it; "Classification" below says which test decides it.
- **Consent** is the reader's own act of agreeing to receive promotional mail.
- **Opt-in** means the sender needs the reader's agreement first. **Opt-out** means the sender may send until the reader says stop.
- **Double opt-in** means the sender mails the reader a confirmation link after the first agreement and counts consent only once the link is followed.
- **Soft opt-in** is a UK exemption that lets a business market its own similar products to people who bought from it, without fresh consent.

## The law, by regime

The site is invite-only, but the people invited can live anywhere. Billing is for the United States only, but sign-in is open to anyone invited, so the regimes of other countries can still reach a user. The site does not record where a user lives.

### United States: CAN-SPAM

CAN-SPAM is the federal law on commercial email.

- **Opt-out, not opt-in.** The FTC guide frames commercial email around the reader's right to opt out. On members it says "you don't need to get members' consent to send them marketing emails." The guide states no general opt-in requirement. [https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business, fetched 2026-11-07]
- **The primary-purpose test.** "What matters is the 'primary purpose' of the message." A message with only commercial content is commercial. A message with only transactional or relationship content is transactional. [same FTC URL, fetched 2026-11-07]
- **A mixed message** (transactional content plus promotion) is commercial if the subject line would lead the reader to think it is a commercial message, or if the bulk of the transactional part does not appear at the beginning. The FTC's example is a message with the subject "Your Account Statement" and promotion first, which is "most likely a commercial message." [same FTC URL, fetched 2026-11-07] The regulation says the same: a message is commercial if the subject line would likely lead a reasonable recipient to expect a commercial ad, or if the transactional content does not appear "in whole or in substantial part, at the beginning of the body." [16 CFR 316.3(a), https://www.law.cornell.edu/cfr/text/16/316.3, fetched 2026-11-07]
- **The five transactional or relationship categories** (16 CFR 316.3(c) and the FTC guide list the same five). The FTC adds "the law views these categories narrowly." [https://www.law.cornell.edu/cfr/text/16/316.3 and the FTC URL above, fetched 2026-11-07]
  1. Facilitate, complete or confirm a transaction the reader agreed to.
  2. Warranty, recall, safety or security information.
  3. For an ongoing account, membership or subscription: changed terms or features, a change in standing, or periodic statements.
  4. Employment or benefits information.
  5. Delivery of goods or services the reader is entitled to.
- **A promotional footer on a transactional mail.** Neither source mentions a footer by name. By the two tests above, a transactional message whose subject is not promotional and whose transactional content comes first stays transactional. This is the researcher's reading of the tests **(own reading)**. Nothing fetched says a footer alone changes a mail's status.
- **What a commercial message must carry:**
  - An unsubscribe mechanism that works for at least 30 days after sending. Requests are honoured within 10 business days. The sender cannot charge a fee or ask for more than an email address, and "can't sell or transfer their email addresses." A message without an unsubscribe link is allowed only if its primary purpose is transactional or relationship. [FTC URL, fetched 2026-11-07]
  - A postal address: "Your message must include your valid physical postal address." A PO box or a registered private mailbox qualifies. [FTC URL, fetched 2026-11-07]
  - Honest headers and subject: "Don't use false or misleading header information." "Don't use deceptive subject lines." [FTC URL, fetched 2026-11-07]
  - A clear and conspicuous statement that it is an advertisement. [FTC URL, fetched 2026-11-07]
  - An opt-out menu is allowed, "but you must include the option to stop all marketing messages from you." [FTC URL, fetched 2026-11-07]
- **Penalty.** "Each separate email in violation of the CAN-SPAM Act is subject to penalties of up to $53,088." [FTC URL, fetched 2026-11-07]

### United States: Washington State

- **What RCW 19.190.020 bars.** Commercial email sent from a computer in Washington, or to an address the sender knows or has reason to know belongs to a Washington resident, that uses a third party's domain name without permission, misrepresents or obscures its origin or transmission path, or has a subject line with "false or misleading information." [https://app.leg.wa.gov/RCW/default.aspx?cite=19.190.020, fetched 2026-11-07]
- **No consent rule.** The text of .020 has no opt-in or recipient-consent element. [same URL, fetched 2026-11-07] The only consent-based rules seen in the chapter, RCW 19.190.060 and .070, cover commercial text messages, not email. [https://app.leg.wa.gov/RCW/default.aspx?cite=19.190&full=true, fetched 2026-11-07]
- **Consequence.** A violation is a violation of the consumer protection act (RCW 19.190.030). The reader's damages are "$100, or actual damages, whichever is greater" (.040). [https://app.leg.wa.gov/RCW/default.aspx?cite=19.190&full=true, fetched 2026-11-07]
- **Preemption.** 15 USC 7707(b)(1) says CAN-SPAM "supersedes any statute, regulation, or rule of a State." The exception covers rules that prohibit falsity or deception in any portion of a commercial email. Laws not specific to email, such as trespass, contract or tort, are not preempted. [https://www.law.cornell.edu/uscode/text/15/7707, fetched 2026-11-07]
- **Whether .020 survives preemption** is the researcher's reading, not a sourced conclusion: its two prohibitions are about a misleading origin and misleading subject lines, which fall inside the falsity exception **(own reading)**. No court or agency source was found.
- **The 2026 amendment** to .020 (2026 c 135) applies to causes of action begun on or after June 11, 2026. What it changed was not determined **(unsourced)**. [https://app.leg.wa.gov/RCW/default.aspx?cite=19.190.020, fetched 2026-11-07]

### United Kingdom: PECR and the ICO

PECR is the Privacy and Electronic Communications Regulations 2003, the UK law on electronic marketing. The ICO is the Information Commissioner's Office, the UK regulator.

- **Prior consent.** Regulation 22(2) bars sending or instigating unsolicited direct marketing email to an individual subscriber unless they have previously notified the sender that they consent. [https://www.legislation.gov.uk/uksi/2003/2426/regulation/22, fetched 2026-11-07]
- **The soft opt-in** (regulation 22(3)) needs all three of: the sender got the contact details "in the course of" a sale or negotiations for a sale to the reader; the marketing is for the sender's "similar products and services only"; and the reader was offered a simple, free way to refuse, both when the details were collected and in each later message. [same URL, fetched 2026-11-07]
- **Charities only.** The Data (Use and Access) Act 2025 added regulation 22(3A), a soft opt-in for charities. It took effect on 5 February 2026 (S.I. 2026/82) and does not help a commercial site. [same URL, fetched 2026-11-07]
- **Penalty.** The Act's section 115 amends the PECR enforcement regime and came into force on 5 February 2026; the section text does not state the amounts. [https://www.legislation.gov.uk/ukpga/2025/18/section/115, fetched 2026-11-07] The ICO's own statement, copied on a news aggregator and not on ico.org.uk, says the Act gives it power to "issue fines of up to £17.5 million or 4% of global turnover" under PECR. [https://www.wired-gov.net/wg/news.nsf/articles/Statement+on+the+commencement+of+the+Data+Use+and+Access+Act+DUAA+06022026102000, fetched 2026-11-07] A law-firm summary says the earlier cap was £500,000; that is a secondary source and was not opened. [https://www.lewissilkin.com/insights/2026/02/09/uk-data-reform-becomes-reality-what-this-means-for-you-and-what-you-need-to-do-n-102mh5x, search summary, 2026-11-07]
- **What counts as direct marketing (search summary).** PECR defines it as advertising or marketing material directed to particular individuals. A "service message" is information-only and cannot carry anything promotional; if it does, even as a secondary element, it counts as direct marketing. A logo or branding alone is unlikely to make a message marketing. [https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/identify-direct-marketing/, search summary, 2026-11-07]
- **How consent is given (search summary).** The reader must take a positive action. Pre-ticked boxes, silence and inactivity are not valid. Unticked opt-in boxes are the recommended method. Consent must name the sender and cover the type of message; a general "direct marketing" request is not specific or informed. [https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/, search summary, 2026-11-07]
- **The soft opt-in and a free account (search summary).** The ICO says negotiations can include signing up to a free trial, requesting a quote or asking for details. Merely browsing a site is not enough. The details must come directly from the person. The opt-out must be offered when the details are collected, and an opt-out in an order-confirmation email is not enough. [same how-do-we-comply URL, search summary, 2026-11-07] Whether a free account with no sale or negotiation qualifies is **(unsourced)**. The researcher's inference, **(own reading)**: invited users who never bought anything or negotiated a sale probably do not qualify, so the site relies on consent and not on the soft opt-in.
- **Records (search summary).** The ICO says to keep a record of consent, "eg who, when, how", so the sender can show it is valid. The "what they were told" element was not in what was retrieved. [https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/, search summary, 2026-11-07]
- **Not found (unsourced):** the ICO's position on whether newsletters and service or news messages are direct marketing, and the ICO's position on consent bundled with terms of service.

### European Union: GDPR, the EDPB and ePrivacy

GDPR is the General Data Protection Regulation. The EDPB is the European Data Protection Board, which publishes guidelines on it. The ePrivacy Directive is the EU rule on electronic communications. The EU text was read; the UK GDPR text was not.

- **What consent is.** Article 4(11): "any freely given, specific, informed and unambiguous indication" given "by a statement or by a clear affirmative action". [https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679, fetched 2026-11-07]
- **Article 7.** The controller (the party that decides why and how data is used) "shall be able to demonstrate" consent. A request inside a written declaration must be "clearly distinguishable". "It shall be as easy to withdraw as to give consent." Article 7(4) says utmost account is taken of whether a service is "conditional on consent". [same URL, fetched 2026-11-07]
- **Recital 32:** "Silence, pre-ticked boxes or inactivity should not therefore constitute consent." [same URL, fetched 2026-11-07]
- **Right to object.** Article 21(2)-(3): where data is processed for direct marketing, the person may object, and after an objection the data "shall no longer be processed for such purposes". [same URL, fetched 2026-11-07]
- **Reach.** Article 3(2): the Regulation applies to processing of data of people in the Union where it relates to "the offering of goods or services, irrespective of whether a payment of the data subject is required", or to monitoring their behaviour in the Union. A free account offered to people in the EU falls within the wording. Whether an invite-only site "offers" services to the EU is a legal judgement **(unsourced)**. [same URL, fetched 2026-11-07]
- **Representative.** Article 27: where Article 3(2) applies, the controller must designate in writing a representative in the Union, with exemptions for occasional processing that is not large-scale and is unlikely to pose a risk, and for public authorities. [same URL, fetched 2026-11-07] The UK equivalent was not verified **(unsourced)**.
- **EDPB Guidelines 05/2020 on consent (v1.1)** [https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf, fetched 2026-11-07]:
  - Granularity, paragraph 44: "the solution to comply with the conditions for valid consent lies in granularity, i.e. the separation of these purposes and obtaining consent for each purpose". Example 7 says one request that covers email marketing and sharing with group companies is invalid.
  - Unbundling, paragraph 13: "If consent is bundled up as a non-negotiable part of terms and conditions it is presumed not to have been freely given."
  - Records, paragraph 108: the controller "may keep a record of consent statements received, so he can show how consent was obtained, when consent was obtained and the information provided to the data subject at the time".
  - Refreshing, paragraph 111: "The EDPB recommends as a best practice that consent should be refreshed at appropriate intervals."
  - Withdrawal, paragraph 114: where consent was given with one click, swipe or keystroke, people "must, in practice, be able to withdraw that consent equally as easily".
  - Pre-ticked boxes, paragraph 79 and following: "The use of pre-ticked opt-in boxes is invalid under the GDPR."
- **ePrivacy Directive 2002/58/EC, Article 13.** Email marketing "may only be allowed in respect of subscribers who have given their prior consent" (13(1)). A business that obtained a customer's address "in the context of the sale of a product or a service" may market its own similar products, if customers can object free of charge when the details are collected and in each message (13(2); the fetch tool paraphrased this paragraph). Email marketing that disguises or conceals the sender's identity, or has no valid address for opting out, is prohibited (13(4)). [https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32002L0058, fetched 2026-11-07]

### Canada: CASL

CASL is Canada's Anti-Spam Legislation (S.C. 2010, c. 23). It is the strictest of the four regimes on the points below.

- **Consent first.** Section 6(1) bars sending a commercial electronic message unless the reader consented. Section 6(2) requires the message to identify the sender, give contact information and include an unsubscribe mechanism. [https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-1.html, fetched 2026-11-07]
- **Asking for consent.** Section 10(1): the person asking must set out clearly and simply the purposes and who is asking, plus any prescribed information. Implied consent (section 10(9)) is limited to an existing business or non-business relationship, a published or disclosed address, or cases set by regulation. [https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-2.html, fetched 2026-11-07]
- **What a consent request contains.** SOR/2012-36 section 4: consent is sought separately for each act under sections 6 to 8 of the Act, and the request includes the requester's business name, the mailing address plus a phone number, email address or web address, and "a statement indicating that the person whose consent is sought can withdraw their consent". [https://laws-lois.justice.gc.ca/eng/regulations/SOR-2012-36/FullText.html, fetched 2026-11-07]
- **Pre-checked boxes (search summary).** The CRTC (the Canadian regulator) treats pre-checked boxes as opt-out, and express consent cannot be obtained through opt-out mechanisms (Bulletin 2012-549). Bulletin 2012-548 requires a proactively checked separate box for each of sections 6 to 8. A CRTC FAQ page says express consent must be opt-in. [https://crtc.gc.ca/eng/archive/2012/2012-549.htm; https://crtc.gc.ca/eng/archive/2012/2012-548.htm; https://crtc.gc.ca/eng/com500/faq500.htm, all search summaries, 2026-11-07]
- **Unsubscribe.** The mechanism must be free and valid for at least 60 days after the message is sent (section 11(2)). The request must be honoured "no later than 10 business days" (section 11(3)). [https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-2.html, fetched 2026-11-07]
- **Proof.** Section 13: a person claiming consent "has the onus of proving it." [same URL, fetched 2026-11-07] The Government of Canada site says "senders should be ready to provide proof of this consent." [https://fightspam-combattrelepourriel.ised-isde.canada.ca/site/canada-anti-spam-legislation/en/getting-consent-send-email, fetched 2026-11-07]
- **Foreign senders.** Section 12(1): section 6 applies where "a computer system located in Canada is used to send or access the electronic message". On the statute's wording, a US sender who emails a Canadian who opens it in Canada is caught. [https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-2.html, fetched 2026-11-07] The regulation's exemption for messages to listed foreign states was not sourced beyond a mention in search results **(unsourced)**.
- **Penalty.** Section 20(4): up to C$1,000,000 for an individual and C$10,000,000 for any other person, per violation. [https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-3.html, fetched 2026-11-07]

## Mailbox-provider rules

Mailbox providers set their own rules for senders, whatever the law says. A site that breaks them has its mail filtered or refused.

- **RFC 8058** (one-click unsubscribe) [https://www.rfc-editor.org/rfc/rfc8058, fetched 2026-11-07]:
  - The sender includes one `List-Unsubscribe` header with an HTTPS address (other kinds, such as `mailto:`, are allowed too) and one `List-Unsubscribe-Post` header holding a single key and value. The literal text of that pair was not in the fetch, so it is not quoted here **(unsourced)**.
  - "The List-Unsubscribe and List-Unsubscribe-Post headers MUST be covered by the signature" (DKIM, the sender's cryptographic signature on the mail). Without it, receivers should not offer one-click unsubscribe.
  - "The POST request MUST NOT include cookies, HTTP authorization, or any other context information." The sender "MUST NOT return an HTTPS redirect."
  - The fetch tool's summary says the process must work without manual intervention and without a confirmation page. No verbatim quotation was seen, so treat that wording as unverified.
- **RFC 2369** (the older header): "The List-Unsubscribe field describes the command (preferably using mail) to directly unsubscribe the user." Values are comma-separated, angle-bracket-enclosed addresses, ordered by preference. [https://www.rfc-editor.org/rfc/rfc2369, fetched 2026-11-07]
- **Gmail: who counts as bulk.** "A bulk sender is any email sender that sends close to 5,000 messages or more to personal Gmail accounts" within a 24-hour period. "Senders who meet the above criteria at least once are permanently considered bulk senders." [https://support.google.com/a/answer/14229414, fetched 2026-11-07]
- **Gmail: authentication.** All senders need SPF or DKIM. Bulk senders need SPF, DKIM and DMARC. [https://support.google.com/a/answer/81126, fetched 2026-11-07]
- **Gmail: one-click.** "One-click unsubscribe is required only for marketing and promotional messages." "Transactional messages are excluded from this requirement." The examples given are password resets, reservation confirmations and form submission confirmations. Gmail requires the RFC 8058 POST method, and `mailto:` does not meet it. [https://support.google.com/a/answer/14229414, fetched 2026-11-07]
- **Gmail: time to process.** Google "recommend[s] that you fulfill unsubscribe requests within 48 hours". That is a recommendation. [same URL, fetched 2026-11-07]
- **Gmail: spam rate.** Keep it "below 0.10%" in Postmaster Tools, and "avoid ever reaching a spam rate of 0.30% or higher." [https://support.google.com/a/answer/81126, fetched 2026-11-07]
- **Gmail: enforcement.** "Starting November 2025, Gmail is ramping up its enforcement on non-compliant traffic." Failing messages "will experience disruptions." Nothing dated 2026 was found. [https://support.google.com/a/answer/14229414, fetched 2026-11-07]
- **Yahoo.** Bulk senders must implement SPF and DKIM, "Publish a valid DMARC policy with at least p=none - DMARC must pass", "Honor unsubscribes within 2 days" and "Keep your spam rate below 0.3%." The unsubscribe header must support one-click "for marketing and subscribed messages"; the RFC 8058 POST is highly recommended and `mailto:` is acceptable. [https://senders.yahooinc.com/best-practices/, fetched 2026-11-07] The page does not say whether transactional mail is covered **(unsourced)**.

## Double opt-in

- **No law found requires it.** The texts read say: CAN-SPAM needs no consent (FTC guide); PECR regulation 22 needs prior consent only; GDPR Article 7 needs only that the controller can demonstrate consent; ePrivacy Article 13 needs prior consent only; CASL section 13 puts the burden of proof on the sender. The EDPB guidelines extracted show no mention of double opt-in or confirmation emails, and paragraph 108 allows a record of consent statements as the proof. No source says in words that it is "not required"; this is a finding of absence. [sources as in the sections above, all fetched 2026-11-07]
- **It is industry best practice.** M3AAWG (the Messaging, Malware and Mobile Anti-Abuse Working Group, an industry body) said in 2015 that "the best option is a 'double opt-in' process," which "involves sending recipients a confirmation message with a link or other instructions to verify." It also says marketers "should never add recipients to an email list without their knowledge and permission." [https://www.m3aawg.org/news/updated-m3aawg-best-practices-for-senders-urge-opt-in-only-mailings-address-sender-transparency, fetched 2026-11-07]
- **A newer version, seen only as a search snippet.** A snippet describes version 4.0, dated 27 August 2026, as labelling confirmed opt-in "Best". The PDF text was unreadable. [https://www.m3aawg.org/sites/default/files/doc_files/m3aawg-sender-best-common-practices-aug-27-2026.pdf, fetched 2026-11-07; text unreadable]

## The one global standard

This is a synthesis by the researcher, **not a quotation from any source**. The site does not know where an invited user lives, so it applies the strictest combination of the rules above to every user. On the statutory text fetched, one standard satisfies all four regimes: CASL carries the highest penalty ceiling found (C$10M per violation), a fixed 10-business-day unsubscribe deadline and a fixed list of what a consent request contains, and the UK, GDPR and EDPB add granularity, unbundling and a duty to demonstrate consent.

1. A separate, unticked box for promotional email only, not bundled with the terms or with a condition of service.
2. A request that meets CASL's content list: the sender's name, a mailing address plus a contact method, the purpose, and a statement that consent can be withdrawn.
3. A stored record of who agreed, when, how, and the wording they saw.
4. An unsubscribe link in every promotional mail, valid for at least 60 days and honoured at once, which is inside every deadline above (30 days in the US, 60 days in Canada, 10 business days in the US and Canada, 2 days at Yahoo, and 48 hours recommended at Google).
5. The sender's identity and a postal address in every promotional mail.

Add to each promotional mail the US statement that it is an advertisement and, to keep the mailbox providers' rules, the RFC 8058 headers.

Do not rely on the soft opt-in. A free, invited account has no sale (see the UK section).

## Classification

### The rule

A mail is **transactional** if its main purpose fits one of the FTC's five categories (16 CFR 316.3(c)) or, in the UK, if it is an information-only "service message" (ICO, search summary). It is **promotional** if its main purpose is to advertise. A transactional mail stays transactional only while it carries nothing promotional: the ICO says a promotional element of any size makes a service message marketing, and the FTC's tests turn on the subject line and on whether the transactional content comes first.

Which category a given mail falls in is the researcher's reading of the template **(own reading)**. The categories come from the sources above; the assignment does not.

CASL's definition of a commercial electronic message, and any transactional exemptions in it, were not researched **(unsourced)**. The table classes under CAN-SPAM and the ICO's service-message idea only. GDPR Article 13 of ePrivacy and PECR regulation 22 govern direct marketing, so a mail that advertises nothing falls outside them; that follows from the quoted wording and is not a separate source.

### Every template in `src/emails/`

`src/emails/` holds 17 mail templates, all listed in [`email.md`](../email.md), "What is sent". FTC categories are numbered 1 to 5 as in the list under "United States: CAN-SPAM"; the assignment to a template is the researcher's reading **(own reading)**.

| Template                               | What it does                                                                                | Rule that classes it (all transactional)                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `verify-email.ts` (sign-up)            | Sends the link that verifies an address for an account the reader just made                 | FTC category 1 (confirms an account the reader asked for) and category 2 (security). |
| `verify-email.ts`, `purpose: 'change'` | Sends the link that verifies a new address the account holder asked to switch to            | FTC category 1 and category 2, as above.                                             |
| `email-change-notice.ts`               | Tells the old and new holder that an address change was asked for or finished               | FTC category 2 (security information).                                               |
| `account-exists.ts`                    | Tells an address's holder that someone tried to sign up with it and nothing was made        | FTC category 2 (security information).                                               |
| `reset-password.ts`                    | Sends the single-use link the reader asked for from the forgot-password page                | FTC category 1 (completes what the reader asked for) and category 2.                 |
| `password-changed.ts`                  | Tells the holder the password was reset, changed or added                                   | FTC category 2 (security information).                                               |
| `password-locked.ts`                   | Tells the holder that repeated wrong passwords paused password sign-in, with a reset link   | FTC category 2 (security information).                                               |
| `admin-invitation.ts`                  | Invites a person to hold a site-keeper or curator role, with the single-use invitation link | FTC category 1 (it delivers the access the inviter granted; own reading, see below). |
| `coven-invitation.ts`                  | Invites a person into a coven, with the single-use invitation link                          | FTC category 1, as above.                                                            |
| `support-received.ts`                  | Confirms the reader's support request arrived                                               | FTC category 1 (confirms a transaction the reader started).                          |
| `support-reply-notice.ts`              | Tells a signed-in sender that staff replied, with a link to the request                     | FTC category 5 (delivers the service the reader asked for) and category 1.           |
| `support-email-reply.ts`               | Tells a signed-out sender that staff replied, with the mailed link to the request           | FTC category 5 and category 1, as above.                                             |
| `support-resolved.ts`                  | Tells the sender the request is resolved                                                    | FTC category 1 (completes the request).                                              |
| `support-closing-soon.ts`              | Tells the sender a resolved request will close soon                                         | FTC category 3 (change in standing of the reader's own request) and category 1.      |
| `access-paused.ts`                     | Tells a user a keeper paused their site access                                              | FTC category 3 (a change in standing of an ongoing account).                         |
| `coven-access-paused.ts`               | Tells a member a coven steward paused their access to that coven                            | FTC category 3, as above.                                                            |
| `support-timed-out.ts`                 | Tells a user a keeper set a support time-out                                                | FTC category 3, as above.                                                            |
| `document-updated.ts`                  | Tells every account a site document changed, and that the account will be asked to agree    | FTC category 3 (changed terms of an ongoing account).                                |

The two least certain rows are the invitations. The FTC's category 1 speaks of a transaction "the recipient agreed to", and an invited person has agreed to nothing yet **(own reading)**. The mail is still not an advertisement: it is a single message from a named person that carries the access they were offered and no promotion. If a regulator read it otherwise, the exposure is the same as for any commercial mail without consent, and the site's invitations are sent one at a time on a person's request, never in bulk.

### Billing mails that Wave 21 implies

[Wave 21](../waves/v1-next/wave-21.md) specifies no mail, so any billing mail is implied. Classes are the researcher's inference **(own reading)** from the FTC categories.

- **Transactional:** payment failed or past due, trial ending, seat lapsed and exemption ending (FTC category 3, a change in standing of an ongoing account); a receipt or switch confirmation (category 1, and 3).
- **Promotional:** a mail that announces or pitches paid plans to existing users. Its main purpose is to advertise, so it needs consent and the promotional frame.

The terms change that brings charging in goes out as the existing `document-updated` mail, with no pitch, and stays transactional. Stripe may send receipts itself; that mail is Stripe's, not the site's.

### What follows

No mail sent today needs consent. A mail leaves the transactional class the moment it carries a promotional element, so no template may gain a promotion line, a plan pitch or a "you might also like" block. The consent mechanism below exists for the first mail that is promotional.

The site's mail layout (`src/emails/parts/layout.ts`) has no footer, no postal address, no unsubscribe link and no sender-identity text, and the transport sends no `List-Unsubscribe` header (`src/lib/mail-transport.ts`). That is correct for transactional mail and means a promotional mail needs a layout of its own.

## The mechanism, as decided

The consent mechanism (one global standard, consent counting at once, a one-time prompt and an `/account` setting, an audited record, three ways to withdraw through the sessionless `/api/unsubscribe`, the postal address guard, the support mail switches) and what it rules out are in [`design-decisions/support.md`, "Promotional email needs recorded consent, withdrawn in one click"](../design-decisions/support.md#promotional-email-needs-recorded-consent-withdrawn-in-one-click).

## Gaps

These are things the research did not establish. None changes the classification of a mail sent today.

1. `ico.org.uk` and `crtc.gc.ca` returned HTTP 403 to every fetch. Each claim marked **(search summary)** rests on a search-result summary of such a page, not on a read of it.
2. The ICO's position on whether newsletters and service or news messages are direct marketing is unsourced.
3. The ICO's position on consent bundled with terms is unsourced.
4. Whether the ICO treats a free account with no sale as meeting the soft opt-in is unsourced.
5. What the 2026 amendment to RCW 19.190.020 changed is unsourced, and no authority was found on whether Washington's law survives preemption.
6. The UK GDPR text and the UK representative rule were not read.
7. CASL's definition of a commercial electronic message and its exemptions, and the regulation's exemption for messages to listed foreign states, were not read.
8. The full text of CRTC Bulletins 2012-548 and 2012-549 and the CRTC's July 2016 guidance on records could not be fetched.
9. The literal text of the `List-Unsubscribe-Post` value and a verbatim "no confirmation page" quotation from RFC 8058 were not retrieved.
10. Whether Yahoo's one-click rule covers transactional mail is not stated on the page read.
11. M3AAWG version 4.0 (August 2026) was seen only as a search snippet.
12. Whether a promotional footer by itself changes a transactional mail's status is not addressed by any source read.
13. Whether an invite-only site "offers" services to the EU under GDPR Article 3(2) is a legal judgement no source settled.
14. 16 CFR Part 316 was read on Cornell's site only, for section 316.3; the eCFR page redirected.
