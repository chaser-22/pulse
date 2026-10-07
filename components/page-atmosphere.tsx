import { lazy, Suspense, useEffect, useState } from 'react';
import type { PageAtmosphereView, Workspace } from '@/lib/page-atmosphere-motion';

const PageAtmosphereScene = lazy(() => import('./page-atmosphere-scene'));

type Props = {
  view: PageAtmosphereView;
  workspace: Workspace;
  recoveryPulse?: number;
  signalCount?: number;
  urgentCount?: number;
  surface?: 'ambient' | 'hero';
};

export function PageAtmosphere({
  view,
  workspace,
  recoveryPulse = 0,
  signalCount = 0,
  urgentCount = 0,
  surface = 'hero',
}: Props) {
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [compactViewport, setCompactViewport] = useState(() =>
    window.matchMedia('(max-width: 768px)').matches,
  );

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compactQuery = window.matchMedia('(max-width: 768px)');
    const syncMotion = () => setReducedMotion(motionQuery.matches);
    const syncCompact = () => setCompactViewport(compactQuery.matches);
    motionQuery.addEventListener('change', syncMotion);
    compactQuery.addEventListener('change', syncCompact);
    return () => {
      motionQuery.removeEventListener('change', syncMotion);
      compactQuery.removeEventListener('change', syncCompact);
    };
  }, []);

  if (reducedMotion || compactViewport) return <div className="page-atmosphere-static" aria-hidden="true" />;

  return (
    <Suspense fallback={<div className="page-atmosphere-static" aria-hidden="true" />}>
      <PageAtmosphereScene
        view={view}
        workspace={workspace}
        recoveryPulse={recoveryPulse}
        signalCount={signalCount}
        urgentCount={urgentCount}
        surface={surface}
      />
    </Suspense>
  );
}
