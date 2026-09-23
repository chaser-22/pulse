import { lazy, Suspense, useEffect, useState } from 'react';

const RevenueSignalScene = lazy(() => import('./revenue-signal-scene'));

export function RevenueSignal({ pulse }: { pulse: number }) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  if (reducedMotion) return <div className="signal-static" aria-hidden="true" />;
  return <Suspense fallback={<div className="signal-static" aria-hidden="true" />}><RevenueSignalScene pulse={pulse} /></Suspense>;
}
