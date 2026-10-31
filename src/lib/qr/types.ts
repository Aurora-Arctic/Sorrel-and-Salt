export interface RoundedSquare {
  x: number;
  y: number;
  size: number;
  radius: number;
}

/** One finder pattern: a rounded ring with a see-through middle, and a rounded centre. */
export interface QrFinder {
  outer: RoundedSquare;
  inner: RoundedSquare;
  centre: RoundedSquare;
}

/** A QR code as the shapes it is drawn from, in module units with the grid's top left at 0,0. */
export interface QrShapes {
  size: number;
  dotRadius: number;
  dots: { cx: number; cy: number }[];
  finders: QrFinder[];
}
