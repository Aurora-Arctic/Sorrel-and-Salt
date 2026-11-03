import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { NotFound, ValidationError } from '@/lib/errors';
import {
  currentTermsVersion,
  publishDocumentDraft,
  readDocumentForEditing,
  saveDocumentDraft,
} from '@/modules/documents';
import { agreeToTerms, hasAgreedToTerms } from '@/modules/identity';
import { A, B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';

// The terms in force are the terms document's highest published version number, and an account has agreed when it recorded that
// number. Agreement is recorded by the service alone, stamped with the session's user, and only at the number in force, so a page
// left open across a publish cannot agree to the text it showed (claude-docs/design-decisions/m15.59-document-editor-scope.md).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

interface TermsRow {
  agreed_terms_version: number | null;
  terms_accepted_at: Date | null;
  updated_by: string;
}

async function row(id: string): Promise<TermsRow> {
  const [found] = await sql`
    select agreed_terms_version, terms_accepted_at, updated_by from users where id = ${id}`;
  return found as TermsRow;
}

let termsId: string;
let privacyId: string;

beforeEach(async () => {
  await sql`truncate documents cascade`;
  // The terms at versions 1 and 2, with 3 an open draft; the privacy policy at version 1.
  termsId = await insertDocument(sql, { key: 'terms', title: 'Fixture Terms' }, E.id);
  await insertDocumentVersion(sql, termsId, { number: 1 }, E.id);
  await insertDocumentVersion(
    sql,
    termsId,
    { number: 2, published_at: '2026-04-05 00:00:00' },
    E.id,
  );
  await insertDocumentVersion(sql, termsId, { number: 3, status: 'draft' }, E.id);
  privacyId = await insertDocument(sql, { key: 'privacy' }, E.id);
  await insertDocumentVersion(sql, privacyId, { number: 1 }, E.id);
  // Neither has agreed, so a number on a row shows as this call's write.
  for (const user of [A, B]) {
    await sql`update users set agreed_terms_version = null, terms_accepted_at = null where id = ${user.id}`;
  }
});

describe('currentTermsVersion', () => {
  it('is the highest published terms version, which an open draft past it does not displace', async () => {
    expect(await currentTermsVersion()).toBe(2);
  });
});

describe('agreeToTerms', () => {
  it('records the number in force and when, stamped with the session user', async () => {
    expect(await row(A.id)).toMatchObject({ agreed_terms_version: null, terms_accepted_at: null });

    const me = await agreeToTerms(asUser(A), 2);

    expect(me).toMatchObject({ id: A.id, agreedTermsVersion: 2 });
    expect(await row(A.id)).toMatchObject({
      agreed_terms_version: 2,
      terms_accepted_at: expect.any(Date),
      updated_by: A.id,
    });
  });

  it("leaves another user's row untouched", async () => {
    const before = await row(B.id);

    await agreeToTerms(asUser(A), 2);

    expect(before.agreed_terms_version).toBeNull();
    expect(await row(B.id)).toEqual(before);
  });

  // Version 1 was in force once, so a page left open across the publish of 2 would send it; 3 is a draft no reader was shown.
  it.each([
    ['a version no longer in force', 1],
    ['a draft version', 3],
    ['a version never written', 9],
  ])('refuses %s with an explaining error, and writes nothing', async (_label, version) => {
    // Precondition: the number in force is 2, which the same caller is then let agree to.
    expect(await currentTermsVersion()).toBe(2);

    const refusal = await agreeToTerms(asUser(A), version).then(
      () => null,
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    const { issues } = refusal as ValidationError;
    expect(issues.map((issue) => issue.path)).toEqual([['version']]);
    // An explaining error, not the default one.
    expect(issues[0]?.message).not.toBe(new ValidationError([]).message);
    expect(await row(A.id)).toMatchObject({ agreed_terms_version: null, terms_accepted_at: null });

    await agreeToTerms(asUser(A), 2);
    expect((await row(A.id)).agreed_terms_version).toBe(2);
  });

  it('refuses a session whose row is gone', async () => {
    await expect(
      agreeToTerms({ userId: '00000000-0000-0000-0000-00000000ffff', role: 'user' }, 2),
    ).rejects.toBeInstanceOf(NotFound);
  });
});

describe('hasAgreedToTerms', () => {
  it('is true only for the number in force', () => {
    expect(hasAgreedToTerms(2, 2)).toBe(true);
    expect(hasAgreedToTerms(1, 2)).toBe(false);
    expect(hasAgreedToTerms(null, 2)).toBe(false);
    expect(hasAgreedToTerms(undefined, 2)).toBe(false);
  });

  // Every protected page sends an account that has not agreed to the terms page, which has nothing to show while none are published.
  it('asks no account to agree while no terms are published', async () => {
    await sql`truncate documents cascade`;
    const agreed = (await row(A.id)).agreed_terms_version;
    // Preconditions: nothing is in force, and A has never agreed to anything.
    expect(await currentTermsVersion()).toBe(0);
    expect(agreed).toBeNull();

    expect(hasAgreedToTerms(agreed, await currentTermsVersion())).toBe(true);
    expect(hasAgreedToTerms(undefined, 0)).toBe(true);
  });
});

// Publishing goes through the admin's own services, as the editor does, so the number in force moves the way it moves in use.
describe('a newly published document', () => {
  /** Saves a changed body into a draft of `key` and publishes it, as E. */
  async function publishAnEdit(documentId: string, key: 'terms' | 'privacy'): Promise<void> {
    const editing = await readDocumentForEditing(asUser(E), key);
    const draft = await saveDocumentDraft(asUser(E), documentId, {
      body: `${editing.draft?.body ?? editing.published?.body ?? ''}\n\nFixture added sentence.`,
      expectedRevision: editing.draft?.revision ?? null,
    });
    await publishDocumentDraft(asUser(E), documentId, { expectedRevision: draft.revision });
  }

  it('asks an account that agreed to the terms to agree again, when it is the terms', async () => {
    await agreeToTerms(asUser(A), 2);
    const agreed = (await row(A.id)).agreed_terms_version;
    expect(hasAgreedToTerms(agreed, await currentTermsVersion())).toBe(true);

    await publishAnEdit(termsId, 'terms');

    expect(await currentTermsVersion()).toBe(3);
    expect(hasAgreedToTerms(agreed, await currentTermsVersion())).toBe(false);
    await agreeToTerms(asUser(A), 3);
    expect((await row(A.id)).agreed_terms_version).toBe(3);
  });

  it('leaves that agreement standing, when it is any other document', async () => {
    await agreeToTerms(asUser(A), 2);
    const agreed = (await row(A.id)).agreed_terms_version;

    await publishAnEdit(privacyId, 'privacy');

    // Precondition: the privacy policy did move on, so a publish happened.
    const [{ count }] = await sql`
      select count(*)::int as count from document_versions
      where document_id = ${privacyId} and status = 'published'`;
    expect(count).toBe(2);
    expect(await currentTermsVersion()).toBe(2);
    expect(hasAgreedToTerms(agreed, await currentTermsVersion())).toBe(true);
  });
});
