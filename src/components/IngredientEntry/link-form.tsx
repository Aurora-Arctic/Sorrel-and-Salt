'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';
import type { Route } from 'next';
import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { usePendingNavigation } from '../../lib/navigation';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlIssues } from '../../lib/graphql-failure';
import { ingredientLinkTarget } from '../AppShell/site-target';
import BusyButton from '../BusyButton';
import Combobox from '../Combobox';
import { FieldShell, fieldDescription } from '../Field';
import { RemoveIcon } from '../IngredientForm/icons';
import { useCompendiumSubstitutes } from '../IngredientForm/suggestions';
import { useTip } from '../InfoTip/use-tip';
import Notice from '../Notice';
import type { LinkFormProps, LinkPick } from './types';
import './link-form.scss';

/** Why a form with no jars, no spells and no pick that has it goes nowhere. */
const NOTHING_MOVES =
  'This form holds no jars or spells, and none of the picked entries has it, so nothing moves.';

// The Link dialog's body (M8.17): a search of the compendium whose picks list
// as rows beneath it, as References' do, each with its formal name and forms
// in a tooltip on its name, as a substitute chip shows its detail, then
// the form map, which says where each of the coven's forms goes. A form goes
// to the one pick with a form of its name, matched as the service matches
// (trimmed, lower-cased); where two picks have it the member chooses, and a
// form no pick has is dropped. Link waits until every form holding a jar or a
// spell has a home, so the service's refusals are what the page could not
// know: a jar or a layer that would meet one of a pick's own. Beneath the map,
// a select says which pick keeps the coven's name for the entry as its label:
// the first pick until another is chosen, or none, and asked with one pick
// too, since the coven may want the compendium's name. One pick is the
// old Link; several split the entry (the owner's call, 2026-10-20). A
// success goes to the first pick's page in the coven, since the own entry is
// gone; a refusal shows here and nothing has moved.

const SplitLocalDocument = graphql(`
  mutation SplitLocalIntoCompendiumEntries(
    $workspaceId: ID!
    $localId: ID!
    $picks: [ID!]!
    $assignments: [FormAssignmentInput!]
    $labelOn: ID
  ) {
    splitLocalIntoCompendiumEntries(
      workspaceId: $workspaceId
      localId: $localId
      picks: $picks
      assignments: $assignments
      labelOn: $labelOn
    ) {
      entries {
        id
      }
    }
  }
`);

/** A form's identity, as the service folds it: the client cannot import the server's. */
const fold = (form: string) => form.trim().toLowerCase();

const counted = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "2 jars · 1 spell", or "Nothing". */
function holdsText(jars: number, spells: number): string {
  const parts = [
    jars > 0 && counted(jars, 'jar', 'jars'),
    spells > 0 && counted(spells, 'spell', 'spells'),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Nothing';
}

/**
 * One pick's row: its name, its formal name and forms, and its ×. The formal
 * name and forms also show in a tooltip while the name is hovered or the ×
 * has focus, closed by Escape, as a substitute chip's detail does (MB.164,
 * Combobox/entry.tsx): the chip's text is not in the tab order unless it opens
 * something, so its × carries the focus and reads the detail as its
 * description, and so does this one.
 */
function PickRow({ pick, onRemove }: { pick: LinkPick; onRemove: () => void }): ReactElement {
  const detailId = useId();
  const { canonicalName, forms } = pick.link;
  const hasDetail = Boolean(canonicalName) || forms.length > 0;
  const { open, show, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip(
    () => hasDetail,
    'top-start',
  );
  const detail = (
    <>
      {canonicalName && <i>{canonicalName}</i>}
      {canonicalName && forms.length > 0 && ' · '}
      {forms.map(formLabel).join(', ')}
    </>
  );
  return (
    <li className="link-form__pick">
      <span className="link-form__pick-name">
        {/* Hover on a wrapper holding the tooltip as well as the name, so the
            pointer can move onto the tooltip without closing it. */}
        <span ref={anchor} onMouseEnter={show} onMouseLeave={hideSoon}>
          {pick.name}
          {/* In the page while closed, faded out and aria-hidden, so it
              fades both ways and the × can still read it. */}
          <span
            ref={bubble}
            id={detailId}
            role="tooltip"
            style={bubbleStyle}
            className={open ? 'link-form__tip is-open' : 'link-form__tip'}
            aria-hidden={!open}
          >
            {detail}
          </span>
        </span>{' '}
        <small>{detail}</small>
      </span>
      <button
        type="button"
        className="link-form__icon-button link-form__remove"
        aria-label={`Remove ${pick.name}`}
        aria-describedby={hasDetail ? detailId : undefined}
        onFocus={show}
        onBlur={hide}
        onClick={onRemove}
      >
        <RemoveIcon />
      </button>
    </li>
  );
}

export default function LinkForm({
  workspaceId,
  localId,
  name,
  ingredientsHref,
  holdings,
  onCancel,
}: LinkFormProps): ReactElement {
  const id = useId();
  const { navigate } = usePendingNavigation();
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const [picks, setPicks] = useState<LinkPick[]>([]);
  /** Where each form two picks share goes, by form id, as chosen. */
  const [chosen, setChosen] = useState<Record<string, string>>({});
  /** The pick chosen to keep the name; `undefined` is the first pick, `null` none. */
  const [keepOn, setKeepOn] = useState<string | null>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const suggestions = useCompendiumSubstitutes(null, text, active);
  const hint = 'The compendium entries this becomes. Your jars and spells move to them.';
  const { aria, ...shell } = fieldDescription({ id, hint });

  const rows = holdings.map((holding) => {
    const key = fold(holding.form);
    const homes = picks.filter(({ link }) => link.forms.some((form) => fold(form) === key));
    const choice =
      homes.length === 1 ? homes[0].id : homes.find(({ id }) => id === chosen[holding.formId])?.id;
    return { ...holding, homes, choice, holds: holding.jars + holding.spells > 0 };
  });
  const labelOn = keepOn === undefined ? picks[0]?.id : keepOn;
  const { aria: keepAria, ...keep } = fieldDescription({ id: `${id}-keep` });
  const ready = picks.length > 0 && rows.every((row) => !row.holds || row.choice !== undefined);

  async function link() {
    setBusy(true);
    setFailure(undefined);
    try {
      await graphqlRequest(SplitLocalDocument, {
        workspaceId,
        localId,
        picks: picks.map(({ id }) => id),
        assignments: rows.flatMap(({ formId, homes, choice }) =>
          homes.length > 1 && choice !== undefined ? [{ formId, compendiumId: choice }] : [],
        ),
        labelOn: labelOn ?? null,
      });
      // Busy until the page is left; the own entry no longer exists.
      const thenHref = `${ingredientsHref}/${picks[0].id}` as Route;
      navigate(thenHref, { target: ingredientLinkTarget(thenHref) });
    } catch (error) {
      setFailure(
        readGraphqlIssues(error)
          .map(({ message }) => message)
          .join(' '),
      );
      setBusy(false);
    }
  }

  return (
    <div className="link-form">
      <FieldShell
        label="Compendium Entry"
        hint={hint}
        required
        className="link-form__search"
        {...shell}
      >
        <Combobox
          id={shell.controlId}
          label="Compendium Entry"
          labelId={shell.labelId}
          value={text}
          onChange={setText}
          onFocus={() => setActive(true)}
          onPick={(value, option) => {
            setText('');
            const link = option?.link;
            if (
              !option?.key ||
              !link ||
              !('forms' in link) ||
              picks.some(({ id }) => id === option.key)
            )
              return;
            setPicks([...picks, { id: option.key, name: value, link }]);
          }}
          suggestions={suggestions}
          offerTyped={false}
          placeholder="Search the compendium"
          required
          {...aria}
        />
      </FieldShell>
      {picks.length > 0 && (
        <ul className="link-form__picks" aria-label="Picked Entries">
          {picks.map((pick) => (
            <PickRow
              key={pick.id}
              pick={pick}
              onRemove={() => {
                setPicks(picks.filter(({ id }) => id !== pick.id));
                // The name goes back to the first pick, not to none.
                if (keepOn === pick.id) setKeepOn(undefined);
              }}
            />
          ))}
        </ul>
      )}
      {picks.length > 0 && rows.length > 0 && (
        <div className="link-form__map">
          <table aria-label="Where Each Form Goes">
            <thead>
              <tr>
                <th scope="col">Our Form</th>
                <th scope="col">Holds</th>
                <th scope="col">Goes To</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const label = formLabel(row.form);
                return (
                  <tr key={row.formId}>
                    <th scope="row">{label}</th>
                    <td className="link-form__holds">{holdsText(row.jars, row.spells)}</td>
                    <td>
                      {row.homes.length > 1 ? (
                        <select
                          className={[
                            'select',
                            row.holds && row.choice === undefined && 'link-form__unchosen',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          aria-label={`${label} Goes To`}
                          value={row.choice ?? ''}
                          onChange={(event) =>
                            setChosen({ ...chosen, [row.formId]: event.target.value })
                          }
                        >
                          <option value="">Choose an entry</option>
                          {row.homes.map((home) => (
                            <option key={home.id} value={home.id}>
                              {home.name}
                            </option>
                          ))}
                        </select>
                      ) : row.homes.length === 1 ? (
                        row.homes[0].name
                      ) : row.holds ? (
                        <span className="link-form__unchosen">No picked entry has this form</span>
                      ) : (
                        // A dash rather than words, with no tip beside it;
                        // a screen reader hears the reason in its place, as
                        // hidden text (the owner's call, 2026-10-20).
                        <span className="link-form__dropped">
                          <span aria-hidden="true">—</span>
                          <span className="visually-hidden">{NOTHING_MOVES}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {picks.length > 0 && (
        <FieldShell label={`Keep Our Name “${name}” On`} {...keep}>
          <select
            id={keep.controlId}
            {...keepAria}
            className="select"
            value={labelOn ?? ''}
            onChange={(event) => setKeepOn(event.target.value || null)}
          >
            {picks.map((pick) => (
              <option key={pick.id} value={pick.id}>
                {pick.name}
              </option>
            ))}
            <option value="">None</option>
          </select>
        </FieldShell>
      )}
      {failure && <Notice kind="error">{failure}</Notice>}
      <div className="modal__actions">
        <BusyButton
          className="btn btn--solid"
          busy={busy}
          busyLabel="Linking"
          disabled={busy || !ready}
          onClick={() => void link()}
        >
          Link
        </BusyButton>
        <button type="button" className="btn btn--quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
