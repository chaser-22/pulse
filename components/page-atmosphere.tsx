import { lazy, Suspense, useEffect, useState } from 'react';
import type { PageAtmosphereView, Workspace } from '@/lib/page-atmosphere-motion';

const PageAtmosphereScene = lazy(() => import('./page-atmosphere-scene'));

type Props = {
  view: PageAtmosphereView;
  workspace: Workspace;
  recoveryPulse?: number;
  signalCount?: number;
  surface?: 'ambient' | 'hero';
};

export function PageAtmosphere({
  view,
  workspace,
  recoveryPulse = 0,
  signalCount = 0,
  surface = 'hero',
}: Props) {
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  if (reducedMotion) return <div className="page-atmosphere-static" aria-hidden="true" />;

  return (
    <Suspense fallback={<div className="page-atmosphere-static" aria-hidden="true" />}>
      <PageAtmosphereScene
        view={view}
        workspace={workspace}
        recoveryPulse={recoveryPulse}
        signalCount={signalCount}
        surface={surface}
      />
    </Suspense>
  );
}
