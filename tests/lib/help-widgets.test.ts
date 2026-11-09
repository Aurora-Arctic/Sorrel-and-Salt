import { describe, expect, it } from 'vitest';
import { HELP_WIDGETS, unknownWidgets, widgetOf, widgetsInMarkdown } from '@/lib/help-widgets';

// A help body places a widget as `::widget[name]` on a paragraph of its own; the names are a fixed list in code
// (claude-docs/components/help-pages.md, "Widgets").

describe('HELP_WIDGETS', () => {
  it('names the four widgets', () => {
    expect([...HELP_WIDGETS].sort()).toEqual([
      'autosave-status',
      'invitation-refusals',
      'role-permission-table',
      'unit-converter',
    ]);
  });
});

describe('widgetsInMarkdown', () => {
  it('finds each tag in a body, in order, wherever it stands in the text', () => {
    expect(
      widgetsInMarkdown('Intro.\n\n::widget[unit-converter]\n\nSee ::widget[testwort-gone] here.'),
    ).toEqual(['unit-converter', 'testwort-gone']);
  });

  it('reads a tag in code as written, not as a tag', () => {
    expect(widgetsInMarkdown('Type `::widget[testwort-gone]`.\n\n```\n::widget[x]\n```')).toEqual(
      [],
    );
  });
});

describe('unknownWidgets', () => {
  it('names each tag the list does not hold, once, and none it does', () => {
    expect(
      unknownWidgets(
        '::widget[unit-converter]\n\n::widget[testwort-one]\n\n::widget[testwort-one] ::widget[testwort-two]',
      ),
    ).toEqual(['testwort-one', 'testwort-two']);
  });
});

describe('widgetOf', () => {
  it('reads the name from a paragraph that is a tag alone', () => {
    expect(widgetOf('  ::widget[role-permission-table] ')).toBe('role-permission-table');
  });

  it('reads no name from a tag inside a sentence, or one the list does not hold', () => {
    expect(widgetOf('See ::widget[unit-converter] here.')).toBeUndefined();
    expect(widgetOf('::widget[testwort-gone]')).toBeUndefined();
  });
});
