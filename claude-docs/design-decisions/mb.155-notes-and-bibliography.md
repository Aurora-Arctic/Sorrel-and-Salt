# MB.155 — The page cites in notes and a bibliography

**Status:** decided · **Date:** 2026-10-17

MB.151 settled that a reference is one source, kept once and rendered in
Chicago form, and that a link to a row carries a locator. This record settles
how the ingredient page shows them. The first build put a References list in
the side column of Details and of each form, each source with its locator
beside it. The owner redesigned it after seeing it. DESIGN.md §5 ("References")
and §9 (the routes table) carry the result; this record carries the
alternatives.

## Decision

One **References** section sits at the foot of the page, beneath the forms and
above the slot for v2's notes, on the public route and a coven's alike. It
holds two parts:

- **Notes**, an ordered list. Each note is one reference with its locator, in
  Chicago's shortened form, with a link on to its bibliography entry and a
  link back to the section that cited it.
- **Bibliography**, every source once, alphabetical, in full form, with a link
  back to each note that cites it and a link to the source's `url`.

A section that cites sources of its own, Details and each form, ends with
its notes' numbers: superscript links under a small "References" label.
Numbers run in page order, the ingredient's first and then each form's. The
side column and the form sections carry no references.

## Alternatives offered

1. **One numbered list, as Wikipedia does.** Every number is a source, and a
   locator is written after the number. Rejected: one number cannot carry two
   locators, so a source cited at two places would need two numbers, and then
   the list is notes in all but name without a bibliography to order them.
2. **A hybrid: a numbered bibliography with the locator beside the number.**
   Chicago does not use it. Its numbers belong to notes, not to bibliography
   entries, and the hybrid still cannot carry two locators on one number.
3. **Chicago author-date, with "(Cunningham 1985, 42)" in the text.** It puts a
   citation in the middle of the sentence, and a page of short correspondence
   lists has no sentences to hang it on. Chicago offers it for the sciences;
   the works this compendium draws on are humanities works, which the
   notes-and-bibliography system serves.
4. **Notes and bibliography (chosen).**

## Why notes and bibliography

Chicago describes two documentation systems, and notes and bibliography is
the one for the humanities; the compendium's sources are humanities works
(MB.151). Its notes may be shortened when the work also appears in a
bibliography, which this page always has, so a note is brief while the
bibliography carries the full entry for a reader who wants to find the work.
A locator lives on its note, which is where a page number belongs and why one
note is made for each link: a source cited at two places in a section is one
link with both places in its locator (MB.154), and the reader sees them in one
note. The bibliography is alphabetical by the author's surname, so it needs no
stored order and the renderer MB.153 built sorts it (`byCitation`).

Source: Purdue Online Writing Lab, "Chicago Manual of Style, 18th Edition:
Formatting and Style Guide," Purdue University, accessed 2026-10-17,
https://owl.purdue.edu/owl/research_and_citation/chicago_manual_18th_edition/cmos_formatting_and_style_guide/chicago_manual_of_style_18th_edition.html.
It supports four things here: that Chicago has two systems, notes and
bibliography and author-date; that the notes system marks a note with a
superscript number after the sentence; that notes may be shortened when the
document includes a bibliography; and that the bibliography is alphabetical by
the author's surname. It does not decide how a web page should lay these out.
That is this project's choice, below.

## Why a number marks a section, not a sentence

The entry's text is data, a description and lists of correspondences, with no
claim a source could be pinned to. A source supports a row as a whole, so the
number ends the section that row belongs to: Details for the ingredient, a
form's section for the form. That also keeps a number's meaning honest. It
never suggests that one particular sentence rests on one source.

## Where the numbers sit

At the end of a section's text, on a line of their own under a small
"References" label, and not on the heading. A number on a heading would
read as part of its name and would be spoken with it by a screen reader. The
label is not a heading, so the page's outline keeps one References heading
(the h2 at the foot, with Notes and Bibliography at h3); the numbers form a
group named by the label. The links rest in the body ink and fade to the link
colour on hover and focus, as they do throughout the section (the owner's
call).

## No tooltip

A note's text could have appeared in a tooltip on its number. The owner chose
not to: a tooltip hides the text from touch and keyboard readers, and the
number already jumps to the note, with a link back. The jump and its return
carry the reading.

## Ids

`note-N` for a note, `note-ref-N` for the number that points at it, and
`ref-<referenceId>` for a bibliography entry, so every link in the section,
and the jump menu's References entry, is a plain fragment.
