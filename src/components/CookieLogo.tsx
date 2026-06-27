import React, { useEffect, useRef } from 'react';

interface CookieLogoProps {
  onClick: () => void;
  reducedMotion?: boolean;
  className?: string;
}

const WORD = 'COOKIE';

// A bite is a set of scooped circles (word-local coords) plus a birth time.
// Instead of painting over the letters with a solid color — which can't match
// the header's translucent frosted-glass bar — we punch the letters out with a
// CSS mask, so the bitten region reveals the bar's own backdrop (and tracks it
// as the page scrolls).
interface Bite {
  circles: { cx: number; cy: number; r: number }[];
  start: number;
}

export const CookieLogo: React.FC<CookieLogoProps> = ({ onClick, reducedMotion, className = '' }) => {
  const wordRef = useRef<HTMLSpanElement>(null);

  // per-letter spring state
  const N = WORD.length;
  const y = useRef<number[]>(new Array(N).fill(0));
  const vy = useRef<number[]>(new Array(N).fill(0));
  const sc = useRef<number[]>(new Array(N).fill(1));
  const vs = useRef<number[]>(new Array(N).fill(0));
  const cx = useRef(-9999);
  const cy = useRef(-9999);
  const hovering = useRef(false);
  const pressing = useRef(false);
  const bites = useRef<Bite[]>([]);

  // 0 -> pop in, hold, then heal back to 0. Returns a radius multiplier.
  const biteScale = (age: number): number => {
    const IN = 170, HOLD = 680, OUT = 1020;
    if (age < IN) {
      const t = age / IN;            // overshoot pop
      return 1 + 0.18 * Math.sin(t * Math.PI) - (1 - t) * (1 - t);
    }
    if (age < HOLD) return 1;
    if (age < OUT) {
      const t = (age - HOLD) / (OUT - HOLD);
      return 1 - t * t;             // ease-in shrink
    }
    return 0;
  };

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const tick = () => {
      const el = wordRef.current;
      if (el && el.children.length) {
        const rect = el.getBoundingClientRect();
        const cursorLocal = cx.current - rect.left;
        const half = rect.height / 2;
        let dir = (cy.current - (rect.top + half)) / half;
        dir = Math.max(-1.4, Math.min(1.4, dir));
        const sigma = 48;
        const dipAmp = hovering.current ? (pressing.current ? 11 : 7) : 0;
        const sqAmp = hovering.current ? (pressing.current ? 0.12 : 0.07) : 0;
        const k = 0.12, damp = 0.82;
        for (let i = 0; i < N; i++) {
          const child = el.children[i] as HTMLElement;
          const center = child.offsetLeft + child.offsetWidth / 2;
          const dx = center - cursorLocal;
          const bump = Math.exp(-(dx * dx) / (2 * sigma * sigma));
          const ty = dipAmp * dir * bump;
          const ts = 1 - sqAmp * dir * bump;
          vy.current[i] = (vy.current[i] + (ty - y.current[i]) * k) * damp;
          y.current[i] += vy.current[i];
          vs.current[i] = (vs.current[i] + (ts - sc.current[i]) * k) * damp;
          sc.current[i] += vs.current[i];
          child.style.transform =
            `translateY(${y.current[i].toFixed(2)}px) scaleY(${sc.current[i].toFixed(3)})`;
        }

        // Build the bite mask from any active bites and apply it to the word.
        const now = performance.now();
        bites.current = bites.current.filter((b) => now - b.start < 1020);
        if (bites.current.length) {
          const layers: string[] = [];
          for (const b of bites.current) {
            const s = biteScale(now - b.start);
            for (const c of b.circles) {
              const r = Math.max(0, c.r * s);
              // transparent inside the circle (letter removed), opaque outside
              layers.push(
                `radial-gradient(circle at ${c.cx.toFixed(1)}px ${c.cy.toFixed(1)}px, ` +
                `transparent ${r.toFixed(1)}px, #000 ${(r + 0.6).toFixed(1)}px)`
              );
            }
          }
          const image = layers.join(',');
          // intersect: a pixel is hidden if ANY layer hides it -> holes accumulate
          const comp = layers.map(() => 'intersect').join(',');
          el.style.maskImage = image;
          el.style.webkitMaskImage = image;
          el.style.maskComposite = comp;
          (el.style as CSSStyleDeclaration & { webkitMaskComposite?: string }).webkitMaskComposite =
            layers.map(() => 'source-in').join(',');
        } else if (el.style.maskImage) {
          el.style.maskImage = '';
          el.style.webkitMaskImage = '';
          el.style.maskComposite = '';
          (el.style as CSSStyleDeclaration & { webkitMaskComposite?: string }).webkitMaskComposite = '';
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, N]);

  const spawnCrumbs = (el: HTMLElement, lx: number, ly: number) => {
    const parent = el.parentElement;
    if (!parent) return;
    const ox = el.offsetLeft, oy = el.offsetTop;
    const colors = ['#8a5a3c', '#a0401f', '#6f4a30'];
    for (let n = 0; n < 7; n++) {
      const c = document.createElement('span');
      const sz = 3 + Math.random() * 3.5;
      c.style.cssText =
        `position:absolute;left:${lx + ox}px;top:${ly + oy}px;width:${sz}px;height:${sz}px;` +
        `border-radius:50%;background:${colors[n % 3]};pointer-events:none;z-index:5;` +
        `transition:transform .65s cubic-bezier(.2,.6,.3,1),opacity .65s ease;`;
      parent.appendChild(c);
      const dx = (Math.random() - 0.5) * 84;
      const dy = 22 + Math.random() * 48;
      requestAnimationFrame(() => {
        c.style.transform = `translate(${dx}px,${dy}px)`;
        c.style.opacity = '0';
      });
      window.setTimeout(() => c.remove(), 720);
    }
  };

  const chomp = (e: React.PointerEvent) => {
    const el = wordRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const lx = e.clientX - rect.left, ly = e.clientY - rect.top;
    const H = rect.height;

    // bite comes from the nearest edge (top if cursor high, bottom if low)
    const fromTop = ly < H / 2;
    const s = fromTop ? 1 : -1;
    const edgeY = fromTop ? H * 0.10 : H * 0.90;

    // row of overlapping scoops -> scalloped, teeth-marked edge.
    // Coordinates are word-local so they map straight onto the mask.
    const drop = 25.65;
    const cols = [-35.1, -12.15, 12.15, 36.45];
    const radii = [20.25, 27.675, 23.625, 18.225];
    const circles: Bite['circles'] = [];
    for (let i = 0; i < cols.length; i++) {
      const r = radii[i] + (Math.random() * 2 - 1);
      const dx = cols[i] + (Math.random() * 3 - 1.5);
      const dy = s * (drop - r);
      circles.push({ cx: lx + dx, cy: edgeY + dy, r });
    }

    bites.current.push({ circles, start: performance.now() });
    spawnCrumbs(el, lx, ly);
  };

  const onEnter = (e: React.PointerEvent) => { hovering.current = true; cx.current = e.clientX; cy.current = e.clientY; };
  const onLeave = () => { hovering.current = false; pressing.current = false; };
  const onMove = (e: React.PointerEvent) => { cx.current = e.clientX; cy.current = e.clientY; hovering.current = true; };
  const onDown = (e: React.PointerEvent) => { pressing.current = true; cx.current = e.clientX; cy.current = e.clientY; if (!reducedMotion) chomp(e); };
  const onUp = () => {
    if (!pressing.current) return;
    pressing.current = false;
    for (let i = 0; i < N; i++) { vy.current[i] -= 0.05; vs.current[i] += 0.012; }
  };

  if (reducedMotion) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`text-3xl font-headline font-bold italic tracking-[-0.06em] text-primary hover:opacity-70 transition-opacity ${className}`}
      >
        {WORD}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerUp={onUp}
      aria-label="COOKIE — home"
      className={`relative text-3xl font-headline font-bold italic tracking-[-0.06em] text-primary leading-none select-none ${className}`}
      style={{ touchAction: 'none' }}
    >
      <span ref={wordRef} className="relative inline-block whitespace-nowrap" style={{ lineHeight: 1 }}>
        {WORD.split('').map((ch, i) => (
          <span
            key={i}
            style={{ display: 'inline-block', willChange: 'transform', transformOrigin: '50% 50%' }}
          >
            {ch}
          </span>
        ))}
      </span>
    </button>
  );
};
