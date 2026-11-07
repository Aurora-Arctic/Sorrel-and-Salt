import type { ReactNode } from 'react';

// The shell's pages each own their `main`, as the area layouts do; the staff help pages share this one.
export default function StaffHelpLayout({ children }: { children: ReactNode }) {
  return <main className="page-frame">{children}</main>;
}
