# Support feature: UX, accessibility and process research

Web research only. No code was read or changed.

How to read this document:

- **fetched** means I read the page. **search** means I saw it only in a search-result summary; treat it as weaker.
- **My inference** marks a conclusion that no source states directly.
- **Gap** marks a question where I found no usable source. I did not fill gaps with invented claims.
- Vendor surveys and vendor blogs are labelled as such.

---

# Part 1: Design and accessibility

## 1. Dropdown or radios, and per-option hints

- GOV.UK radios (fetched): radios are for choosing "only select one option from a list". Each item may carry a hint: "Keep each hint to a single short sentence, without any full stops". No links in hints. Do not pre-select an option. No maximum option count is set. https://design-system.service.gov.uk/components/radios/
- GOV.UK select (fetched): use a select "only as a last resort in public-facing services". Ask fewer questions first, or consider radios. Their research found users cannot close selects and try to type into them. https://design-system.service.gov.uk/components/select/
- USWDS select (fetched): a select suits about 7 to 15 options. "Fewer than seven options. Use radio buttons instead." Over 15, use a combo box. Calls the select the "UI of last resort". https://designsystem.digital.gov/components/select/
- Baymard (fetched): "Drop-downs are generally a poor choice for offering fewer than 5 or more than 10 options." 55% of users opened a drop-down only to see what it contained. This was e-commerce checkout testing, so it transfers loosely. https://baymard.com/blog/drop-down-usability
- Gap: I did not find an NN/g article on dropdown versus radios. A Genesys design-system page (search) cites NN/g for "fewer than 6 radios"; treat as secondary. https://spark.genesys.com/latest/components/forms-and-inputs/radio/usage-gIardsRk
- My inference: seven options sits at the edge of USWDS's range, and the options carry descriptions that a native select cannot show. GOV.UK's per-option hint exists for exactly this. Radios with a short hint each fit better than a dropdown. If the dropdown stays, the descriptions are invisible until chosen, which is the "opened it just to see what it contained" problem Baymard measured.

## 2. Contact form fields, subject, URL prefill, limits, count

- NN/g Contact Us pages (fetched): keep forms to about 3 to 5 fields. "Offer a form only in addition to phone numbers". Do not require an account to make contact. State hours and expected response times. https://www.nngroup.com/articles/contact-us-pages/
- GOV.UK contact pattern (fetched): "Tell users when you'll respond to them", for example "We aim to respond within 2 working days". It does not list form fields. https://design-system.service.gov.uk/patterns/contact-a-department-or-service-team/
- GOV.UK textarea (fetched): do not limit characters without a clear reason. https://design-system.service.gov.uk/components/textarea/
- GOV.UK character count (fetched): test without a count first. Set the limit well above what most users need. Use a threshold (`data-threshold="75"`) so the count only shows near the limit. Screen readers hear the count when typing stops. The component does not block typing past the limit; over the limit it shows an error above the field and the count below. https://design-system.service.gov.uk/components/character-count/
- NN/g form design (fetched): labels above fields; do not use placeholder text as the label. https://www.nngroup.com/articles/form-design-white-space/
- Required marking (fetched): NN/g says "mark all the required fields". Optional fields may also be labelled. This agrees with the project rule that only required fields are marked. GOV.UK practice is the opposite (mark the optional ones), so the two systems differ; the project rule matches NN/g. https://www.nngroup.com/articles/required-fields/
- Prefilling "Page": the EU Web Accessibility Directive FAQ (fetched) recommends accessibility reports include the page URL, a description, device and OS, settings, assistive technology and a screenshot. That supports a prefilled page field. https://web-directive.eu/statements/index.html
- WCAG 3.3.7 Redundant Entry (fetched) covers re-entering information within one process, so it does not directly cover prefilling the page. https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html
- Gap: no source on whether a support form needs a separate Subject field.
- My inference:
  - 120 characters for Subject is a reasonable ceiling, but 4000 for Message is far above typical input. Per GOV.UK, show the count only past a threshold (for example 75%) and do not block typing.
  - The prefilled Page value should be the path only, with the query string and fragment removed (see section 18).
  - Four visible fields (topic, subject, message, plus a prefilled page) is within NN/g's 3 to 5.

## 3. Forms in modals versus pages; focus, Escape, unsaved changes

- APG modal dialog (fetched): focus moves into the dialog on open; Tab and Shift+Tab cycle inside it; "Escape: Closes the dialog."; on close focus returns to the invoking element; the dialog needs an accessible name (`aria-labelledby` or `aria-label`); a visible close or cancel control belongs in the tab order; use `aria-modal="true"` only if outside content is truly blocked. https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- NN/g (fetched): modals suit critical warnings, missing information the process needs, and breaking up complex tasks. "Modal dialogs should be used for short, direct dialogs with the user." Avoid them for complex decisions needing information the dialog does not show. "no one likes to be interrupted, but if you must, make sure it's worth the cost." https://www.nngroup.com/articles/modal-nonmodal-dialog/
- Unsaved changes (search only; design-system pages, not research): the Australian Department of Agriculture's pattern for warning before leaving https://design-system.agriculture.gov.au/patterns/warn-before-leaving ; Iterable's three-button dialog (Cancel / Leave without saving / Save and exit) https://aurora.iterable.com/latest/components/compositions/modal/design-xsnl6NKR ; Pega https://design.pega.com/design/modal-dialog/
- WCAG 3.3.4 Error Prevention (fetched): applies to legal, financial and data-changing submissions. A general contact form is outside it. https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html
- Secondary (search): a page summarising Adrian Roselli says that for a dialog with form content, focusing the first form control or close button may be better than focusing the dialog container. I did not read his page. Native `<dialog>` opened with `showModal()` gives focus trapping, Escape and focus return.
- My inference:
  - A support form is a short form, so a modal is acceptable. A long Message field, where someone may type for minutes, is the case where an Escape press or an outside click that silently discards text hurts most. Guard Escape, outside click and Cancel when the Message has text.
  - The same form also exists as a page (`/support`), so the page is the fallback for anyone the modal fails.

## 4. Success and confirmation

- GOV.UK confirmation pages (fetched): include "a reference number, if there is one" and "details of what happens next and when". Also contact details and next links. https://design-system.service.gov.uk/patterns/confirmation-pages/
- GOV.UK notification banner (fetched): the green success banner confirms something expected; use a "Success" heading so meaning does not rely on colour; in a linear service a confirmation page is better. https://design-system.service.gov.uk/components/notification-banner/
- WCAG 4.1.3 Status Messages (fetched): "Your form was successfully submitted" is a status message; `role="status"` is the recommended technique; dialogs that take focus are outside the criterion. https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- GOV.UK contact pattern (fetched, section 2): state the response time.
- My inference: the success notice should say what was sent, give the expected reply window, and say where the request will appear (`/account/support`). If the notice replaces the form inside a modal, move focus to it (a focus-taking region is outside 4.1.3 but needs focus management); if it appears in place, give it `role="status"`.

## 5. Error pages (404, 500) and "report this"

- GOV.UK page not found (fetched): H1 "Page not found". No jargon such as "404". No "oops". Do not blame the user. No red warning text. Give contact details if helpful. https://design-system.service.gov.uk/patterns/page-not-found-pages/
- GOV.UK problem with the service (fetched): H1 "Sorry, there is a problem with the service". Say "Try again later." Say whether answers were saved. Give contact details. Avoid "500" and "technical difficulties". "Log all errors and fix them as quickly as possible." https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/
- NN/g 404 (fetched): messages should be plain-language, precise and constructive; offer links and search. http://www.nngroup.com/articles/improving-dreaded-404-error-message/
- Search only: USWDS 404 template https://designsystem.digital.gov/templates/404-page ; CMS design system, which includes the point that a missing page should return a real 404 status https://design.cms.gov/patterns/404-page-guidance
- Gap: no source on a "Report This" link specifically.
- My inference: a link to the support form from an error page matches "give contact details if they help". GOV.UK says not to show "404" or "500" as the headline, but the code can ride along inside the form as prefill without being displayed in the page heading. Keep the error status code real (404 or 500) in the HTTP response.

## 6. Footer contents; do users look there for contact?

- NN/g footers (fetched): most sites keep utility links (contact, customer service, privacy, terms) there. "Users will often go directly to the footer to find contact information or locate ways to get customer support." Use clear labels such as "Contact Us"; vague labels such as "Help" are a pitfall. https://www.nngroup.com/articles/footers/
- NN/g Contact Us (fetched): a visible link labelled "Contact Us" in navigation and footer. https://www.nngroup.com/articles/contact-us-pages/
- GOV.UK footer (fetched): privacy, accessibility statement, cookies, terms and help, with standard labels. https://design-system.service.gov.uk/components/footer/
- WCAG 3.2.6 Consistent Help (fetched): a contact form counts as a help mechanism; its position must be consistent across pages. https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html
- My inference:
  - Yes, users look to the footer for contact, so the footer is the right place.
  - A single link labelled "Support" is minimal. NN/g prefers "Contact Us"; "Support" is not in the GOV.UK label set but is a common and clear word. The label is a judgement call, not a defect.
  - Where the accessibility regulations apply, a footer link to an accessibility statement is also expected (section 19). Privacy and terms links are conventional.
  - Keep the footer link in the same place on every page, including error pages, to satisfy 3.2.6.

## 7. Requester ticket lists

- GOV.UK tag (fetched): keep the number of statuses small; do not rely on colour alone; use adjectives, not verbs; do not make tags interactive. https://design-system.service.gov.uk/components/tag/
- Zendesk (fetched, section 12): the internal On-hold status shows to the requester as "Open".
- Intercom (search only): default ticket states are Submitted, In progress, Waiting on customer, Resolved. https://www.intercom.com/help/ja/articles/8687982-customize-ticket-states
- Atlassian (search only): the customer portal's "My requests" defaults to latest update first; Data Center added column sorting; a Cloud request to sort by status was closed as a duplicate. https://jira.atlassian.com/browse/JSDCLOUD-4929 ; https://community.atlassian.com/t5/Jira-questions/How-does-JIRA-sort-the-Portal-Tickets/qaq-p/804761
- Gap: no research on "staff replied" versus "waiting on you" indicators.
- My inference:
  - Sort by most recently updated, which is the default in the Atlassian portal. This is one vendor's default, not evidence of what is best.
  - Show the requester a small set of states with text (for example: Received, Replied, Waiting for you, Resolved). A "Waiting for you" state is what Intercom's "Waiting on customer" and Zendesk's Pending mean.
  - Do not expose internal states (assigned, shared with curators, GitHub link) to the sender.

## 8. Admin queues: tables, filters, assignment, row actions

- APG table (fetched): a table is static; "strongly encouraged to use a native HTML `table` element whenever possible". Label the table. Use `aria-sort` on the sorted header. Interactive widgets inside a table are each a separate tab stop. https://www.w3.org/WAI/ARIA/apg/patterns/table/
- APG grid (fetched): a grid is for interactive tabular content with a single tab stop and arrow-key navigation. https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- GOV.UK table (fetched): `<caption>` as the heading; `scope` on headers; right-align numbers; "aim to have less data in your tables." No guidance on sorting or row actions. https://design-system.service.gov.uk/components/table/
- WCAG 4.1.2 Name, Role, Value (fetched): every control needs a programmatically determined name. https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- My inference:
  - A native table with a button per row is the simpler and more robust choice than an ARIA grid for a queue of this size. The cost is many tab stops per row, which is why the number of row actions matters.
  - Each row action needs a name that includes the request ("Resolve: Subject text"), not a bare "Resolve" repeated on every row.
  - Filters should be real form controls above the table with a visible result count announced as a status message (4.1.3).

## 9. Blocking or timing out a user; what the blocked person sees

- MDN 429 (fetched): a `Retry-After` header "may be included to this response to indicate how long a client should wait". https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
- OWASP Authentication cheat sheet (fetched): lockout stops further attempts for a period; tune threshold, window and duration; exponential lockout is an option; lockout can cause denial of service to legitimate users; generic error messages are for login, to avoid account enumeration. https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Gap: no source on what text a blocked support sender should see.
- My inference:
  - OWASP's generic-message rule is about hiding whether an account exists. A signed-in sender already knows their own account, so a clear message does not leak anything.
  - Say plainly that sending is paused, until when, and how else to reach someone (the accessibility and privacy routes should not be fully blocked; see sections 17 and 19).
  - Use a time-limited block rather than a permanent one, and keep it limited to sending new requests.

## 10. Reply-notification emails

- Gap: I found no authoritative guidance on whether a support-reply email should contain the reply text or only a link.
- GOV.UK Notify and other government teams (search only): lead with the key message; the subject and opening line should say what has happened; keep the subject short; avoid bold, italics and custom fonts. https://github.com/alphagov/notifications-manuals/wiki/Sending-emails-to-our-users ; https://design.homeoffice.gov.uk/design-system/patterns/send-users/email ; https://www.notifications.service.gov.uk/using-notify/formatting
- Help Scout (search): staff can reply by email to notifications. https://docs.helpscout.com/article/67-email-notifications
- My inference:
  - Subject: say what happened and which request ("Reply to your support request: <subject>").
  - Body: because replies may contain personal details, a link-only email avoids putting content into mailboxes, but it forces a sign-in to read. Including the reply text is more useful and is what help desks do. This is an owner decision; I have no source that settles it.
  - Send a plain-text part alongside HTML. No source read states this requirement.

## 11. Accessibility specifics

- Accessible name (fetched): 4.1.2 requires a name; techniques ARIA14 (`aria-label`) and ARIA16 (`aria-labelledby`); failure F89 is an image-only link with no name; F111 is a control with visible label text but no accessible name. https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- Required fields (fetched): 3.3.2 Labels or Instructions is satisfied by marking required fields in the label (H90). `aria-required` (ARIA2) is advisory. https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html
- `aria-required` (search): the native `required` attribute is the default for native controls; `aria-required` is for custom widgets; neither draws a visual cue. https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-required ; https://www.deque.com/blog/anatomy-of-accessible-forms-required-form-fields
- Error identification (fetched): 3.3.1 — "it is not sufficient to only re-display the form"; errors must be in text; techniques include ARIA21 (`aria-invalid`), ARIA19 (`role="alert"`). https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- Error suggestion (fetched): 3.3.3 — give a correction where one is known. https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html
- GOV.UK error summary (fetched): move focus to it; title "There is a problem"; link each message to its field; wording matches the inline messages; show it even for one error; put it at the top of `main`. https://design-system.service.gov.uk/components/error-summary/
- GOV.UK validation (fetched): validate on submit, not on blur; prefix the page title with "Error: "; always validate on the server; use `novalidate`. https://design-system.service.gov.uk/patterns/validation/
- Status messages (fetched): see section 4.
- APG combobox (fetched): Down Arrow moves into the popup; Escape dismisses it; Enter accepts the focused option and closes; Alt+Down opens without moving focus; in select-only comboboxes typing a letter moves to the next option starting with it; Escape returns focus to the combobox. https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- My inference: the footer "Support" link has visible text, so its accessible name is already correct; the risk is on icon-only links (such as an icon "Report This"), which need a name. If the topic control is a custom dropdown, it must follow the select-only combobox keyboard model above, or use a native select.

---

# Part 2: Support process

## 12. End-to-end process for a small team

- Zendesk lifecycle (fetched): New, Open, Pending (waiting on the requester), On-hold (internal, optional), Solved, Closed. "The default automation setting is that a ticket is closed automatically four days after it has been solved." If those automations are off, tickets close 28 days after solving. A requester reply on a Solved ticket reopens it; a Closed ticket cannot be reopened. https://support.zendesk.com/hc/en-us/articles/8263915942938-About-the-ticket-lifecycle-and-ticket-statuses
- Zendesk follow-up (fetched): "any response to a closed ticket from any channel automatically creates a follow-up ticket" that references the original. https://support.zendesk.com/hc/en-us/articles/4408883882522-Creating-a-follow-up-for-a-closed-ticket
- Atlassian (fetched): reminder rules fire after 3 business days with no status change; a resolved request that waits 3 days (72 hours) is commented on (comment shared with the customer) and moved to Closed. https://support.atlassian.com/jira/kb/implement-automated-issue-inactivity-follow-ups-and-closure-in-jira-service-management-cloud/
- Atlassian community (search): a customer comment on a Resolved issue reopens it only if the reopen transition and a rule are added; a "Thanks" would reopen it too. https://community.atlassian.com/forums/Jira-Service-Management/Auto-close-ticket-if-no-response-in-7-days-and-reopen-if-replied/qaq-p/2845681
- Help Scout (search): three statuses, Active, Pending (waiting on a customer reply) and Closed; a customer reply to Pending or Closed sets it to Active. https://docs.helpscout.com/article/11-understand-conversation-icons-and-colors
- Intercom (search): Submitted, In progress, Waiting on customer, Resolved. https://www.intercom.com/help/ja/articles/8687982-customize-ticket-states
- Triage (search, blog level): tag, route, flag urgent, assign immediately, check the inbox first thing, track first response time. https://make.wordpress.org/community/handbook/community-deputy/resources-and-tools/help-scout/triage-in-help-scout/
- Response-time surveys (vendor surveys, not independent research):
  - HubSpot (fetched): "66% of consumers expect a response from customer service in five minutes or less"; no sample size or year stated. https://blog.hubspot.com/service/customer-responsiveness
  - SuperOffice (fetched): an audit of 1,000 companies, not a survey of expectations; 62% did not respond; the average response took 12 hours 10 minutes; about nine in ten did not acknowledge receipt. Year unstated. https://www.superoffice.com/blog/customer-service-benchmark/
  - Toister Solutions (search): 2018 survey of 1,200 consumers; a one-hour email reply meets 89% of expectations. https://toistersolutions.com/blog/tag/email+response+time
- Gaps: Freshdesk guidance not obtained. The GOV.UK service manual user-support page I tried returned 404; I did not read it (parent: https://www.gov.uk/service-manual/helping-people-to-use-your-service).
- My inference:
  - The common lifecycle across vendors is: new, open (staff working), waiting on sender, resolved, closed. Pending/waiting statuses stop a clock and return to open on a sender reply.
  - A closed request should not reopen; a reply to it should start a linked new request (Zendesk), or the app should refuse and point to the form.
  - For a team of one admin and a few curators, publish a realistic window (the GOV.UK example is 2 working days) rather than chasing the vendor minute figures.
  - Auto-close resolved requests after a short stated period (Zendesk 4 days, Atlassian 3 days) and tell the sender.

## 13. What the sender is told, and when

- GOV.UK confirmation and contact patterns (fetched, sections 2 and 4): reference, what happens next, reply time.
- SuperOffice (fetched, vendor audit): most companies do not acknowledge receipt, and almost none ask for satisfaction.
- Atlassian (fetched): the pre-close comment is shared with the customer.
- Zendesk CSAT (search): email surveys go out about 24 hours after Solved so the sender can check the fix; a vendor guide says the delay lowers surveys on tickets that reopen. https://www.zendesk.com/blog/customize-csat-surveys/ ; https://www.eesel.ai/blog/zendesk-csat-survey-email-delay
- Gap: no source on a "did this solve it?" prompt versus a satisfaction survey.
- My inference: tell the sender at four moments: on send (acknowledgement with reply window), on staff reply (email), on resolve (email saying it is resolved and that replying reopens it), and before auto-close (one notice). A "did this solve it?" control is optional for a small team; a reopen path ("This did not fix it") gives the same signal with less work.

## 14. Replies and threads; "reply by email"

- Zendesk, Help Scout (fetched/search, section 12): a requester reply to Solved or Pending returns the request to the open state; a reply to Closed creates a linked follow-up.
- Help Scout (search): staff reply to notification emails and the reply is posted to the conversation, with commands such as `@note` for an internal note. https://docs.helpscout.com/article/43-email-commands
- My inference: if the sender can reply in the app, the app needs a rule for replies on resolved and closed requests (reopen or refuse). Accepting replies by email would need inbound mail handling and spam control; a small team can skip it and have the email link back to the request.

## 15. Internal notes versus public replies

- Zendesk (search, vendor blogs): public replies notify the requester; internal notes do not; the composer defaults to a public reply, so internal text posted to the customer by accident is a known risk. https://www.getmacha.com/blog/zendesk-internal-notes-vs-public-replies ; https://www.eesel.ai/blog/zendesk-ticket-internal-vs-public-comment
- My inference: even with one admin, a place to record internal context is useful once curators are involved, and "share with curators" is already an internal channel. If notes exist, label the composer mode in text ("Reply to sender" versus "Internal note") and never default to the riskier mode. Whether to build separate notes now is an owner decision.

## 16. Categories on support forms

- Search, vendor blogs (no controlled study found): agents tag the same issue inconsistently; coarse required dropdowns push users to wrong choices. https://www.klark.ai/en/post/autocategorisation-support-automatisation ; https://haloagents.ai/blog/support-ticket-categorization-problems ; https://www.supportbench.com/?p=25124
- Gap: no peer-reviewed or controlled evidence on sender-chosen categories and deflection. A "20 to 30% of manually tagged tickets" figure appears in one vendor post; I could not verify it and do not rely on it.
- My inference: because the seven topics route real work (accessibility, privacy, account), asking is justified. Let staff change the topic, and avoid a required topic that blocks sending when the sender is unsure (a "Question" or "Not sure" default covers that).

## 17. Abuse handling

- MDN 429 and OWASP (fetched, section 9): `Retry-After`; thresholds, windows and durations; exponential lockout; lockout can be abused to deny service to others.
- Gap: no source on abuse handling specific to support forms.
- My inference: rate-limit sending by account (not IP alone, per OWASP's account-based counter), time-limit blocks, show the end time, log who blocked and why, and keep an alternative contact route.

## 18. Privacy: what a request record stores

- ICO storage limitation (fetched): no fixed retention period; do not keep data "just in case"; document standard retention periods; review and then erase or anonymise; deletion includes backups; people can ask for erasure. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/
- ICO data minimisation (fetched): data must be "adequate, relevant and limited"; "You must not collect personal data on the off-chance that it might be useful in the future." https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/
- URL tokens (search): OWASP Cornucopia says URL parameters leak through browser history and referrer headers; Tenable adds proxy and server logs. https://cornucopia.owasp.org/edition/webapp/SM9 ; https://tenable.com/plugins/was/112799
- My inference:
  - Store the page path only; strip the query string and fragment (they can hold tokens such as invitation or verification tokens).
  - Store the user agent and IP only if there is a stated purpose (abuse handling) and a retention period.
  - Set a retention period for closed requests, state it in the privacy notice, and handle erasure requests.

## 19. Accessibility-specific channels

- UK sample accessibility statement (fetched): the feedback and contact section tells users how to report problems, gives contact details and states a response time ("We'll consider your request and get back to you in [number] days."). The enforcement wording is legally required. https://www.gov.uk/government/publications/sample-accessibility-statement/sample-accessibility-statement-for-a-fictional-public-sector-website
- EU Web Accessibility Directive FAQ (fetched): the statement must include compliance status, inaccessible content, dates, preparation method, a description of and link to the feedback mechanism, contact details, and the enforcement procedure. The feedback mechanism is "a legal requirement". https://web-directive.eu/statements/index.html
- Search only: the European Commission's web guide uses a feedback form with an accessibility topic https://commission.europa.eu/resources/europa-web-guide/design-content-and-development/accessibility/complaints-and-feedback-mechanism_lv ; W3C's statement generator lists contact for feedback as minimal recommended content https://wai-website.netlify.app/planning/statements/generator
- My inference:
  - An "Accessibility" option on a general form can serve as the feedback mechanism. It does not replace an accessibility statement.
  - The legal duty applies to public sector bodies; I did not establish whether this app is one. The owner should check.
  - Whether or not it is required, state a response time for accessibility reports and make that route usable without sign-in if possible; a signed-out visitor who is blocked by an access barrier cannot reach a sign-in-gated form. This matters here because `/support` shows signed-out visitors only a Sign In prompt.

---

---

# Part 3: Task management in support systems

Same labels as above: fetched, search, My inference, Gap.

## 20. Status lifecycles

- Zendesk (fetched, https://support.zendesk.com/hc/en-us/articles/8263915942938-About-the-ticket-lifecycle-and-ticket-statuses): New, Open, Pending, On-hold (optional), Solved, Closed.
  - Pending means waiting on the requester. On-hold is internal ("waiting on a third party") and the requester sees "Open".
  - Agents set Solved. Closed is set only by automation or trigger: "Tickets can be closed by a trigger or automation, but not by agents." (fetched, https://support.zendesk.com/hc/en-us/articles/4408887712154-What-is-the-difference-between-a-solved-ticket-and-a-closed-ticket)
  - Automatic moves: new to open on assignment/agent action; reply from the requester back to Open; Solved to Closed after 4 days by default (max 28); Closed to Archived after 120 days.
- Help Scout (fetched, https://docs.helpscout.com/article/11-understand-conversation-icons-and-colors): Active ("needs action"; new conversations arrive Active), Pending ("waiting on something, such as a customer's reply"), Closed. Staff set Pending and Closed. A customer reply to Pending or Closed sets Active automatically.
- Jira Service Management (search, community and Atlassian KB; no official spec page found): typical statuses are Waiting for support and Waiting for customer. A comment-driven move is done by automation, not the workflow. A common rule: customer comments while Waiting for customer, move to Waiting for support; agent public reply, move to Waiting for customer. Internal comments do not move it. https://support.atlassian.com/jira/kb/comments-not-updating-status-in-jira-service-management-cloud/ ; https://community.atlassian.com/forums/Jira-Service-Management/Change-status-after-every-customer-reply/qaq-p/1551587
- Freshdesk (search; the official page needed a login, so not fetched): defaults Open, Pending, Resolved, Closed; "Waiting on Customer" and "Waiting on third party" are available, and admins can add custom statuses. Pending commonly pauses SLA timers. https://support.freshdesk.com/en/support/solutions/articles/37600-customizing-your-ticket-statuses
- Intercom (search): states Open, Snoozed, Closed in the inbox; ticket states Submitted, In progress, Waiting on customer, Resolved. https://www.intercom.com/help/en/articles/8838656-inbox-faqs ; https://www.intercom.com/help/ja/articles/8687982-customize-ticket-states
- Linear (search): status categories Backlog, Unstarted, Started, Completed, Canceled; teams add custom statuses inside a category. https://linear.app/docs/configuring-workflows
- GitHub issues (fetched, partial): open and closed only; closing can carry a reason ("not planned"). The page did not cover reopening. https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/closing-an-issue
- Meaning of the waiting words (my inference, from the above): "Pending" (Zendesk, Help Scout, Freshdesk), "Waiting on customer" (Intercom, Freshdesk, Jira) all mean the ball is with the requester. "On-hold" (Zendesk) means the ball is with someone outside the requester and the team. Everywhere the sender's reply returns the request to the staff side.
- Common shape across all of them (my inference): one "needs staff" state, one "waiting on requester" state, one "done but can reopen" state, and one "finished" state.

## 21. Re-opening on reply

- Zendesk (fetched, https://support.zendesk.com/hc/en-us/articles/11006863625370-Why-is-the-customer-s-reply-not-changing-the-ticket-status-to-open): "When an end user comments on a pending, solved, or on-hold ticket, the ticket status automatically changes to Open." Closed does not change: "Closed tickets cannot be reopened by design," so a reply creates a follow-up ticket (fetched, follow-up article in section 12). Exceptions: a trigger can reset the status; if the requester is an agent the status stays as chosen.
- Help Scout (fetched): reply to Pending or Closed sets Active. No follow-up ticket; the same conversation reopens.
- Freshdesk (search): a customer response moves the ticket back to Open; a reply after the threading window on a closed ticket may create a new ticket. Treat as unverified.
- Jira Service Management (search): a reply to a Resolved issue reopens only if an automation rule and transition exist; a "Thanks" would reopen too (section 12 link).
- Intercom (search): a conversation closed by a workflow can still reopen when the customer replies. Not stated on one page.
- How staff are told:
  - Help Scout (fetched): Active conversations are shown in bold at the top of folders and the sidebar count counts Active only. So a reopened one is a count and a bold row.
  - Zendesk: I found no built-in assignee notification on reopen; vendor blogs say to build a trigger (search, https://www.eesel.ai/blog/zendesk-ticket-views-solved-reopen). Treat as unverified.
  - Gap: no official source for a "customer replied" badge as such.
- My inference (the owner's idea is the standard model): a sender reply sets the request to the "needs staff" status, whatever it was, except for finished/closed ones. The queue shows it because the queue is filtered by status, with no separate flag needed.

## 22. Buckets, views and queues

- Help Scout (fetched, https://docs.helpscout.com/article/1429-about-default-folder-views-in-help-scout): always shown: Unassigned (Active and Pending not assigned to anyone), Mine (Active and Pending assigned to you), Assigned (assigned to others), Closed, Spam. Conditional: Drafts, Chats, and Needs Attention ("only when one or more conversations need manual intervention"). Sidebar counts count Active only.
- Jira Service Management (search): default queues such as All open, Assigned to me, Unassigned; admins customise, reorder, delete; SLA data is shown in queue columns; a "Waiting for customer" or "Breaching SLA" queue is suggested only by a third-party guide. https://confluence.atlassian.com/servicemanagementserver/using-service-project-queues-939926462.html ; https://community.atlassian.com/learning/lesson/set-up-requests-and-queues
- Zendesk (search): views are saved filters; SLA columns sort by time to breach; no triggers on breach, only time-based automations. I could not fetch the default-views page (the URL I tried was a search reference). https://www.eesel.ai/blog/zendesk-sla-view-column-sort-by-breach
- Intercom (search): inbox filtered by state Open, Snoozed, Closed; views per inbox.
- Gap: no source states a minimum set of views for a small team.
- My inference: the common core across Help Scout and Jira is four: unassigned, mine, others'/all open, closed. Add one more split for a small team: "waiting on sender", so staff can ignore it until it moves.

## 23. Needs-attention signals

- Help Scout (fetched): bold Active rows at top, Pending after, Closed greyed at the bottom; sidebar counts Active only; a Needs Attention folder appears only when something needs manual action.
- Zendesk (search): SLA badge colour shows time left, red once breached; sort the SLA column ascending to put the nearest breach on top.
- WCAG 1.4.1 Use of Color (fetched, https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): "Color is not used as the only visual means of conveying information". Pair colour with text or another cue. GOV.UK tag (section 7) says the same for status.
- Gap: no accessibility guidance found specific to "unread" or "needs attention" row markers or navigation count badges.
- My inference:
  - Use a text label in the row ("Sender replied") and make the status column text, with bold only as an extra.
  - Put a count in the navigation link text ("Support (3)"), so a screen reader hears it; do not rely on a coloured dot.
  - Sort needs-staff rows first, oldest reply first, so nothing waits behind newer items (an inference from SLA sorting, not a sourced rule).
  - "Stale" is a time-based rule, so it is derived from last activity and a stated threshold, not a stored status.

## 24. Assignment and ownership

- Zendesk (search, https://support.zendesk.com/hc/en-us/articles/4828787357210-Managing-your-omnichannel-routing-configuration): round robin gives work to the agent who has gone longest without work; only new and open tickets are routed; agents set Online, Away or Offline; optional reassignment of up to 50 recent open tickets when an agent's status changes to chosen values.
- Help Scout (fetched): unassigned conversations show in Unassigned for anyone to take; Mine and Assigned split by owner.
- Jira Service Management (search): "Assigned to me" and "Unassigned" queues; SLA timers can start at assignment.
- Gap: nothing found on small-team "away" handling outside Zendesk's feature.
- My inference: for one admin plus a few curators, "take it" from an Unassigned view is enough; auto-assign adds nothing. For an assignee who is away, the minimum is an admin action to reassign, plus a visible "assigned to X, last activity N days ago" so a stalled one can be spotted.

## 25. Resolution and the sender's say

- Zendesk (fetched): agents set Solved; only automation closes; a solved ticket reopens on reply; closed does not. CSAT email goes about 24 hours after Solved by default (search, https://www.zendesk.com/blog/customize-csat-surveys/).
- Atlassian (fetched, section 12): auto-close after 3 days resolved, with a comment to the customer.
- Help Scout (fetched): Closed is set by staff; a customer reply reopens.
- Gap: I found no source on a requester-initiated close or "did this solve it?" as a built-in. Section 13's inference stands.
- My inference: "Resolved" is staff saying it is done and the sender may still reply; "Closed" is finished, set by the system after a quiet period. The sender can reopen while Resolved; after Closed they start a new linked request.

## 26. Topic-dependent workflows

- Zendesk (search): the Type field (Question, Incident, Problem, Task) is a system field that cannot be extended; statuses are the same for all types; I found nothing about per-type status sets. A solved Problem solves its linked Incidents. https://support.zendesk.com/hc/en-us/articles/4408881729434-How-can-I-add-additional-ticket-type-options
- Jira (known from section 20): workflows are per issue type, so different types can have different statuses.
- Linear (search): statuses are per team, not per type.
- Gap: I found no help-desk system with per-type statuses by default; common practice from these sources is one lifecycle with type as a field or tag.
- My inference: seven topics do not justify seven workflows. Use one lifecycle with topic as a field. A bug that needs development work is better tracked by the existing GitHub link than by a separate status set.

## 27. A data model (my inference; no source states it)

Fields on a support request:

- `status`: one of `open`, `waiting_on_sender`, `resolved`, `closed`.
- `topic`: the seven options. Changeable by staff.
- `assignee`: nullable user.
- `last_sender_activity_at`, `last_staff_activity_at`: set when each side posts. Derive "stale" and sort from these, so no extra statuses are needed.
- `resolved_at`, `closed_at`: for the auto-close timer and reporting.
- `shared_with_curators`: boolean (internal), `github_url`: nullable (internal).
- Messages: `author_role` (`sender` or `staff`), `visibility` (`public` or `internal`). Only public messages count as replies.

Transitions:

| From                            | Event                                                   | To                                | Who                              |
| ------------------------------- | ------------------------------------------------------- | --------------------------------- | -------------------------------- |
| (none)                          | sender submits                                          | `open`                            | system                           |
| `open`                          | staff posts a public reply, marking "waiting on sender" | `waiting_on_sender`               | staff                            |
| `open`, `waiting_on_sender`     | staff marks done                                        | `resolved`                        | staff                            |
| `waiting_on_sender`, `resolved` | sender posts a message                                  | `open`                            | system                           |
| `resolved`                      | no activity for N days                                  | `closed`                          | system, with a notice sent first |
| `closed`                        | sender posts or submits                                 | new request linked to the old one | system                           |
| any except `closed`             | staff internal note                                     | no change                         | n/a                              |

Re-open rule, stated precisely: a public message from the sender on a request in `waiting_on_sender` or `resolved` sets `status = open`, clears `resolved_at`, sets `last_sender_activity_at`, and returns the request to the "needs staff" view; if assigned, it stays with the assignee. On `closed` it changes nothing and a linked new request is created. A staff message never reopens anything. An internal note never changes status.

Views (buckets): Needs staff (`open`), Mine (`open` or `waiting_on_sender`, assignee is me), Unassigned (`open`, no assignee), Waiting on sender, Resolved, Closed. "Needs staff" is sorted oldest sender activity first.

---

# Checklist

Each check is yes/no; the number is the source section above.

1. Does each topic option show its one-line description before the sender chooses (radios with hints, not a native select)? (1)
2. Is the topic list kept to a number a visitor can scan, with no option preselected unless it is the safe default? (1)
3. Does the form have no more than about five visible fields? (2)
4. Does the form state when the sender can expect a reply? (2, 4, 13)
5. Is the character count hidden until near the limit, with typing never blocked? (2)
6. Does the prefilled Page value contain only the path, with query string and fragment removed? (2, 18)
7. Are only required fields marked, in the label text, with `required` set on native controls? (2, 11)
8. Is the dialog named (`aria-labelledby`), does focus enter it, does Tab stay inside, and does Escape close it? (3)
9. Does focus return to the control that opened the dialog on close? (3)
10. Is there a visible Cancel or Close control in the tab order? (3)
11. Does Escape, outside click or Cancel ask before discarding typed message text? (3)
12. Does a standalone `/support` page offer the same form, for people the modal fails? (3)
13. Does the success notice say what happens next, when, and where the request will be listed? (4)
14. Is the success notice announced (`role="status"`) or given focus? (4, 11)
15. Do 404 and 500 pages use plain headings without "404", "oops" or blame, and say whether work was saved? (5)
16. Do error pages still return real 404 or 500 status codes? (5)
17. Is the footer Support link in the same place on every page, including error pages? (6)
18. Is there a footer link to an accessibility statement, and to privacy? (6, 19)
19. Does the sender's list use text status labels, not colour alone, from a short set? (7)
20. Is the sender's list sorted by latest update, with "waiting on you" visible as text? (7)
21. Do internal states (assigned, shared with curators, GitHub link) stay out of the sender's view? (7, 12)
22. Is the admin queue a native table with a caption and `scope` headers, and is the sorted column marked `aria-sort`? (8)
23. Does every row action have a unique accessible name that includes the request? (8, 11)
24. Is a blocked sender told plainly that sending is paused, until when, and how else to get help? (9, 17)
25. Is every block time-limited, narrow to new requests, and logged? (9, 17)
26. Does the reply email's subject say what happened and which request? (10)
27. Does the email have a plain-text part, and has the owner decided between reply text and link-only? (10)
28. Does form validation run on submit, with an error summary that takes focus and links to each field? (11)
29. Are inline errors text, tied to fields (`aria-invalid`, described by), and worded the same as the summary? (11)
30. Is the lifecycle defined (new, open, waiting on sender, resolved, closed), with what a sender reply does in each state? (12, 14)
31. Do resolved requests auto-close after a stated period, with a notice to the sender first? (12, 13)
32. Does a reply to a closed request create a linked new request or point to the form, never silently vanish? (12, 14)
33. Can staff change the sender's chosen topic? (16)
34. Is there an internal notes mode labelled in text, with the safer mode as default? (15)
35. Is there a stated retention period for closed requests, and is IP or user agent stored only with a stated purpose? (18)
36. Does the accessibility report route work for a signed-out visitor, and is a response time stated? (19)
37. Has the owner confirmed whether the accessibility regulations apply to this site? (19)
38. Is there one "needs staff" status, one "waiting on sender" status, one "resolved" status and one "closed" status, each shown as text? (20, 27)
39. Does a sender message on a waiting or resolved request set it back to the needs-staff status automatically? (21, 27)
40. Does a sender message on a closed request create a linked new request instead of changing the old one? (21)
41. Do staff replies and internal notes never reopen a request? (20, 21, 27)
42. Does the admin queue have at least Needs staff, Mine, Unassigned, Waiting on sender, Resolved and Closed views? (22)
43. Do navigation counts count only requests that need staff, and are they in the link text? (22, 23)
44. Is every needs-attention marker text (for example "Sender replied"), with colour or bold only as an extra? (23)
45. Is the needs-staff view sorted with the oldest sender activity first? (23)
46. Is "stale" derived from last activity and a stated threshold, not a stored status? (23, 27)
47. Can any staff member take an unassigned request, and can an admin reassign one? (24)
48. Does a reopened request stay with its assignee, and is that assignee visible? (21, 24)
49. Is closing done only by the system after a quiet period, with a notice to the sender first? (25)
50. Is there one lifecycle for all seven topics, with topic as an editable field? (26, 27)

# Gaps and open owner decisions

- Gaps: reply-email content guidance (10); sort order and "staff replied" indicators (7); blocked-sender wording (9); a "did this solve it?" prompt (13); evidence on sender-chosen categories (16); Freshdesk and the GOV.UK service manual user-support page (12); NN/g on dropdown versus radios (1).
- Owner decisions: reply text or link-only in emails (10); separate internal notes (15); whether the accessibility regulations apply (19); retention period (18); the footer label "Support" versus "Contact Us" (6).
- Part 3 gaps: official Freshdesk and Jira Service Management status pages (not fetched; login wall or community-level only); GitHub reopen behaviour; Zendesk default views page; any minimum-views source; accessibility guidance for unread/needs-attention markers beyond WCAG 1.4.1; requester-initiated close.
- Part 3 owner decisions: whether "resolved" lets the sender reopen and for how many days (25, 27); whether a reply to a closed request makes a linked new request or is refused (21); whether to keep an assignee on reopen (24).
