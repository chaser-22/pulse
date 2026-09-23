import { useEffect, useRef } from 'react';
import * as THREE from 'three';

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
    if (!host || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      host.dataset.fallback = 'true';
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
    camera.position.set(0, 0, 7);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(7.6, 2.8, 48, 10);
    const base = geometry.attributes.position.array.slice();
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x2a1717,
      emissive: 0xff6a5e,
      emissiveIntensity: .16,
      transparent: true,
      opacity: .72,
      roughness: .72,
      metalness: .08,
      side: THREE.DoubleSide,
    });
    const ribbon = new THREE.Mesh(geometry, material);
    ribbon.rotation.x = -.52;
    ribbon.rotation.z = -.12;
    scene.add(ribbon);
    scene.add(new THREE.AmbientLight(0xffffff, .55));

    let frame = 0;
    let visible = true;
    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .05 });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(host);
    resizeObserver.observe(host);
    resize();

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden) return;
      const positions = geometry.attributes.position;
      for (let index = 0; index < positions.count; index += 1) {
        const x = base[index * 3];
        const y = base[index * 3 + 1];
        positions.setZ(index, Math.sin(x * 1.15 + now * .00022) * .22 + Math.cos(y * 2.1 + now * .00013) * .08);
      }
      positions.needsUpdate = true;
      const recovering = pulseStarted.current > 0 && now - pulseStarted.current < 900;
      material.emissive.setHex(recovering ? 0x2ecc9d : 0xff6a5e);
      material.emissiveIntensity = recovering ? .42 * (1 - (now - pulseStarted.current) / 900) + .12 : .16;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="revenue-signal" aria-hidden="true"><div className="signal-static" /></div>;
}
