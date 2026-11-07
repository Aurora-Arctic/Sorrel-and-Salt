import { notFound } from 'next/navigation';

// Every address no other page answers lands here and is a 404, drawn by `(unmatched)/not-found.tsx`
// inside the layout's frame. Next's own unmatched 404 has no layout but the root's.
export default function Unmatched(): never {
  notFound();
}
