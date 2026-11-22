import { useEffect, useRef } from 'react';

/**
 * Donna's presence: a 3D dot sphere that slowly spins and breathes.
 * Three strands plait around it, and a wave rolls through its rings with voice level.
 * `getLevel` returns 0..1 (live output volume, or a simulated value).
 * `active` turns the strands to the accent color.
 */

const COUNT = 640;
const STRANDS = 3;

// Evenly spread points on a unit sphere (Fibonacci lattice).
const POINTS = Array.from({ length: COUNT }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / COUNT;
  const r = Math.sqrt(1 - y * y);
  const a = i * Math.PI * (3 - Math.sqrt(5));
  return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, lon: Math.atan2(Math.sin(a), Math.cos(a)) };
});

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function DotOrb({
  size = 220,
  getLevel,
  active = false,
}: {
  size?: number;
  getLevel?: () => number;
  active?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const c = size / 2;
    const R = size * 0.4;
    const dot = Math.max(0.9, size / 150);
    const tilt = 0.38;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const drawn = POINTS.map(() => ({ x: 0, y: 0, z: 0, s: 0, strand: 0 }));
    let raf = 0;
    let level = 0;

    const draw = (time: number) => {
      const style = getComputedStyle(canvas);
      const ink = style.getPropertyValue('--ink').trim() || '#ececec';
      const accent = style.getPropertyValue('--accent').trim() || '#f0743e';
      const target = getLevel ? Math.min(1, Math.max(0, getLevel())) : 0;
      level += (target - level) * 0.15;
      const t = reduce ? 0 : time / 1000;

      const spin = t * 0.35;
      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);
      const breathe = 0.025 * Math.sin(t * 1.4);

      for (let i = 0; i < COUNT; i++) {
        const p = POINTS[i];
        // Listening: a wave rolls down through the latitude rings, bigger with voice.
        const wave = Math.sin(p.y * 7 - t * 4.5);
        const radius = 1 + breathe + wave * (0.02 + level * 0.14);

        // Weaving: three helical strands plait around the sphere.
        let strand = 0;
        for (let k = 0; k < STRANDS; k++) {
          const dir = k % 2 === 0 ? 1 : -1;
          const along = (2 * Math.PI * k) / STRANDS + dir * (p.y * 2.6 + t * 0.9);
          const d = Math.abs(wrap(p.lon - along));
          strand = Math.max(strand, 1 - d / 0.3);
        }

        // Spin around Y, then tilt toward the viewer.
        const x1 = p.x * cosS + p.z * sinS;
        const z1 = -p.x * sinS + p.z * cosS;
        const y2 = p.y * cosT - z1 * sinT;
        const z2 = p.y * sinT + z1 * cosT;

        const persp = 3 / (3 - z2);
        const o = drawn[i];
        o.x = c + x1 * radius * R * persp;
        o.y = c - y2 * radius * R * persp;
        o.z = z2;
        o.s = persp;
        o.strand = Math.max(0, strand);
      }

      drawn.sort((a, b) => a.z - b.z);
      ctx.clearRect(0, 0, size, size);
      for (const o of drawn) {
        const depth = (o.z + 1) / 2; // 0 back .. 1 front
        const r = dot * o.s * (0.4 + depth * 0.45 + o.strand * (0.9 + level * 0.8));
        ctx.beginPath();
        ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
        const lit = o.strand > 0.35;
        ctx.fillStyle = lit && active ? accent : ink;
        ctx.globalAlpha = lit ? 0.35 + depth * 0.65 : (0.08 + depth * 0.4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, getLevel, active]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" className="dot-orb" />;
}
