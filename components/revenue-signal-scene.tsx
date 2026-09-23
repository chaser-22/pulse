import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  getRevenueSignalFrame,
  getSignalPresentation,
} from '../lib/revenue-signal-motion';

const SAMPLE_COUNT = 96;
const PARTICLE_COUNT = 54;
const CORAL = new THREE.Color(0xff6a5e);
const TEAL = new THREE.Color(0x2ecc9d);
const SURFACE_IDLE = new THREE.Color(0x612827);

function signalPoint(x: number, phase: number, lane = 0) {
  return {
    y:
      Math.sin(x * 1.28 + phase + lane * 0.38) * (0.48 - lane * 0.06) +
      Math.cos(x * 0.5 - phase * 0.42) * 0.16 +
      lane * 0.22 -
      0.22,
    z: Math.cos(x * 0.86 - phase * 0.72 + lane) * 0.5 + lane * 0.24,
  };
}

export default function RevenueSignalScene({ pulse }: { pulse: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const lastPulse = useRef(pulse);
  const pulseStarted = useRef(0);

  useEffect(() => {
    if (pulse !== lastPulse.current) {
      lastPulse.current = pulse;
      pulseStarted.current = performance.now();
    }
  }, [pulse]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !('IntersectionObserver' in window)) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      host.dataset.fallback = 'true';
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.2, 7.5);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    let contextAvailable = true;
    let renderedFrame = false;
    const syncPresentation = () => {
      host.classList.toggle(
        'is-ready',
        getSignalPresentation(contextAvailable, renderedFrame) === 'canvas',
      );
    };

    const signal = new THREE.Group();
    signal.rotation.set(-0.12, 0, -0.08);
    scene.add(signal);

    const surfaceGeometry = new THREE.PlaneGeometry(7.2, 2.8, 48, 14);
    const surfaceBase = Float32Array.from(
      surfaceGeometry.attributes.position.array,
    );
    const surfaceMaterial = new THREE.MeshBasicMaterial({
      color: SURFACE_IDLE,
      transparent: true,
      opacity: 0.22,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    signal.add(surface);

    const lineMaterials = [0xff6a5e, 0xf28a78, 0xa94643].map(
      (color, index) =>
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.92 - index * 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
    );
    const ribbons = lineMaterials.map((material) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(SAMPLE_COUNT * 3), 3),
      );
      const line = new THREE.Line(geometry, material);
      signal.add(line);
      return line;
    });

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3),
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: CORAL,
      size: 0.075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    signal.add(particles);

    const ringGeometry = new THREE.TorusGeometry(0.18, 0.018, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: CORAL,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rings = [-2.25, 0.15, 2.4].map((x) => {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.userData.x = x;
      signal.add(ring);
      return ring;
    });

    const pointer = new THREE.Vector2();
    const currentPointer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2,
        ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2,
      );
    };
    const resetPointer = () => pointer.set(0, 0);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', resetPointer);

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver =
      'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(host);
    if (!resizeObserver) window.addEventListener('resize', resize);
    resize();

    let frame: number | null = null;
    let visible = true;
    const startedAt = performance.now();
    const activeColor = new THREE.Color();

    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };

    const render = (now: number) => {
      frame = null;
      if (!visible || document.hidden) return;

      const motion = getRevenueSignalFrame(
        now - startedAt,
        pulseStarted.current
          ? now - pulseStarted.current
          : Number.POSITIVE_INFINITY,
      );
      activeColor.lerpColors(CORAL, TEAL, motion.recoveryMix);

      const surfacePositions = surfaceGeometry.attributes.position;
      for (let index = 0; index < surfacePositions.count; index += 1) {
        const x = surfaceBase[index * 3];
        const y = surfaceBase[index * 3 + 1];
        const depth =
          Math.sin(x * 1.12 + motion.wavePhase) * 0.32 +
          Math.cos(y * 2.25 - motion.wavePhase * 0.7) * 0.12;
        surfacePositions.setXYZ(
          index,
          x,
          y + Math.sin(x * 0.55 + motion.wavePhase * 0.5) * 0.09,
          depth,
        );
      }
      surfacePositions.needsUpdate = true;

      ribbons.forEach((ribbon, lane) => {
        const positions = ribbon.geometry.attributes.position;
        for (let index = 0; index < SAMPLE_COUNT; index += 1) {
          const x = -3.6 + (index / (SAMPLE_COUNT - 1)) * 7.2;
          const point = signalPoint(x, motion.wavePhase, lane);
          positions.setXYZ(index, x, point.y, point.z);
        }
        positions.needsUpdate = true;
        lineMaterials[lane].color.lerpColors(
          CORAL,
          TEAL,
          motion.recoveryMix * (1 - lane * 0.16),
        );
      });

      const particlePositions = particleGeometry.attributes.position;
      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const lane = index % ribbons.length;
        const progress = (index / PARTICLE_COUNT + motion.particleOffset) % 1;
        const x = -3.6 + progress * 7.2;
        const point = signalPoint(x, motion.wavePhase, lane);
        particlePositions.setXYZ(index, x, point.y, point.z + 0.08);
      }
      particlePositions.needsUpdate = true;

      rings.forEach((ring, index) => {
        const x = ring.userData.x as number;
        const point = signalPoint(x, motion.wavePhase, index % ribbons.length);
        const scale =
          1 +
          Math.sin(motion.wavePhase * 1.5 + index) * 0.12 +
          motion.recoveryMix * 0.4;
        ring.position.set(x, point.y, point.z + 0.06);
        ring.rotation.set(
          motion.wavePhase * 0.22 + index * 0.25,
          motion.wavePhase * 0.18,
          0,
        );
        ring.scale.setScalar(scale);
      });

      particleMaterial.color.copy(activeColor);
      particleMaterial.opacity = Math.min(1, 0.72 * motion.glow);
      ringMaterial.color.copy(activeColor);
      ringMaterial.opacity = Math.min(1, 0.58 * motion.glow);
      surfaceMaterial.color.lerpColors(
        SURFACE_IDLE,
        TEAL,
        motion.recoveryMix * 0.65,
      );
      surfaceMaterial.opacity = 0.2 + motion.recoveryMix * 0.12;

      currentPointer.lerp(pointer, 0.045);
      signal.rotation.x = -0.12 + currentPointer.y * 0.08;
      signal.rotation.y = motion.rotationY + currentPointer.x * 0.12;
      try {
        renderer.render(scene, camera);
      } catch {
        contextAvailable = false;
        renderedFrame = false;
        syncPresentation();
        stop();
        return;
      }
      renderedFrame = true;
      syncPresentation();
      frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (frame === null && visible && !document.hidden && contextAvailable)
        frame = requestAnimationFrame(render);
    };
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.05 },
    );
    intersectionObserver.observe(host);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextAvailable = false;
      renderedFrame = false;
      syncPresentation();
      stop();
    };
    const onContextRestored = () => {
      contextAvailable = true;
      start();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      onContextRestored,
    );
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    start();

    return () => {
      stop();
      intersectionObserver.disconnect();
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', resetPointer);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        onContextLost,
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        onContextRestored,
      );
      surfaceGeometry.dispose();
      surfaceMaterial.dispose();
      ribbons.forEach((ribbon) => ribbon.geometry.dispose());
      lineMaterials.forEach((material) => material.dispose());
      particleGeometry.dispose();
      particleMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      host.classList.remove('is-ready');
    };
  }, []);

  return (
    <div ref={hostRef} className="revenue-signal" aria-hidden="true">
      <div className="signal-static" />
    </div>
  );
}
