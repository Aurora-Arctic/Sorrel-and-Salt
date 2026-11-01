import type { ReactElement } from 'react';
import { SHAPES, lv, wv } from '../../components/JarShelf/shapes';
import type { JarPart, JarShapeName } from '../../components/JarShelf/types';
import { PALETTE } from './palette';

// The ingredient page's jar shelf, redrawn as plain SVG for the image renderer, which reads no stylesheet:
// the paint `src/components/JarShelf/index.scss` gives each part, in the shelf's drawing order
// (claude-docs/components/jar-shelf.md).

/** The paint a lid, cork, cloth or facet takes on the shelf. */
function paintOf(paint: JarPart['paint']) {
  if (paint === 'cork') {
    return { fill: PALETTE.chalk, fillOpacity: 0.35, stroke: PALETTE.chalk, strokeWidth: 1.2 };
  }
  if (paint === 'facet')
    return { fill: 'none', stroke: PALETTE.chalk, strokeWidth: 1, opacity: 0.4 };
  if (paint === 'cloth') return { fill: PALETTE.chalk, fillOpacity: 0.12 };
  return { fill: 'none', stroke: PALETTE.chalk, strokeWidth: 1.2 };
}

/** A part as its SVG element: called rather than rendered, since the renderer takes only plain elements inside an `<svg>`. */
function part(drawn: JarPart, key: number): ReactElement {
  const props = { ...paintOf(drawn.paint), ...drawn.attrs };
  if (drawn.el === 'rect') return <rect key={key} {...props} />;
  if (drawn.el === 'circle') return <circle key={key} {...props} />;
  return <path key={key} {...props} />;
}

/**
 * One vessel filled to `level`, `size` tall: lid, level, a faceted jar's shade and shine, glass, facets, wave.
 * `id` names its clip path, so it is unique on the card.
 */
function Vessel({
  shape,
  size,
  level,
  id,
}: {
  shape: JarShapeName;
  size: number;
  level: number;
  id: string;
}): ReactElement {
  const drawn = SHAPES[shape];
  const y = lv(shape, level);
  const clip = `url(#${id})`;
  return (
    <svg width={size * 1.2} height={size} viewBox="0 0 48 40">
      <defs>
        <clipPath id={id}>
          <path d={drawn.body} />
        </clipPath>
      </defs>
      {drawn.lid.map(part)}
      <g clipPath={clip}>
        <rect x={0} y={y} width={48} height={40} fill={PALETTE.sorrelBright} opacity={0.18} />
      </g>
      {drawn.shaded && (
        <g clipPath={clip}>
          <rect x={drawn.sx} y={0} width={8} height={40} fill={PALETTE.chalk} fillOpacity={0.08} />
          <rect
            x={(drawn.ex ?? 0) - 8}
            y={0}
            width={8}
            height={40}
            fill={PALETTE.sootRaised}
            fillOpacity={0.55}
          />
        </g>
      )}
      {/* An open body's neck runs on into its lid, so its top edge is left undrawn. */}
      <path
        d={drawn.open ? drawn.body.replace(/z$/, '') : drawn.body}
        fill="none"
        stroke={PALETTE.chalk}
        strokeWidth={1.2}
      />
      {(drawn.extra ?? []).map(part)}
      <g clipPath={clip}>
        <path
          d={wv(...drawn.wave)}
          fill="none"
          stroke={PALETTE.sorrelBright}
          strokeWidth={1.2}
          opacity={0.9}
          transform={`translate(0 ${y})`}
        />
      </g>
    </svg>
  );
}

/**
 * Vessels `vessel` px tall standing on the shelf's plank, with a bracket under each boundary between two
 * of them and none at the ends. The plank, bracket and radius are the page's 1.5, 7 and 6.4 px under its
 * 29.97 px drawing, scaled to `vessel`.
 */
export function Shelf({
  shapes,
  levels,
  vessel,
  gap,
}: {
  shapes: readonly JarShapeName[];
  levels: readonly number[];
  vessel: number;
  gap: number;
}): ReactElement {
  const scale = vessel / 29.97;
  const plank = 1.5 * scale;
  const bracket = 7 * scale;
  const radius = 6.4 * scale;
  const cell = vessel * 1.2 + gap;
  const width = cell * shapes.length;
  const height = plank + bracket;
  // Each bracket is a square hanging from the plank with its two outer bottom corners cut by a quarter circle.
  let brackets = '';
  for (let i = 1; i < shapes.length; i++) {
    const x = cell * i;
    brackets += `M${x - bracket} 0H${x + bracket}V${bracket - radius}A${radius} ${radius} 0 0 0 ${x + bracket - radius} ${bracket}H${x - bracket + radius}A${radius} ${radius} 0 0 0 ${x - bracket} ${bracket - radius}Z`;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', width, justifyContent: 'space-between' }}>
        {shapes.map((shape, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              width: cell,
              justifyContent: 'center',
              alignItems: 'flex-end',
            }}
          >
            <Vessel shape={shape} size={vessel} level={levels[i] ?? 0.7} id={`vessel-${i}`} />
          </div>
        ))}
      </div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ marginTop: -1 }}
      >
        <rect x={0} y={0} width={width} height={plank} fill={PALETTE.chalk} />
        <path d={brackets} fill={PALETTE.chalk} />
      </svg>
    </div>
  );
}
