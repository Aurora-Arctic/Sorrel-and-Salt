import type { StockDialogProps } from '../StockDialog/types';

export interface JarPart {
  el: 'rect' | 'circle' | 'path';
  paint: 'lid' | 'cork' | 'cloth' | 'facet';
  attrs: Readonly<Record<string, string | number>>;
}

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

export interface JarShape {
  full: number;
  body: string;
  lid: readonly JarPart[];
  extra?: readonly JarPart[];
  open?: boolean;
  sx?: number;
  ex?: number;
  shaded?: boolean;
  wave: readonly [number, number];
}

export interface HeldJar {
  id: string;
  quantity: number | null;
  unit: string | null;
  threshold: number | null;
}

export interface ShelfForm {
  variantId: string;
  form: string;
  jar: HeldJar | null;
}

export interface JarShelfProps {
  forms: readonly ShelfForm[];
  seed: string;
  edit?: StockDialogProps;
}
