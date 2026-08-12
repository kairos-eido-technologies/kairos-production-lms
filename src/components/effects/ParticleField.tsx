import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  density?: number;
  burst?: boolean;
  className?: string;
};

export default function ParticleField({ density = 1, burst = false, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef(0);

  useEffect(() => {
    if (burst) burstRef.current = 1;
  }, [burst]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.z = 14;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const count = Math.round(1100 * density);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const warm = new THREE.Color("#e0452c");
    const cool = new THREE.Color("#8d8d94");

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 34;
      const y = (Math.random() - 0.5) * 22;
      const z = (Math.random() - 0.5) * 18;
      positions.set([x, y, z], i * 3);
      seeds.set([x, y, z], i * 3);
      const c = Math.random() < 0.45 ? warm : cool;
      colors.set([c.r, c.g, c.b], i * 3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const pointer = new THREE.Vector2(0, 0);
    const target = new THREE.Vector2(0, 0);

    const onPointerMove = (e: PointerEvent) => {
      target.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };
    window.addEventListener("pointermove", onPointerMove);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    let t = 0;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      t += 0.004;
      pointer.lerp(target, 0.05);

      const px = pointer.x * 17;
      const py = pointer.y * 11;
      const boost = burstRef.current;
      if (burstRef.current > 0) burstRef.current = Math.max(0, burstRef.current - 0.012);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const sx = seeds[i3]!;
        const sy = seeds[i3 + 1]!;
        const sz = seeds[i3 + 2]!;

        let x = sx + Math.sin(t + sy * 0.3) * 0.6;
        let y = sy + Math.cos(t * 0.8 + sx * 0.25) * 0.6;

        const dx = x - px;
        const dy = y - py;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) {
          const push = (5 - dist) * 0.28;
          x += (dx / (dist || 1)) * push;
          y += (dy / (dist || 1)) * push;
        }
        if (boost > 0) {
          const r = Math.hypot(sx, sy) || 1;
          x += (sx / r) * boost * 5;
          y += (sy / r) * boost * 5;
        }

        pos.setXYZ(i, x, y, sz);
      }
      pos.needsUpdate = true;
      points.rotation.y = pointer.x * 0.12;
      points.rotation.x = -pointer.y * 0.08;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [density]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
