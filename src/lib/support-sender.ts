// The seeded account that stands as `created_by` on a request a signed-out visitor sends. It holds no seat and cannot create a coven;
// the visitor's own address is on the row's `sender_email`. The id is fixed so a CHECK can name it.
export const SIGNED_OUT_SENDER_ID = '00000000-0000-4000-8000-00000000a110';
