import { useEffect, useRef } from 'react';

// Runs `act` on the render where `flag` goes from false to true, never on the first render. `act`
// is read fresh each time, so it may use current props without being a dependency.
export function useOnTurnedOn(flag: boolean, act: () => void): void {
  const was = useRef(flag);
  const latest = useRef(act);
  useEffect(() => {
    latest.current = act;
  });
  useEffect(() => {
    if (flag && !was.current) latest.current();
    was.current = flag;
  }, [flag]);
}
