-- support_send_counts is now keyed by an HMAC of each address (src/lib/send-count-key.ts). The rows written before held the
-- addresses themselves, and no new key can be worked out from a row, so they go: a visitor's count starts again, which costs at
-- most one 24-hour window of the limit.
DELETE FROM "support_send_counts";
