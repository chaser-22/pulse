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

    const panelGeometry = new THREE.CircleGeometry(0.92, 48);
    const panelMaterials = [COLORS.coral, COLORS.amber, COLORS.teal].map((color) => (
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    ));
    const panels = panelMaterials.map((material, index) => {
      const panel = new THREE.Mesh(panelGeometry, material);
      panel.position.set(-1.38 + index * 1.38, 0, -0.38 - index * 0.03);
      panel.scale.set(0.92, 1.42, 1);
      boardGroup.add(panel);
      return panel;
    });

    const gridMaterial = new THREE.LineBasicMaterial({
      color: COLORS.mint,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const gridLines = Array.from({ length: 6 }, (_, index) => {
      const geometry = new THREE.BufferGeometry();
      const lane = index - 2.5;
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
      const line = new THREE.Line(geometry, gridMaterial);
      line.userData.lane = lane;
      boardGroup.add(line);
      return line;
    });

    const scanMaterial = new THREE.LineBasicMaterial({
      color: COLORS.coralSoft,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const scanGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.46, 0.16),
      new THREE.Vector3(0, 1.46, 0.16),
    ]);
    const scanLine = new THREE.Line(scanGeometry, scanMaterial);
    boardGroup.add(scanLine);

    const streamMaterial = new THREE.LineBasicMaterial({
      color: COLORS.teal,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const streamLines = Array.from({ length: 4 }, (_, lineIndex) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(56 * 3), 3));
      const line = new THREE.Line(geometry, streamMaterial);
      line.userData.offset = lineIndex / 4;
      boardGroup.add(line);
      return line;
    });

    const nodeGeometry = new THREE.SphereGeometry(0.075, 14, 10);
    const riskMaterial = new THREE.MeshBasicMaterial({ color: COLORS.coral, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthWrite: false });
    const recoveredMaterial = new THREE.MeshBasicMaterial({ color: COLORS.mint, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false });
    const transitionMaterial = new THREE.MeshBasicMaterial({ color: COLORS.teal, transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending, depthWrite: false });
    const nodes = Array.from({ length: 22 }, (_, index) => {
      const node = new THREE.Mesh(nodeGeometry, riskMaterial);
      node.userData.offset = seeded(index, 17);
      node.userData.lane = index % 5;
      node.userData.depth = seeded(index, 23);
      boardGroup.add(node);
      return node;
    });

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

      panels.forEach((panel, index) => {
        const material = panel.material as THREE.MeshBasicMaterial;
        material.opacity = (0.06 + motion.energy * 0.1) * (index === 1 ? 1.15 : 0.9);
        panel.position.z = -0.42 + Math.sin(motion.phase + index * 0.9) * 0.045;
        panel.rotation.z = motion.phase * (index === 1 ? -0.05 : 0.04);
      });

      scanLine.position.x = -2.58 + motion.flow * 5.16;
      scanMaterial.opacity = 0.18 + motion.signal * 0.18;

      gridLines.forEach((line) => {
        const positions = line.geometry.attributes.position;
        const lane = Number(line.userData.lane);
        for (let pointIndex = 0; pointIndex < positions.count; pointIndex += 1) {
          const progress = pointIndex / (positions.count - 1);
          const x = -2.78 + progress * 5.56;
          const y = lane * 0.22 + Math.sin(progress * Math.PI * 2 + motion.wave) * 0.045;
          positions.setXYZ(pointIndex, x, y, Math.sin(progress * Math.PI) * 0.18 - 0.14);
        }
        positions.needsUpdate = true;
      });

      streamLines.forEach((line, lineIndex) => {
        const positions = line.geometry.attributes.position;
        const lane = lineIndex - 1.5;
        const flow = (motion.flow + Number(line.userData.offset)) % 1;
        for (let pointIndex = 0; pointIndex < positions.count; pointIndex += 1) {
          const progress = pointIndex / (positions.count - 1);
          const x = -2.75 + progress * 5.5;
          const eased = Math.sin(progress * Math.PI);
          const y = lane * 0.3 + eased * 0.56 + Math.sin(progress * Math.PI * 2 + motion.wave + lane) * 0.08;
          positions.setXYZ(pointIndex, x, y, 0.04 + eased * 0.36 + Math.sin(flow * Math.PI) * 0.08);
        }
        positions.needsUpdate = true;
      });
      streamMaterial.opacity = 0.12 + motion.signal * 0.2;

      nodes.forEach((node) => {
        const offset = Number(node.userData.offset);
        const lane = Number(node.userData.lane) - 2;
        const progress = (motion.flow + offset) % 1;
        const yBase = Math.sin(progress * Math.PI) * 0.72 + lane * 0.12;
        if (progress < 0.38) node.material = riskMaterial;
        else if (progress < 0.64) node.material = transitionMaterial;
        else node.material = recoveredMaterial;
        node.position.set(
          -2.72 + progress * 5.44,
          yBase + Math.sin(motion.wave + offset * 6) * 0.05,
          0.18 + Number(node.userData.depth) * 0.28 + Math.sin(progress * Math.PI) * 0.18,
        );
        node.scale.setScalar(0.62 + progress * 0.42 + motion.energy * 0.18 + Math.sin(motion.wave + offset * 5) * 0.08);
      });

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
      panelGeometry.dispose();
      panelMaterials.forEach((material) => material.dispose());
      gridLines.forEach((line) => line.geometry.dispose());
      gridMaterial.dispose();
      scanGeometry.dispose();
      scanMaterial.dispose();
      streamLines.forEach((line) => line.geometry.dispose());
      streamMaterial.dispose();
      nodeGeometry.dispose();
      riskMaterial.dispose();
      transitionMaterial.dispose();
      recoveredMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const preset = getAtmospherePreset(view, workspace);
  return <div ref={hostRef} className={`page-atmosphere page-atmosphere--${preset} page-atmosphere--${surface}`} aria-hidden="true" />;
}
