'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement, useEffect, useState } from 'react';
import { FormProvider, type Resolver, useForm } from 'react-hook-form';
import { emailFormat } from '../../lib/email-address';
import { renderBusinessCards } from '../../lib/business-cards/pdf';
import { phoneMask } from '../../lib/phone-number';
import { fetchCardAssets } from '../../lib/invitation-cards/assets';
import type { CardAssets } from '../../lib/invitation-cards/types';
import { slugify } from '../../lib/slugify';
import { saveFile } from '../../lib/save-file';
import { FormActions, FormErrorSummary, SwitchField, TextField } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { BusinessCardSchema } from './schema';
import type { BusinessCardValues } from './types';
import './index.scss';

const EMPTY: BusinessCardValues = { name: '', email: '', phone: '' };

// (claude-docs/components/business-cards.md)
const BusinessCards = (): ReactElement => {
  const [assets, setAssets] = useState<CardAssets | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [backs, setBacks] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildFailed, setBuildFailed] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const methods = useForm<BusinessCardValues>({
    defaultValues: EMPTY,
    mode: 'onTouched',
    shouldFocusError: false,
    resolver: zodResolver(BusinessCardSchema) as Resolver<BusinessCardValues>,
  });
  const { isDirty } = methods.formState;
  const discard = useDiscardGuard(isDirty);

  useEffect(() => {
    let live = true;
    fetchCardAssets().then(
      (loaded) => live && setAssets(loaded),
      () => live && setLoadFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  const generate = async (details: BusinessCardValues): Promise<void> => {
    if (!assets) return;
    setBuilding(true);
    setBuildFailed(false);
    setSaved(null);
    try {
      const bytes = await renderBusinessCards({ ...details, backs }, assets);
      const filename = `business-cards-${slugify(details.name)}.pdf`;
      saveFile(new Blob([bytes as BlobPart], { type: 'application/pdf' }), filename);
      setSaved(filename);
    } catch {
      setBuildFailed(true);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        className="form business-cards admin-index"
        noValidate
        onSubmit={methods.handleSubmit(generate)}
      >
        <p>
          Ten cards to a Letter sheet, with a page of their backs if you want one. The PDF is built
          in this browser, and nothing you type here is saved.
        </p>
        {loadFailed && (
          <Notice kind="error">
            The card fonts and pictures could not be loaded. Reload the page.
          </Notice>
        )}
        <FormErrorSummary />
        <TextField<BusinessCardValues> name="name" label="Name" required placeholder="Add a name" />
        <TextField<BusinessCardValues>
          name="email"
          label="Email"
          type="email"
          required
          placeholder="Add an email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          format={emailFormat}
        />
        <TextField<BusinessCardValues>
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          mask={phoneMask}
          required
          placeholder="Add a phone"
        />
        <SwitchField
          label="Include Backs"
          name="backs"
          value="1"
          checked={backs}
          disabled={building}
          onChange={setBacks}
        />
        <div aria-live="polite">
          {saved && (
            <Notice kind="success" inRegion>
              Saved as {saved}.
            </Notice>
          )}
        </div>
        {buildFailed && <Notice kind="error">The PDF could not be built. Try again.</Notice>}
        <FormActions
          noun="Business Cards"
          label="Generate"
          busyLabel="Generating"
          dirty={assets !== null}
          submitting={building}
        />
        {discard.asking && <DiscardQuestion guard={discard} />}
      </form>
    </FormProvider>
  );
};

export default BusinessCards;
