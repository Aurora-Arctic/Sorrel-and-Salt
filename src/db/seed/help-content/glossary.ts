import { term } from './build';

export const GLOSSARY_ENTRIES = [
  term(
    'Compendium',
    'The shared reference of ingredients, kept by Keepers and curators. It shows what exists, and anyone can read it.',
  ),
  term('Ingredients', "Your coven's own ingredients and their stock. It shows what you have."),
  term('Grimoire', "Your coven's spells. It shows what you make."),
  term(
    'Coven',
    'A group that shares ingredients and a grimoire, with each member in one of three roles.',
  ),
  term(
    'Steward',
    'The top coven role. A Steward can do everything a Practitioner can, and also invites and removes members and edits or deletes the coven.',
  ),
  term(
    'Practitioner',
    'A coven role that can add and change ingredients, spells and workings and update stock.',
  ),
  term(
    'Observer',
    'A read-only coven role. An Observer writes nothing to a coven, but can still send a support request.',
  ),
  term(
    'Keeper',
    'A site role for those who run the site: they curate the Compendium and the site documents, review support requests and grant site roles.',
  ),
  term(
    'Curator',
    'A site role that curates the Compendium and its vocabularies and answers support requests assigned to them. A curator has no Keeper powers.',
  ),
  term(
    'Spell',
    "A recipe in a coven's Grimoire: a title, an intent, steps, optional timing and categories.",
  ),
  term(
    'Working',
    'A record that a spell was worked on a day, by named participants. Completing it takes stock out of your jars.',
  ),
  term(
    'Variant',
    'One form an ingredient comes in, kept beneath the ingredient. It adds to the ingredient and never removes from it.',
  ),
  term(
    'Form',
    'The text naming how an ingredient comes, such as dried or fresh. Each form is a variant with its own stock.',
  ),
  term(
    'Draft',
    'A spell not yet complete. It can still change freely, and a complete spell never goes back to one.',
  ),
  term(
    'Complete',
    'A spell that has been finished and has a title. Its visibility can only widen from then on.',
  ),
  term('Formal Name', 'The name that identifies an ingredient. No two ingredients share one.'),
  term(
    'Common Name',
    'A folk name for an ingredient. It is not unique, and two ingredients may share one.',
  ),
  term(
    'Reference',
    'A source the Compendium cites for a claim, with a locator pointing to where in the work it appears.',
  ),
  term(
    'Category',
    "A label for what an ingredient or spell is for or does. A spell's assigned categories are what it intends, and its derived ones come from its ingredients.",
  ),
  term(
    'Stock',
    'The quantity of a form your coven holds in its jar, with an optional low-stock level.',
  ),
  term(
    'Demo Coven',
    'The shared practice coven that every account is seated in as an Observer. It cannot be deleted.',
  ),
  term(
    'Invitation',
    'A message that offers a seat in a coven as an Observer or a Practitioner. It lasts seven days.',
  ),
  term(
    'Support Request',
    "A message to the site's Keepers and curators asking for help or reporting a problem.",
  ),
];
