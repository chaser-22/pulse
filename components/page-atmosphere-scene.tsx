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
    boardGroup.rotation.x = -0.14;
    group.add(boardGroup);

    const panelGeometry = new THREE.PlaneGeometry(1.08, 2.35);
    const panelMaterials = [COLORS.coral, COLORS.teal, COLORS.amber, COLORS.mint].map((color, index) => (
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: index === 0 ? 0.14 : 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    ));
    const panels = panelMaterials.map((material, index) => {
      const panel = new THREE.Mesh(panelGeometry, material);
      panel.position.set((index - 1.5) * 1.22, 0, -0.32 - index * 0.03);
      boardGroup.add(panel);
      return panel;
    });

    const gridMaterial = new THREE.LineBasicMaterial({
      color: COLORS.mint,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const gridLines = Array.from({ length: 9 }, (_, index) => {
      const horizontal = index % 2 === 0;
      const geometry = new THREE.BufferGeometry();
      const span = horizontal ? 5.25 : 2.5;
      const offset = (Math.floor(index / 2) - 2) * (horizontal ? 0.48 : 1.15);
      const points = horizontal
        ? [new THREE.Vector3(-2.75, offset, -0.24), new THREE.Vector3(2.75, offset, -0.24)]
        : [new THREE.Vector3(offset, -1.35, -0.23), new THREE.Vector3(offset, 1.35, -0.23)];
      geometry.setFromPoints(points.map((point) => {
        if (!horizontal) point.x = Math.max(-span, Math.min(span, point.x));
        return point;
      }));
      const line = new THREE.Line(geometry, gridMaterial);
      boardGroup.add(line);
      return line;
    });

    const barGeometry = new THREE.BoxGeometry(0.2, 1, 0.08);
    const barMaterials = [
      new THREE.MeshBasicMaterial({ color: COLORS.coral, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: COLORS.teal, transparent: true, opacity: 0.54, blending: THREE.AdditiveBlending, depthWrite: false }),
    ];
    const bars = Array.from({ length: 14 }, (_, index) => {
      const bar = new THREE.Mesh(barGeometry, barMaterials[index % barMaterials.length]);
      bar.position.set(-2.42 + index * 0.37, -1.05, 0.06);
      bar.userData.height = 0.18 + seeded(index, 7) * 0.94;
      bar.userData.delay = seeded(index, 11);
      boardGroup.add(bar);
      return bar;
    });

    const scanMaterial = new THREE.LineBasicMaterial({
      color: COLORS.coralSoft,
      transparent: true,
      opacity: 0.64,
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

    const nodeGeometry = new THREE.SphereGeometry(0.07, 12, 8);
    const riskMaterial = new THREE.MeshBasicMaterial({ color: COLORS.coral, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthWrite: false });
    const recoveredMaterial = new THREE.MeshBasicMaterial({ color: COLORS.mint, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false });
    const nodes = Array.from({ length: 18 }, (_, index) => {
      const node = new THREE.Mesh(nodeGeometry, index % 3 === 0 ? riskMaterial : recoveredMaterial);
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
      const signalWeight = Math.min(1, Math.max(0.42, current.signalCount / 18));
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
        material.opacity = (0.08 + motion.energy * 0.12) * (index === 0 ? 1.1 : 0.82);
        panel.position.z = -0.36 + Math.sin(motion.phase + index * 0.7) * 0.035;
      });

      bars.forEach((bar, index) => {
        const baseHeight = Number(bar.userData.height);
        const delay = Number(bar.userData.delay);
        const lift = 0.72 + Math.sin(motion.wave + delay * Math.PI * 2) * 0.18 + motion.energy * 0.24;
        const height = baseHeight * lift * (index % 4 === 0 ? 1 + signalWeight * 0.25 : 1);
        bar.scale.set(1, Math.max(0.1, height), 1);
        bar.position.y = -1.22 + height * 0.5;
      });

      scanLine.position.x = -2.58 + motion.flow * 5.16;
      scanMaterial.opacity = 0.36 + motion.signal * 0.34;

      streamLines.forEach((line, lineIndex) => {
        const positions = line.geometry.attributes.position;
        const lane = lineIndex - 1.5;
        const flow = (motion.flow + Number(line.userData.offset)) % 1;
        for (let pointIndex = 0; pointIndex < positions.count; pointIndex += 1) {
          const progress = pointIndex / (positions.count - 1);
          const x = -2.55 + progress * 5.1;
          const wave = Math.sin(progress * Math.PI * 2 + motion.wave + lane) * 0.12;
          const y = laneMode
            ? lane * 0.36 + wave
            : Math.sin((progress + flow) * Math.PI) * 0.78 + lane * 0.18 - 0.16;
          positions.setXYZ(pointIndex, x, y, Math.sin((progress + flow) * Math.PI) * 0.24);
        }
        positions.needsUpdate = true;
      });
      streamMaterial.opacity = 0.12 + motion.signal * 0.2;

      nodes.forEach((node) => {
        const offset = Number(node.userData.offset);
        const lane = Number(node.userData.lane) - 2;
        const progress = (motion.flow + offset) % 1;
        const yBase = laneMode ? lane * 0.28 : Math.sin(progress * Math.PI) * 0.72 + lane * 0.08;
        node.position.set(
          -2.46 + progress * 4.92,
          yBase + Math.sin(motion.wave + offset * 6) * 0.05,
          0.22 + Number(node.userData.depth) * 0.32,
        );
        node.scale.setScalar(0.72 + motion.energy * 0.38 + Math.sin(motion.wave + offset * 5) * 0.12);
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
      barGeometry.dispose();
      barMaterials.forEach((material) => material.dispose());
      scanGeometry.dispose();
      scanMaterial.dispose();
      streamLines.forEach((line) => line.geometry.dispose());
      streamMaterial.dispose();
      nodeGeometry.dispose();
      riskMaterial.dispose();
      recoveredMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const preset = getAtmospherePreset(view, workspace);
  return <div ref={hostRef} className={`page-atmosphere page-atmosphere--${preset} page-atmosphere--${surface}`} aria-hidden="true" />;
}
