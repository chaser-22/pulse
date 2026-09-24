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
  surface: 'ambient' | 'hero';
};

const COLORS = {
  coral: new THREE.Color(0xff6a5e),
  coralSoft: new THREE.Color(0xff9a8f),
  teal: new THREE.Color(0x2ecc9d),
  mint: new THREE.Color(0x7be7c8),
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
  surface,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef({ view, workspace, recoveryPulse, signalCount, surface });

  useEffect(() => {
    latestRef.current = { view, workspace, recoveryPulse, signalCount, surface };
  }, [view, workspace, recoveryPulse, signalCount, surface]);

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
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 8.2);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambientGroup = new THREE.Group();
    group.add(ambientGroup);

    const ambientMaterial = new THREE.LineBasicMaterial({
      color: COLORS.mint,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ambientAccentMaterial = new THREE.LineBasicMaterial({
      color: COLORS.coralSoft,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ambientLines = Array.from({ length: 7 }, (_, lineIndex) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(72 * 3), 3));
      const line = new THREE.Line(geometry, lineIndex % 3 === 0 ? ambientAccentMaterial : ambientMaterial);
      line.userData.offset = seeded(lineIndex, 31);
      line.userData.lane = lineIndex - 3;
      ambientGroup.add(line);
      return line;
    });
    const ambientPointGeometry = new THREE.BufferGeometry();
    const ambientPointPositions = new Float32Array(42 * 3);
    ambientPointGeometry.setAttribute('position', new THREE.BufferAttribute(ambientPointPositions, 3));
    const ambientPointMaterial = new THREE.PointsMaterial({
      color: COLORS.teal,
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    ambientGroup.add(new THREE.Points(ambientPointGeometry, ambientPointMaterial));

    const boardGroup = new THREE.Group();
    boardGroup.rotation.x = -0.08;
    group.add(boardGroup);

    const ribbonMaterials = [COLORS.coralSoft, COLORS.teal, COLORS.mint].map((color, index) => new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: index === 0 ? 0.22 : 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    const ribbons = Array.from({ length: 11 }, (_, index) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(96 * 3), 3));
      const line = new THREE.Line(geometry, ribbonMaterials[index % ribbonMaterials.length]);
      line.userData.lane = index - 5;
      line.userData.offset = seeded(index, 13);
      boardGroup.add(line);
      return line;
    });
    const glintGeometry = new THREE.BufferGeometry();
    glintGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18 * 3), 3));
    const glintMaterial = new THREE.PointsMaterial({
      color: COLORS.mint,
      size: 0.034,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    boardGroup.add(new THREE.Points(glintGeometry, glintMaterial));

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
    const render = (now: number) => {
      frame = null;
      if (!visible || document.hidden) return;

      const current = latestRef.current;
      const preset = getAtmospherePreset(current.view, current.workspace);
      const motion = getAtmosphereFrame(preset, now - startedAt, Math.min(current.recoveryPulse, 1));
      const laneMode = preset === 'task-lane' || preset === 'message-flow';
      const ambient = current.surface === 'ambient';

      boardGroup.visible = !ambient;
      ambientGroup.visible = ambient;
      group.rotation.y = ambient ? Math.sin(motion.phase * 0.22) * 0.04 : laneMode ? Math.sin(motion.phase * 0.45) * 0.06 : Math.sin(motion.phase * 0.38) * 0.12;
      group.rotation.x = ambient ? Math.sin(motion.phase * 0.18) * 0.025 : Math.sin(motion.phase * 0.25) * 0.035;
      boardGroup.scale.setScalar(preset === 'member-field' ? 0.92 : 1);

      if (ambient) {
        ambientLines.forEach((line) => {
          const positions = line.geometry.attributes.position;
          const lane = Number(line.userData.lane);
          const offset = Number(line.userData.offset);
          for (let pointIndex = 0; pointIndex < positions.count; pointIndex += 1) {
            const progress = pointIndex / (positions.count - 1);
            const x = -4.5 + progress * 9;
            const currentFlow = (progress + motion.flow + offset) % 1;
            const y = lane * 0.36 + Math.sin(progress * Math.PI * 2 + motion.wave + offset * 4) * 0.18;
            const z = -0.65 + Math.sin(currentFlow * Math.PI) * 0.62;
            positions.setXYZ(pointIndex, x, y, z);
          }
          positions.needsUpdate = true;
        });
        const ambientPositions = ambientPointGeometry.attributes.position;
        for (let index = 0; index < ambientPositions.count; index += 1) {
          const lane = (index % 7) - 3;
          const progress = (seeded(index, 41) + motion.flow + index * 0.013) % 1;
          ambientPositions.setXYZ(
            index,
            -4.35 + progress * 8.7,
            lane * 0.35 + Math.sin(motion.wave + index * 0.7) * 0.12,
            -0.2 + seeded(index, 43) * 0.9,
          );
        }
        ambientPositions.needsUpdate = true;
        ambientMaterial.opacity = 0.12 + motion.signal * 0.1;
        ambientAccentMaterial.opacity = 0.08 + motion.energy * 0.1;
        ambientPointMaterial.opacity = 0.28 + motion.energy * 0.16;

        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
        return;
      }

      ribbons.forEach((line) => {
        const positions = line.geometry.attributes.position;
        const lane = Number(line.userData.lane);
        const offset = Number(line.userData.offset);
        for (let pointIndex = 0; pointIndex < positions.count; pointIndex += 1) {
          const progress = pointIndex / (positions.count - 1);
          const x = -3.35 + progress * 6.7;
          const arc = Math.sin(progress * Math.PI);
          const flow = progress * Math.PI * 2 + motion.wave + offset * 5;
          const y = -0.24 + lane * 0.092 + arc * 0.9 + Math.sin(flow) * 0.075;
          const z = -0.2 + arc * 0.68 + Math.cos(flow * 0.7) * 0.08;
          positions.setXYZ(pointIndex, x, y, z);
        }
        positions.needsUpdate = true;
      });
      ribbonMaterials.forEach((material, index) => {
        material.opacity = (index === 0 ? 0.18 : 0.22) + motion.energy * 0.14;
      });

      const glintPositions = glintGeometry.attributes.position;
      for (let index = 0; index < glintPositions.count; index += 1) {
        const progress = (seeded(index, 19) + motion.flow + index * 0.021) % 1;
        const lane = (index % 5) - 2;
        glintPositions.setXYZ(
          index,
          -3 + progress * 6,
          -0.05 + Math.sin(progress * Math.PI) * 0.74 + lane * 0.13,
          0.04 + Math.sin(progress * Math.PI) * 0.48 + seeded(index, 29) * 0.16,
        );
      }
      glintPositions.needsUpdate = true;
      glintMaterial.opacity = 0.18 + motion.signal * 0.14;

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
      ambientLines.forEach((line) => line.geometry.dispose());
      ambientMaterial.dispose();
      ambientAccentMaterial.dispose();
      ambientPointGeometry.dispose();
      ambientPointMaterial.dispose();
      ribbons.forEach((line) => line.geometry.dispose());
      ribbonMaterials.forEach((material) => material.dispose());
      glintGeometry.dispose();
      glintMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const preset = getAtmospherePreset(view, workspace);
  return <div ref={hostRef} className={`page-atmosphere page-atmosphere--${preset} page-atmosphere--${surface}`} aria-hidden="true" />;
}
