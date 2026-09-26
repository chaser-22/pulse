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
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 7.25);

    const reactor = new THREE.Group();
    reactor.position.y = 0.18;
    scene.add(reactor);

    const glowTexture = new THREE.CanvasTexture(createGlowTexture());
    glowTexture.colorSpace = THREE.SRGBColorSpace;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff6a5e,
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
        color: 0xff6a5e,
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
        color: 0xff8176,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
      }),
    );
    reactor.add(wireCore);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff6a5e,
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
          color: 0xff7468,
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

    const pulseRings = [0, 1, 2].map((index) => {
      const material = new THREE.MeshBasicMaterial({
        color: 0xff6a5e,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.012, 8, 128), material);
      mesh.rotation.x = Math.PI / 2;
      mesh.userData.offset = index / 3;
      reactor.add(mesh);
      return mesh;
    });

    const particleCount = 240;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.25 + Math.random() * 2.6;
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
        color: 0xff8f86,
        size: 0.018,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    reactor.add(particles);

    const signalGeometry = new THREE.BufferGeometry();
    const signalPoints = 220;
    const signalPositions = new Float32Array(signalPoints * 3);
    for (let index = 0; index < signalPoints; index += 1) {
      const progress = index / (signalPoints - 1);
      const x = (progress - 0.5) * 3.7;
      const distance = Math.abs(progress - 0.5);
      const envelope = Math.exp(-Math.pow(distance * 8.5, 2));
      const heartbeat =
        Math.sin(progress * Math.PI * 34) * 0.035 +
        Math.sin(progress * Math.PI * 10) * 0.16 * envelope;
      signalPositions[index * 3] = x;
      signalPositions[index * 3 + 1] = heartbeat;
      signalPositions[index * 3 + 2] = 0.05;
    }
    signalGeometry.setAttribute('position', new THREE.BufferAttribute(signalPositions, 3));

    const signalMaterial = new THREE.LineBasicMaterial({
      color: 0xff8f86,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const signal = new THREE.Line(signalGeometry, signalMaterial);
    signal.position.y = -1.68;
    reactor.add(signal);

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

    const render = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const motion = reducedMotion ? 0.16 : 1;
      const pulse = (Math.sin(elapsed * 2.8) + 1) / 2;

      reactor.rotation.y = Math.sin(elapsed * 0.18) * 0.16 * motion;
      reactor.rotation.x = Math.sin(elapsed * 0.14) * 0.055 * motion;

      wireCore.rotation.x = elapsed * 0.24 * motion;
      wireCore.rotation.y = elapsed * 0.31 * motion;
      core.rotation.x = -elapsed * 0.17 * motion;
      core.rotation.z = elapsed * 0.12 * motion;
      core.scale.setScalar(0.96 + pulse * 0.08 * motion);
      shell.rotation.y = -elapsed * 0.09 * motion;
      shell.rotation.x = elapsed * 0.05 * motion;

      glow.scale.setScalar(4.55 + pulse * 0.35 * motion);
      (glow.material as THREE.SpriteMaterial).opacity = 0.26 + pulse * 0.16;

      orbits.forEach(({ mesh, speed }, index) => {
        mesh.rotation.z = elapsed * speed * motion + index * 0.72;
      });

      pulseRings.forEach((ring) => {
        const cycle = (elapsed * 0.34 + ring.userData.offset) % 1;
        const scale = 1 + cycle * 1.5;
        ring.scale.setScalar(scale);
        (ring.material as THREE.MeshBasicMaterial).opacity =
          cycle < 0.12 ? cycle * 2.2 : Math.max(0, (1 - cycle) * 0.23);
      });

      particles.rotation.z = elapsed * 0.028 * motion;
      particles.rotation.y = elapsed * 0.018 * motion;
      signalMaterial.opacity = 0.42 + pulse * 0.22;

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
      pulseRings.forEach((ring) => {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      });
      particleGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      signalGeometry.dispose();
      signalMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="pulse-loader-canvas" aria-hidden="true" />;
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,106,94,0.9)');
  gradient.addColorStop(0.18, 'rgba(255,106,94,0.36)');
  gradient.addColorStop(0.5, 'rgba(255,106,94,0.08)');
  gradient.addColorStop(1, 'rgba(255,106,94,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  return canvas;
}
