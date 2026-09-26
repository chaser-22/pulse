'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function PulseLoaderScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    const root = new THREE.Group();
    root.rotation.x = -0.18;
    scene.add(root);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.02, 2),
      new THREE.MeshBasicMaterial({
        color: 0xff6a5e,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
      }),
    );
    root.add(core);

    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.66, 1),
      new THREE.MeshBasicMaterial({
        color: 0xff8a80,
        transparent: true,
        opacity: 0.1,
      }),
    );
    root.add(inner);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6a5e,
      transparent: true,
      opacity: 0.32,
    });

    const rings = [
      { radius: 1.38, tiltX: 1.15, tiltY: 0.18, speed: 0.52 },
      { radius: 1.68, tiltX: 0.42, tiltY: 1.08, speed: -0.33 },
      { radius: 1.95, tiltX: 1.42, tiltY: 0.74, speed: 0.24 },
    ].map(({ radius, tiltX, tiltY, speed }) => {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 8, 128), haloMaterial.clone());
      mesh.rotation.set(tiltX, tiltY, 0);
      root.add(mesh);
      return { mesh, speed };
    });

    const pointCount = 180;
    const positions = new Float32Array(pointCount * 3);
    for (let index = 0; index < pointCount; index += 1) {
      const radius = 2.1 + Math.random() * 1.45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0xff8278,
        size: 0.018,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
      }),
    );
    root.add(particles);

    const pulseGeometry = new THREE.BufferGeometry();
    const pulsePoints = 180;
    const pulsePositions = new Float32Array(pulsePoints * 3);
    for (let index = 0; index < pulsePoints; index += 1) {
      const progress = index / (pulsePoints - 1);
      const x = (progress - 0.5) * 5.4;
      const envelope = Math.exp(-Math.pow((progress - 0.5) * 5, 2));
      const y = Math.sin(progress * Math.PI * 18) * 0.13 * envelope;
      pulsePositions[index * 3] = x;
      pulsePositions[index * 3 + 1] = y - 2.25;
      pulsePositions[index * 3 + 2] = 0;
    }
    pulseGeometry.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
    const pulse = new THREE.Line(
      pulseGeometry,
      new THREE.LineBasicMaterial({
        color: 0xff6a5e,
        transparent: true,
        opacity: 0.58,
      }),
    );
    scene.add(pulse);

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      const width = Math.max(clientWidth, 1);
      const height = Math.max(clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    const startedAt = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const motion = reducedMotion ? 0.18 : 1;

      root.rotation.y = elapsed * 0.22 * motion;
      root.rotation.z = Math.sin(elapsed * 0.32) * 0.05 * motion;
      core.rotation.x = elapsed * 0.24 * motion;
      core.rotation.y = elapsed * 0.32 * motion;
      inner.scale.setScalar(1 + Math.sin(elapsed * 3.2) * 0.035 * motion);
      particles.rotation.y = -elapsed * 0.035 * motion;
      particles.rotation.x = elapsed * 0.02 * motion;

      rings.forEach(({ mesh, speed }, index) => {
        mesh.rotation.z = elapsed * speed * motion + index * 0.9;
      });

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      inner.geometry.dispose();
      (inner.material as THREE.Material).dispose();
      rings.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      particlesGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      pulseGeometry.dispose();
      (pulse.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="pulse-loader-canvas" aria-hidden="true" />;
}
