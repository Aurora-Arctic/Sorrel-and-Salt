import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';

/** The secret an authenticator app reads from an `otpauth://` link, as the text it signs with. */
export function totpSecret(totpURI: string): string {
  const encoded = new URL(totpURI).searchParams.get('secret');
  if (!encoded) throw new Error(`no secret in ${totpURI}`);
  return new TextDecoder().decode(base32.decode(encoded));
}

/** The six-digit code an authenticator app shows now for the secret in `totpURI`. */
export function totpCode(totpURI: string): Promise<string> {
  return createOTP(totpSecret(totpURI)).totp();
}

/** A six-digit code that is neither the current one for `totpURI` nor the one either side of it. */
export async function wrongTotpCode(totpURI: string): Promise<string> {
  const otp = createOTP(totpSecret(totpURI));
  const step = Math.floor(Date.now() / 30_000);
  const near = new Set(await Promise.all([-1, 0, 1].map((offset) => otp.hotp(step + offset))));
  for (let n = 0; ; n++) {
    const code = String(n).padStart(6, '0');
    if (!near.has(code)) return code;
  }
}
