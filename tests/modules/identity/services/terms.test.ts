import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { agreementIsCurrent } from '@/lib/agreement-version';
import { NotFound, ValidationError } from '@/lib/errors';
import type { AgreedVersion, AgreementVersion } from '@/lib/types';
import {
  currentAgreementVersion,
  publishDocumentDraft,
  readDocumentForEditing,
  saveDocumentDraft,
} from '@/modules/documents';
import type { DocumentKey } from '@/modules/documents';
import { agreeToTerms } from '@/modules/identity';
import { A, B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';

// The versions in force are each agreed document's highest published version number: the terms, the disclaimer and the code of
// ethics, which the terms include. An account has agreed when it recorded all three. Agreement is recorded by the service alone,
// stamped with the session's user, and only at the three numbers in force, so a page left open across a publish cannot agree to the
// text it showed (claude-docs/design-decisions/support.md, "Agreeing to the terms covers the disclaimer and the code of ethics").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

interface AgreementRow {
  agreed_terms_version: number | null;
  agreed_disclaimer_version: number | null;
  agreed_ethics_version: number | null;
  terms_accepted_at: Date | null;
  updated_by: string;
}

async function row(id: string): Promise<AgreementRow> {
  const [found] = await sql`
    select agreed_terms_version, agreed_disclaimer_version, agreed_ethics_version, terms_accepted_at, updated_by
    from users where id = ${id}`;
  return found as AgreementRow;
}

const agreedOf = (found: AgreementRow): AgreedVersion => ({
  terms: found.agreed_terms_version,
  disclaimer: found.agreed_disclaimer_version,
  ethics: found.agreed_ethics_version,
});

const NOT_AGREED = {
  agreed_terms_version: null,
  agreed_disclaimer_version: null,
  agreed_ethics_version: null,
  terms_accepted_at: null,
};

// Terms 2 (3 an open draft), disclaimer 1, code of ethics 2.
const IN_FORCE: AgreementVersion = { terms: 2, disclaimer: 1, ethics: 2 };

const documentIds: Partial<Record<DocumentKey, string>> = {};

beforeEach(async () => {
  await sql`truncate documents cascade`;
  documentIds.terms = await insertDocument(sql, { key: 'terms', title: 'Fixture Terms' }, E.id);
  await insertDocumentVersion(sql, documentIds.terms, { number: 1 }, E.id);
  await insertDocumentVersion(
    sql,
    documentIds.terms,
    { number: 2, published_at: '2026-04-05 00:00:00' },
    E.id,
  );
  await insertDocumentVersion(sql, documentIds.terms, { number: 3, status: 'draft' }, E.id);
  documentIds.disclaimer = await insertDocument(sql, { key: 'disclaimer' }, E.id);
  await insertDocumentVersion(sql, documentIds.disclaimer, { number: 1 }, E.id);
  documentIds['code-of-ethics'] = await insertDocument(sql, { key: 'code-of-ethics' }, E.id);
  for (const number of [1, 2]) {
    await insertDocumentVersion(sql, documentIds['code-of-ethics'], { number }, E.id);
  }
  documentIds.privacy = await insertDocument(sql, { key: 'privacy' }, E.id);
  await insertDocumentVersion(sql, documentIds.privacy, { number: 1 }, E.id);
  // Neither has agreed, so a number on a row shows as this call's write.
  for (const user of [A, B]) {
    await sql`
      update users set agreed_terms_version = null, agreed_disclaimer_version = null, agreed_ethics_version = null,
        terms_accepted_at = null
      where id = ${user.id}`;
  }
});

describe('currentAgreementVersion', () => {
  it('is each document’s highest published version, which an open draft past it does not displace', async () => {
    expect(await currentAgreementVersion()).toEqual(IN_FORCE);
  });

  it('is 0 for a document with no published version', async () => {
    await sql`truncate documents cascade`;
    const terms = await insertDocument(sql, { key: 'terms' }, E.id);
    await insertDocumentVersion(sql, terms, { number: 4 }, E.id);
    const ethics = await insertDocument(sql, { key: 'code-of-ethics' }, E.id);
    await insertDocumentVersion(sql, ethics, { number: 1, status: 'draft' }, E.id);

    expect(await currentAgreementVersion()).toEqual({ terms: 4, disclaimer: 0, ethics: 0 });
  });
});

describe('agreeToTerms', () => {
  it('records the three numbers in force and when, stamped with the session user', async () => {
    expect(await row(A.id)).toMatchObject(NOT_AGREED);

    const me = await agreeToTerms(asUser(A), IN_FORCE);

    expect(me).toMatchObject({
      id: A.id,
      agreedTermsVersion: 2,
      agreedDisclaimerVersion: 1,
      agreedEthicsVersion: 2,
    });
    expect(await row(A.id)).toMatchObject({
      agreed_terms_version: 2,
      agreed_disclaimer_version: 1,
      agreed_ethics_version: 2,
      terms_accepted_at: expect.any(Date),
      updated_by: A.id,
    });
  });

  it("leaves another user's row untouched", async () => {
    const before = await row(B.id);

    await agreeToTerms(asUser(A), IN_FORCE);

    expect(before.agreed_terms_version).toBeNull();
    expect(await row(B.id)).toEqual(before);
  });

  // Each part on its own out of step, as a page left open across one document's publish would send it, beside a draft no reader
  // was shown and a number never written.
  it.each([
    ['terms no longer in force', { ...IN_FORCE, terms: 1 }],
    ['a disclaimer no longer in force', { ...IN_FORCE, disclaimer: 0 }],
    ['a code of ethics no longer in force', { ...IN_FORCE, ethics: 1 }],
    ['a draft terms version', { ...IN_FORCE, terms: 3 }],
    ['a disclaimer version never written', { ...IN_FORCE, disclaimer: 9 }],
  ])('refuses %s with an explaining error, and writes nothing', async (_label, version) => {
    // Precondition: the numbers in force are IN_FORCE, which the same caller is then let agree to.
    expect(await currentAgreementVersion()).toEqual(IN_FORCE);

    const refusal = await agreeToTerms(asUser(A), version).then(
      () => null,
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    const { issues } = refusal as ValidationError;
    expect(issues.map((issue) => issue.path)).toEqual([['version']]);
    // An explaining error, not the default one.
    expect(issues[0]?.message).not.toBe(new ValidationError([]).message);
    expect(await row(A.id)).toMatchObject(NOT_AGREED);

    await agreeToTerms(asUser(A), IN_FORCE);
    expect(agreedOf(await row(A.id))).toEqual(IN_FORCE);
  });

  it('refuses a session whose row is gone', async () => {
    await expect(
      agreeToTerms({ userId: '00000000-0000-0000-0000-00000000ffff', role: 'user' }, IN_FORCE),
    ).rejects.toBeInstanceOf(NotFound);
  });

  // Every protected page sends an account that has not agreed to the terms page, which has nothing to show while none are published.
  it('asks no account to agree while no document is published', async () => {
    await sql`truncate documents cascade`;
    const agreed = agreedOf(await row(A.id));
    // Preconditions: nothing is in force, and A has never agreed to anything.
    expect(await currentAgreementVersion()).toEqual({ terms: 0, disclaimer: 0, ethics: 0 });
    expect(agreed).toEqual({ terms: null, disclaimer: null, ethics: null });

    expect(agreementIsCurrent(agreed, await currentAgreementVersion())).toBe(true);
  });
});

// Publishing goes through the admin's own services, as the editor does, so the numbers in force move the way they move in use.
describe('a newly published document', () => {
  async function publishAnEdit(key: DocumentKey): Promise<void> {
    const documentId = documentIds[key] as string;
    const editing = await readDocumentForEditing(asUser(E), key);
    const draft = await saveDocumentDraft(asUser(E), documentId, {
      body: `${editing.draft?.body ?? editing.published?.body ?? ''}\n\nFixture added sentence.`,
      expectedRevision: editing.draft?.revision ?? null,
    });
    await publishDocumentDraft(asUser(E), documentId, { expectedRevision: draft.revision });
  }

  it.each([
    ['terms', { ...IN_FORCE, terms: 3 }],
    ['disclaimer', { ...IN_FORCE, disclaimer: 2 }],
    ['code-of-ethics', { ...IN_FORCE, ethics: 3 }],
  ] as const)(
    'asks an account that agreed to agree again, when it is the %s',
    async (key, moved) => {
      await agreeToTerms(asUser(A), IN_FORCE);
      const agreed = agreedOf(await row(A.id));
      expect(agreementIsCurrent(agreed, await currentAgreementVersion())).toBe(true);

      await publishAnEdit(key);

      expect(await currentAgreementVersion()).toEqual(moved);
      expect(agreementIsCurrent(agreed, await currentAgreementVersion())).toBe(false);
      await expect(agreeToTerms(asUser(A), IN_FORCE)).rejects.toBeInstanceOf(ValidationError);
      await agreeToTerms(asUser(A), moved);
      expect(agreedOf(await row(A.id))).toEqual(moved);
    },
  );

  it('leaves that agreement standing, when it is the privacy policy', async () => {
    await agreeToTerms(asUser(A), IN_FORCE);
    const agreed = agreedOf(await row(A.id));

    await publishAnEdit('privacy');

    // Precondition: the privacy policy did move on, so a publish happened.
    const [{ count }] = await sql`
      select count(*)::int as count from document_versions
      where document_id = ${documentIds.privacy as string} and status = 'published'`;
    expect(count).toBe(2);
    expect(await currentAgreementVersion()).toEqual(IN_FORCE);
    expect(agreementIsCurrent(agreed, await currentAgreementVersion())).toBe(true);
  });
});
