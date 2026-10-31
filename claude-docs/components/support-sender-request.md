# SupportSenderRequest

`src/components/SupportSenderRequest/` — the body of the sender's dialog over `/account/support`, opened by `?request=<id>` ([`SupportList`](support-list.md) holds the `RouteModal`, with the eyebrow "Support · " and the kind, the subject as the title and the status badge beneath it; the close control is the dialog's).

It reuses the parts of the staff dialog ([`SupportRequests`](support-requests.md)): `facts.tsx` (Sent, Page and Error), `thread.tsx` and the `support-detail` rules. It differs from the staff dialog in what it leaves out and how it names people:

- **The Error fact shows the status code alone.** The error reference (the crash digest) is staff-only: the sender's reads return none, the GraphQL field is curator-only, and the staff dialog keeps it with its Copy button (2026-10-31, the owner's call).
- **No** issue panel, settings column, time-out panel, assignment or Resolve. There is no From fact: the sender knows who they are.
- **Tags and site name, not people.** The sender's own message is named "You" and tagged "You"; every reply is named for the site (`SITE_NAME`, "Sorrel & Salt") and tagged "Staff", whether a curator or an admin wrote it. A staff member's name is never read for this dialog. Each entry's meta line is who, the tag and when, with the time short (`30 Oct, 2:01 pm`).
- **A shut reply box.** Beneath the thread, a faded form (at the disabled opacity): a "Your Reply" label, an empty disabled textarea with the placeholder "Write a reply.", and a disabled solid "Reply" button in the actions row beneath it. It is a placeholder shape for M15.43, which lets the sender answer; it carries no message and nothing is sent from it.
- **Spacing.** The thread column keeps the staff dialog's totals: facts to Thread 4, Thread heading to first entry 2, last entry to the reply's hairline 4, and 5 of padding beneath the hairline.
