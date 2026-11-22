import { useEffect, useRef } from 'react';

/**
 * Donna's presence: a dot-matrix disc that breathes when idle and ripples with
 * voice level. `getLevel` returns 0..1 (live output volume, or a simulated value).
 */
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
    const n = 17;
    const gap = size / n;
    const c = size / 2;
    let raf = 0;
    let level = 0;

    const draw = (time: number) => {
      const style = getComputedStyle(canvas);
      const ink = style.getPropertyValue('--ink').trim() || '#1a1915';
      const accent = style.getPropertyValue('--accent').trim() || '#c8623c';
      const target = getLevel ? Math.min(1, Math.max(0, getLevel())) : 0;
      level += (target - level) * 0.18;
      ctx.clearRect(0, 0, size, size);
      const t = reduce ? 0 : time / 1000;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const px = gap * (x + 0.5);
          const py = gap * (y + 0.5);
          const d = Math.hypot(px - c, py - c) / c; // 0 center .. ~1.4 corner
          if (d > 1) continue;
          const breathe = 0.5 + 0.5 * Math.sin(t * 1.6 - d * 4);
          const ripple = level * (0.5 + 0.5 * Math.sin(t * 9 - d * 10));
          const r = gap * (0.1 + (1 - d) * 0.16 + breathe * 0.05 + ripple * 0.22);
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.6, r), 0, Math.PI * 2);
          const hot = active && d < 0.35 + level * 0.5;
          ctx.fillStyle = hot ? accent : ink;
          ctx.globalAlpha = hot ? 0.9 : 0.18 + (1 - d) * 0.55;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, getLevel, active]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" className="dot-orb" />;
}
