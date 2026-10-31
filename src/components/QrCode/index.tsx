import type { ReactElement } from 'react';
import { qrShapes, roundedSquarePath } from '../../lib/qr';
import type { QrCodeProps } from './types';

// The same round dots and rounded finders as the printed invitation card (src/lib/qr). The shapes fill
// with `currentcolor`, so the caller sets the dot colour with `color`.
const QrCode = ({ value, label, className }: QrCodeProps): ReactElement => {
  const { size, dotRadius, dots, finders } = qrShapes(value);
  return (
    <svg
      className={className}
      viewBox={`0 0 ${size} ${size}`}
      fill="currentColor"
      role="img"
      aria-label={label}
    >
      {finders.map(({ outer, inner, centre }) => (
        <g key={`${outer.x},${outer.y}`}>
          <path fillRule="evenodd" d={roundedSquarePath(outer) + roundedSquarePath(inner)} />
          <rect
            x={centre.x}
            y={centre.y}
            width={centre.size}
            height={centre.size}
            rx={centre.radius}
          />
        </g>
      ))}
      {dots.map(({ cx, cy }) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={dotRadius} />
      ))}
    </svg>
  );
};

export default QrCode;
