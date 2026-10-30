import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';
import { isoCBOR } from '@simplewebauthn/server/helpers';

// A software authenticator: what a browser and a device's key store answer to
// the passkey plugin's options, built the way the WebAuthn spec lays the bytes
// out, so the plugin's own verification is what decides. ES256 (COSE alg -7)
// with "none" attestation, the plugin's request.

/** What a ceremony's options carry that the authenticator reads. */
type Options = { challenge: string; rpId?: string; rp?: { id: string } };

/** One key, as a device holds it. */
export type SoftKey = {
  readonly credentialId: string;
  readonly privateKey: KeyObject;
  readonly publicCose: Uint8Array;
  counter: number;
};

export function softKey(): SoftKey {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const coordinate = (value: string | undefined) =>
    new Uint8Array(Buffer.from(value!, 'base64url'));
  // COSE_Key: kty EC2 (1: 2), alg ES256 (3: -7), crv P-256 (-1: 1), x (-2), y (-3).
  const cose = new Map<number, number | Uint8Array>([
    [1, 2],
    [3, -7],
    [-1, 1],
    [-2, coordinate(jwk.x)],
    [-3, coordinate(jwk.y)],
  ]);
  return {
    credentialId: randomBytes(16).toString('base64url'),
    privateKey,
    publicCose: isoCBOR.encode(cose),
    counter: 0,
  };
}

const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest();

function clientData(type: 'webauthn.create' | 'webauthn.get', challenge: string, origin: string) {
  return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
}

// rpIdHash (32) · flags (1) · signCount (4), then the attested credential when registering.
function authenticatorData(rpId: string, key: SoftKey, attested: boolean): Buffer {
  // User present (0x01) and verified (0x04); attested credential data (0x40) when registering.
  const flags = 0x01 | 0x04 | (attested ? 0x40 : 0);
  const count = Buffer.alloc(4);
  count.writeUInt32BE(key.counter);
  const head = Buffer.concat([sha256(rpId), Buffer.from([flags]), count]);
  if (!attested) return head;
  const id = Buffer.from(key.credentialId, 'base64url');
  const idLength = Buffer.alloc(2);
  idLength.writeUInt16BE(id.length);
  return Buffer.concat([head, Buffer.alloc(16), idLength, id, Buffer.from(key.publicCose)]);
}

/** The body `navigator.credentials.create()` hands `/passkey/verify-registration`. */
export function attest(key: SoftKey, options: Options, origin: string) {
  const rpId = options.rp?.id ?? options.rpId!;
  const attestationObject = isoCBOR.encode(
    new Map<string, unknown>([
      ['fmt', 'none'],
      ['attStmt', new Map()],
      ['authData', new Uint8Array(authenticatorData(rpId, key, true))],
    ]) as Parameters<typeof isoCBOR.encode>[0],
  );
  return {
    id: key.credentialId,
    rawId: key.credentialId,
    type: 'public-key',
    clientExtensionResults: {},
    response: {
      clientDataJSON: clientData('webauthn.create', options.challenge, origin).toString(
        'base64url',
      ),
      attestationObject: Buffer.from(attestationObject).toString('base64url'),
      transports: ['internal'],
    },
  };
}

/** The body `navigator.credentials.get()` hands `/passkey/verify-authentication`, signed by `key` and naming `credentialId`. */
export function assert(
  key: SoftKey,
  options: Options,
  origin: string,
  credentialId: string = key.credentialId,
) {
  key.counter += 1;
  const data = authenticatorData(options.rpId!, key, false);
  const client = clientData('webauthn.get', options.challenge, origin);
  const signature = sign('sha256', Buffer.concat([data, sha256(client)]), key.privateKey);
  return {
    id: credentialId,
    rawId: credentialId,
    type: 'public-key',
    clientExtensionResults: {},
    response: {
      clientDataJSON: client.toString('base64url'),
      authenticatorData: data.toString('base64url'),
      signature: signature.toString('base64url'),
    },
  };
}
