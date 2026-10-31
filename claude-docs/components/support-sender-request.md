# SupportSenderRequest

`src/components/SupportSenderRequest/` — the body of the sender's dialog over `/account/support`, opened by `?request=<id>` ([`SupportList`](support-list.md) holds the `RouteModal`, with an eyebrow "Support · " and the kind, the subject and the status badge).

It reuses the parts of the staff dialog ([`SupportRequests`](support-requests.md)): `facts.tsx` (Sent, Page and Error), `thread.tsx` and the `support-detail` rules. It differs from the staff dialog in what it leaves out and how it names people:

- **No** issue panel, settings column, time-out panel, assignment or Resolve. There is no From fact: the sender knows who they are.
- **Tags, not names.** The sender's own message is tagged "You" and every reply "Staff", whether a curator or an admin wrote it. A staff member's name is never read for this dialog.
- **A shut reply box.** Beneath the thread, a disabled, faded "Your Reply" field (at the disabled opacity) with the line "Replies are coming." It is a placeholder for M15.43, which lets the sender answer; nothing is sent from it.
- **Spacing.** The thread column keeps the staff dialog's totals: facts to Thread 4, Thread heading to first entry 2, last entry to the reply's hairline 4, and 5 of padding beneath the hairline.
