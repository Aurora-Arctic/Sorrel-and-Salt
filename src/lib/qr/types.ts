export interface RoundedSquare {
  x: number;
  y: number;
  size: number;
  radius: number;
}

export interface QrFinder {
  outer: RoundedSquare;
  inner: RoundedSquare;
  centre: RoundedSquare;
}

export interface QrShapes {
  size: number;
  dotRadius: number;
  dots: { cx: number; cy: number }[];
  finders: QrFinder[];
}
