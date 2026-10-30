import type { StockDialogProps } from '../StockDialog/types';

/** The drawing of one part of a jar: a lid, a cork, a facet. Plain data, drawn as an SVG element. */
export interface JarPart {
  el: 'rect' | 'circle' | 'path';
  /** Which paint it takes (`jar-shelf__lid` and so on). */
  paint: 'lid' | 'cork' | 'cloth' | 'facet';
  attrs: Readonly<Record<string, string | number>>;
}

/** The names of the eleven drawn vessels. */
export type JarShapeName =
  | 'hex'
  | 'mason'
  | 'apoth'
  | 'cork'
  | 'clip'
  | 'honey'
  | 'cloth'
  | 'erlen'
  | 'bottle'
  | 'flask'
  | 'vial';

/** One vessel, drawn in a 48 by 40 box. */
export interface JarShape {
  /** Y of the level in a full vessel; an empty one is at 40. */
  full: number;
  /** The body's outline, which clips the level and is stroked as the glass. */
  body: string;
  /** Drawn before the level. */
  lid: readonly JarPart[];
  /** Drawn over the glass. */
  extra?: readonly JarPart[];
  /** An open body leaves its top edge undrawn: its neck carries on into the lid. */
  open?: boolean;
  /** The widest edges of the body, where a shaded vessel's shade and shine fall. */
  sx?: number;
  ex?: number;
  shaded?: boolean;
  /** The wave on the level: its period and amplitude. */
  wave: readonly [number, number];
}

/** A jar the coven holds, as the shelf needs it. */
export interface HeldJar {
  id: string;
  /** On hand: `null` is held but not measured, `0` is out. */
  quantity: number | null;
  unit: string | null;
  /** The low-stock threshold, `null` or 0 for none. */
  threshold: number | null;
}

/** One place on the shelf: a form of the entry, with the jar the coven holds of it, if any. */
export interface ShelfForm {
  variantId: string;
  /** The variant's form as stored. It decides the vessel, and the shelf writes it through `formLabel`. */
  form: string;
  jar: HeldJar | null;
}

export interface JarShelfProps {
  /** Every form of the entry, in the order they are shown. */
  forms: readonly ShelfForm[];
  /** What the vessels are drawn from with each form: the entry's formal name, or its id when it has none. */
  seed: string;
  /** Present for a role that may edit stock: each jar becomes a button opening the dialog on it. */
  edit?: StockDialogProps;
}
