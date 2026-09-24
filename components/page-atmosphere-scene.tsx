import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  getAtmosphereFrame,
  getAtmospherePreset,
  type PageAtmosphereView,
  type Workspace,
} from '@/lib/page-atmosphere-motion';

type Props = {
  view: PageAtmosphereView;
  workspace: Workspace;
  recoveryPulse: number;
  signalCount: number;
};

const COLORS = {
  coral: new THREE.Color(0xff6a5e),
  teal: new THREE.Color(0x2ecc9d),
  amber: new THREE.Color(0xf8bd62),
  ink: new THREE.Color(0x19211d),
};

function seeded(index: number, seed: number) {
  return ((Math.sin(index * 91.313 + seed * 17.17) + 1) * 0.5) % 1;
}

export default function PageAtmosphereScene({
  view,
  workspace,
  recoveryPulse,
  signalCount,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef({ view, workspace, recoveryPulse, signalCount });

  useEffect(() => {
    latestRef.current = { view, workspace, recoveryPulse, signalCount };
  }, [view, workspace, recoveryPulse, signalCount]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !('IntersectionObserver' in window)) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      host.dataset.fallback = 'true';
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 8.5);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    const pointCount = 88;
    const basePositions = new Float32Array(pointCount * 3);
    const pointPositions = new Float32Array(pointCount * 3);
    for (let index = 0; index < pointCount; index += 1) {
      const angle = seeded(index, 1) * Math.PI * 2;
      const radius = 0.45 + seeded(index, 2) * 3.35;
      basePositions[index * 3] = Math.cos(angle) * radius;
      basePositions[index * 3 + 1] = Math.sin(angle) * radius * 0.52;
      basePositions[index * 3 + 2] = (seeded(index, 3) - 0.5) * 1.8;
    }
    pointPositions.set(basePositions);
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      color: COLORS.coral,
      size: 0.058,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Points(pointsGeometry, pointsMaterial));

    const orbitGroup = new THREE.Group();
    group.add(orbitGroup);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: COLORS.coral,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    [1.25, 2.05, 2.9].forEach((radius, index) => {
      const orbit = new THREE.LineLoop(new THREE.RingGeometry(radius, radius, 56).deleteAttribute('normal'), orbitMaterial);
      orbit.scale.y = 0.52 + index * 0.08;
      orbit.rotation.x = index * 0.22;
      orbitGroup.add(orbit);
    });

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.38, 2),
      new THREE.MeshBasicMaterial({ color: COLORS.coral, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    group.add(core);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.64, 0.015, 8, 64),
      new THREE.MeshBasicMaterial({ color: COLORS.teal, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    group.add(halo);

    const sweep = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 64, 0, Math.PI / 10),
      new THREE.MeshBasicMaterial({ color: COLORS.coral, transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    sweep.position.z = -0.65;
    sweep.visible = false;
    group.add(sweep);

    const signalGroup = new THREE.Group();
    const signalMaterials = [
      new THREE.LineBasicMaterial({ color: COLORS.teal, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.LineBasicMaterial({ color: COLORS.coral, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }),
    ];
    const signalLines = Array.from({ length: 4 }, (_, lineIndex) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(84 * 3), 3));
      const line = new THREE.Line(geometry, signalMaterials[lineIndex % signalMaterials.length]);
      line.rotation.z = (lineIndex - 1.5) * 0.08;
      signalGroup.add(line);
      return line;
    });
    signalGroup.position.z = -0.35;
    group.add(signalGroup);

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let frame: number | null = null;
    let visible = true;
    const startedAt = performance.now();
    const activeColor = new THREE.Color();
    const render = (now: number) => {
      frame = null;
      if (!visible || document.hidden) return;

      const current = latestRef.current;
      const preset = getAtmospherePreset(current.view, current.workspace);
      const motion = getAtmosphereFrame(preset, now - startedAt, Math.min(current.recoveryPulse, 1));
      const positions = pointsGeometry.attributes.position;
      const countMultiplier = Math.min(1, Math.max(0.46, current.signalCount / 20));
      for (let index = 0; index < pointCount; index += 1) {
        const x = basePositions[index * 3];
        const y = basePositions[index * 3 + 1];
        const z = basePositions[index * 3 + 2];
        const angle = motion.phase + index * 0.17;
        const isLane = preset === 'task-lane' || preset === 'message-flow';
        const laneX = -3.5 + ((index / (pointCount - 1) + motion.drift * 0.08) % 1) * 7;
        positions.setXYZ(
          index,
          isLane ? laneX : x + Math.cos(angle) * 0.08,
          isLane ? Math.sin(index * 0.7 + motion.phase) * 0.7 + (index % 3 - 1) * 0.32 : y + Math.sin(angle * 1.3) * 0.08,
          isLane ? z * 0.26 : z + Math.sin(angle * 0.6) * 0.16,
        );
      }
      positions.needsUpdate = true;

      activeColor.lerpColors(COLORS.coral, preset === 'radar-sweep' ? COLORS.amber : COLORS.teal, preset === 'constellation' ? motion.energy - 0.5 : 0.35);
      pointsMaterial.color.copy(activeColor);
      pointsMaterial.opacity = Math.min(0.78, motion.energy * countMultiplier);
      pointsMaterial.size = preset === 'member-field' ? 0.045 : 0.058;
      orbitGroup.visible = preset === 'constellation' || preset === 'radar-sweep';
      orbitGroup.rotation.z = motion.phase * (preset === 'constellation' ? 0.45 : 0.12);
      orbitMaterial.opacity = preset === 'constellation' ? 0.24 * motion.energy : 0.14;
      core.visible = preset !== 'member-field';
      core.scale.setScalar(0.75 + motion.energy * 0.55 + Math.sin(motion.phase * 2.3) * 0.08);
      core.rotation.set(motion.phase * 0.38, motion.phase * 0.57, 0);
      halo.visible = preset === 'constellation' || preset === 'radar-sweep';
      halo.rotation.z = -motion.phase * 0.62;
      sweep.visible = preset === 'radar-sweep';
      sweep.rotation.z = -motion.sweep;
      signalGroup.visible = preset !== 'radar-sweep';
      signalGroup.rotation.z = preset === 'constellation' ? motion.phase * 0.1 : 0;
      signalGroup.scale.setScalar(0.86 + motion.signal * 0.16);
      signalLines.forEach((line, lineIndex) => {
        const linePositions = line.geometry.attributes.position;
        const strandOffset = lineIndex - (signalLines.length - 1) / 2;
        const isLane = preset === 'task-lane' || preset === 'message-flow';
        for (let pointIndex = 0; pointIndex < linePositions.count; pointIndex += 1) {
          const progress = pointIndex / (linePositions.count - 1);
          const sweepPhase = progress * Math.PI * 2 + motion.wave + lineIndex * 0.9;
          const laneY = strandOffset * 0.34 + Math.sin(sweepPhase) * 0.14 * motion.signal;
          const arc = (progress - 0.5) * Math.PI;
          linePositions.setXYZ(
            pointIndex,
            isLane ? -3.55 + progress * 7.1 : Math.cos(arc) * (2.55 + strandOffset * 0.16),
            isLane ? laneY : Math.sin(arc) * 1.02 + strandOffset * 0.22 + Math.sin(sweepPhase) * 0.1,
            Math.cos(sweepPhase) * (isLane ? 0.18 : 0.34) * motion.signal,
          );
        }
        linePositions.needsUpdate = true;
      });
      signalMaterials.forEach((material, index) => {
        material.opacity = (index === 0 ? 0.26 : 0.18) * motion.signal;
      });
      group.rotation.y = Math.sin(motion.phase * 0.52) * 0.13;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    const start = () => {
      if (frame === null && visible && !document.hidden) frame = requestAnimationFrame(render);
    };
    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0.02 });
    observer.observe(host);
    const onVisibilityChange = () => {
      if (document.hidden) stop(); else start();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    start();

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      orbitGroup.traverse((child) => {
        if (child instanceof THREE.Line) child.geometry.dispose();
      });
      orbitMaterial.dispose();
      (core.geometry as THREE.BufferGeometry).dispose();
      (core.material as THREE.Material).dispose();
      (halo.geometry as THREE.BufferGeometry).dispose();
      (halo.material as THREE.Material).dispose();
      (sweep.geometry as THREE.BufferGeometry).dispose();
      (sweep.material as THREE.Material).dispose();
      signalLines.forEach((line) => line.geometry.dispose());
      signalMaterials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const preset = getAtmospherePreset(view, workspace);
  return <div ref={hostRef} className={`page-atmosphere page-atmosphere--${preset}`} aria-hidden="true" />;
}
