'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getLoaderPulseRate } from '@/lib/loader-pulse-motion';

export function PulseLoaderScene({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const themeStyles = getComputedStyle(document.documentElement);
    const primaryColor = new THREE.Color(themeStyles.getPropertyValue('--primary').trim());
    const foregroundColor = new THREE.Color(themeStyles.getPropertyValue('--foreground').trim());
    const wireColor = primaryColor.clone().lerp(foregroundColor, 0.22);
    const particleColor = primaryColor.clone().lerp(foregroundColor, 0.36);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 9.35);

    const reactor = new THREE.Group();
    reactor.position.y = 0.52;
    reactor.scale.setScalar(0.88);
    scene.add(reactor);

    const glowTexture = new THREE.CanvasTexture(createGlowTexture(primaryColor));
    glowTexture.colorSpace = THREE.SRGBColorSpace;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: primaryColor,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(4.8, 4.8, 1);
    reactor.add(glow);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 4),
      new THREE.MeshBasicMaterial({
        color: primaryColor,
        transparent: true,
        opacity: 0.13,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    reactor.add(core);

    const wireCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.94, 2),
      new THREE.MeshBasicMaterial({
        color: wireColor,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
      }),
    );
    reactor.add(wireCore);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 32, 32),
      new THREE.MeshBasicMaterial({
        color: primaryColor,
        wireframe: true,
        transparent: true,
        opacity: 0.055,
      }),
    );
    reactor.add(shell);

    const orbitSpecs = [
      { radius: 1.42, tube: 0.012, rotX: 1.22, rotY: 0.1, speed: 0.72, opacity: 0.56 },
      { radius: 1.74, tube: 0.008, rotX: 0.46, rotY: 1.08, speed: -0.46, opacity: 0.35 },
      { radius: 2.03, tube: 0.007, rotX: 1.48, rotY: 0.68, speed: 0.27, opacity: 0.22 },
      { radius: 2.34, tube: 0.004, rotX: 0.18, rotY: 1.34, speed: -0.18, opacity: 0.14 },
    ];

    const orbits = orbitSpecs.map((spec) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(spec.radius, spec.tube, 8, 180),
        new THREE.MeshBasicMaterial({
          color: primaryColor,
          transparent: true,
          opacity: spec.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.rotation.set(spec.rotX, spec.rotY, 0);
      reactor.add(mesh);
      return { mesh, speed: spec.speed };
    });

    const particleCount = 240;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.05 + Math.random() * 1.75;
      const theta = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.5) * 2.8;
      particlePositions[index * 3] = Math.cos(theta) * radius;
      particlePositions[index * 3 + 1] = Math.sin(theta) * radius;
      particlePositions[index * 3 + 2] = z;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: particleColor,
        size: 0.018,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    reactor.add(particles);

    const resize = () => {
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    const startedAt = performance.now();
    let lastFrameAt = startedAt;
    let pulsePhase = 0;
    let currentPulseRate = getLoaderPulseRate(progressRef.current);

    const render = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const delta = Math.min((now - lastFrameAt) / 1000, 0.05);
      lastFrameAt = now;
      const motion = reducedMotion ? 0.16 : 1;
      const targetPulseRate = getLoaderPulseRate(progressRef.current);
      currentPulseRate += (targetPulseRate - currentPulseRate) * (1 - Math.exp(-delta * 4.2));
      pulsePhase += delta * currentPulseRate * Math.PI * 2;
      const heartbeat = Math.pow(Math.max(0, Math.sin(pulsePhase)), 8);
      const progressEnergy = Math.min(1, Math.max(0, progressRef.current / 100));

      reactor.rotation.y = Math.sin(elapsed * 0.18) * 0.16 * motion;
      reactor.rotation.x = Math.sin(elapsed * 0.14) * 0.055 * motion;

      wireCore.rotation.x = elapsed * 0.24 * motion;
      wireCore.rotation.y = elapsed * 0.31 * motion;
      core.rotation.x = -elapsed * 0.17 * motion;
      core.rotation.z = elapsed * 0.12 * motion;
      core.scale.setScalar(0.94 + heartbeat * 0.16 * motion);
      wireCore.scale.setScalar(1 + heartbeat * 0.08 * motion);
      shell.rotation.y = -elapsed * 0.09 * motion;
      shell.rotation.x = elapsed * 0.05 * motion;
      shell.scale.setScalar(1 + heartbeat * 0.035 * motion);

      glow.scale.setScalar(4.4 + heartbeat * 0.82 * motion);
      (glow.material as THREE.SpriteMaterial).opacity = 0.22 + heartbeat * 0.3;

      orbits.forEach(({ mesh, speed }, index) => {
        mesh.rotation.z = elapsed * speed * (1 + progressEnergy * 0.28) * motion + index * 0.72;
        mesh.scale.setScalar(1 + heartbeat * (0.012 + index * 0.002) * motion);
      });

      const particleMaterial = particles.material as THREE.PointsMaterial;
      particleMaterial.opacity = 0.38 + heartbeat * 0.2;
      particleMaterial.size = 0.018 + heartbeat * 0.006 * motion;
      particles.rotation.z = elapsed * 0.028 * (1 + progressEnergy * 0.35) * motion;
      particles.rotation.y = elapsed * 0.018 * (1 + progressEnergy * 0.35) * motion;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);

      glowTexture.dispose();
      glow.material.dispose();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      wireCore.geometry.dispose();
      (wireCore.material as THREE.Material).dispose();
      shell.geometry.dispose();
      (shell.material as THREE.Material).dispose();
      orbits.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      particleGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="pulse-loader-canvas" aria-hidden="true" />;
}

function createGlowTexture(primaryColor: THREE.Color) {
  primaryColor = primaryColor.clone().convertLinearToSRGB();
  const red = Math.round(primaryColor.r * 255);
  const green = Math.round(primaryColor.g * 255);
  const blue = Math.round(primaryColor.b * 255);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, `rgba(${red},${green},${blue},0.9)`);
  gradient.addColorStop(0.18, `rgba(${red},${green},${blue},0.36)`);
  gradient.addColorStop(0.5, `rgba(${red},${green},${blue},0.08)`);
  gradient.addColorStop(1, `rgba(${red},${green},${blue},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  return canvas;
}
