/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const WORDS           = ['FUK', 'YOU', 'VERY', 'MUCH.'];
const SPAWN_INTERVAL  = 3500;   // ms between phrase launches
const FLIGHT_DURATION = 2500;   // ms for full z-travel
const WORD_STAGGER    = 180;    // ms delay between each word in the phrase

// Each word has: a horizontal drift (vw multiplier) AND a vertical arc offset
// The arc bows the words upward in the middle like a baseball — words 0 and 3
// sit at baseline, words 1 and 2 rise toward the crown of the curve.
// The curve is computed in the render using a sine-based arc formula.
const WORD_CONFIG = [
  { drift: -0.45, arcT: 0.0  },  // FUK    — left side of arc, baseline
  { drift: -0.15, arcT: 0.33 },  // YOU    — rising toward crown
  { drift:  0.15, arcT: 0.66 },  // VERY   — descending from crown
  { drift:  0.45, arcT: 1.0  },  // MUCH.  — right side, baseline
];

// Arc height in vh — how far the crown of the curve rises above the baseline
const ARC_HEIGHT_VH = 7;
// ─────────────────────────────────────────────────────────────────────────────

interface Particle {
  id: string;
  word: string;
  drift: number;
  arcT: number;
  startTime: number;
  duration: number;
  scale?: number;
  opacity?: number;
  x?: number;
  y?: number;
}

export default function App() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const rafRef       = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const idRef        = useRef<number>(0);

  const tick = useCallback(() => {
    const now = Date.now();

    // ── Spawn a new phrase every SPAWN_INTERVAL ms ──────────────────────────
    if (now - lastSpawnRef.current > SPAWN_INTERVAL) {
      const phraseId = idRef.current++;
      const newWords: Particle[] = WORDS.map((word, i) => ({
        id        : `${phraseId}-${i}`,
        word,
        drift     : WORD_CONFIG[i].drift,
        arcT      : WORD_CONFIG[i].arcT,
        startTime : now + i * WORD_STAGGER,
        duration  : FLIGHT_DURATION,
      }));
      setParticles(prev => [...prev, ...newWords]);
      lastSpawnRef.current = now;
    }

    // ── Update each particle's position/scale/opacity ───────────────────────
    setParticles(prev =>
      prev.map(p => {
        const elapsed = now - p.startTime;
        if (elapsed < 0) return p;

        const t = elapsed / p.duration;
        if (t > 1) return null;

        // Scale: steep exponential — the rush hits in the final third
        const scale = 0.01 + Math.pow(t, 2.8) * 30;

        // Opacity: quick fade in, hold, then blow out near the end
        const opacity =
          t < 0.07 ? t / 0.07
          : t > 0.70 ? 1 - (t - 0.70) / 0.30
          : 1;

        // ── Curveball Physics ────────────────────────────────────────────────
        // A curveball starts high, hangs slightly, then "breaks" sharply 
        // downward and sideways as it reaches the plate.

        // Late-breaking intensity: cubic power ensures the snap happens at the end
        const breakT = Math.pow(t, 3);

        // Horizontal "break": the ball snaps sideways (e.g., to the right for a righty curve)
        const horizontalBreak = breakT * 25; 

        // Vertical "break": the ball drops off a table
        const verticalBreak = breakT * 20;

        // Initial "hump": the ball is thrown slightly upward before the break
        // We use a sine wave over the flight duration (t) for the initial arc
        const initialArc = -Math.sin(t * Math.PI) * 12;

        // Final positions:
        // x: base drift (spacing) + the horizontal break
        const x = (p.drift * scale * 5) + (horizontalBreak * scale * 0.04);

        // y: initial arc + the sharp vertical drop
        // We also incorporate p.arcT to keep the phrase's internal bowed shape
        const phraseArc = -Math.sin(Math.PI * p.arcT) * 4;
        const y = (initialArc + verticalBreak + phraseArc) * scale * 0.18;

        return { ...p, scale, opacity, x, y };
      }).filter((p): p is Particle => p !== null)
    );

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  return (
    <div style={{
      position      : 'relative',
      width         : '100vw',
      height        : '100vh',
      background    : '#060606',
      overflow      : 'hidden',
      display       : 'flex',
      alignItems    : 'center',
      justifyContent: 'center',
    }}>

      {/* ── Grain ──────────────────────────────────────────────────────────── */}
      <div style={{
        position      : 'absolute',
        inset         : 0,
        zIndex        : 5,
        opacity       : 0.13,
        mixBlendMode  : 'screen',
        pointerEvents : 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '160px 160px',
      }} />

      {/* ── MIDDLE FINGER ──────────────────────────────────────────────────── */}
      {/*
          Built as a proper anatomical hand SVG.
          viewBox: 0 0 120 200
          Palm is a rounded rectangle. Five fingers extend upward.
          Index, ring, and pinky are bent (short rects that tuck into the palm).
          Middle finger is tall and fully extended with a visible nail detail.
          Thumb angles out to the lower-left.
          Opacity 0.28 — visible as a clear silhouette without competing with the text.
      */}
      <div style={{
        position    : 'absolute',
        zIndex      : 10,
        opacity     : 0.28,
        pointerEvents: 'none',
        // Shift it very slightly below center so it reads as a natural hand pose
        transform   : 'translateY(8%)',
      }}>
        <svg width="200" height="320" viewBox="0 0 120 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Subtle inner glow so the silhouette reads against the dark bg */}
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <g filter="url(#softGlow)" fill="white">

            {/* ── Palm ──────────────────────────────────────────────────── */}
            <rect x="22" y="110" width="76" height="76" rx="14" ry="14"/>

            {/* ── Thumb — angled left, shorter, exits palm on the left side ── */}
            <rect
              x="6" y="128"
              width="24" height="36"
              rx="11" ry="11"
              transform="rotate(-20 18 146)"
            />

            {/* ── Index finger — bent/folded: short stub ─────────────────── */}
            <rect x="22" y="80" width="18" height="40" rx="8" ry="8"/>

            {/* ── MIDDLE FINGER — fully extended, tall ───────────────────── */}
            {/* Base segment */}
            <rect x="42" y="30" width="20" height="88" rx="9" ry="9"/>
            {/* Fingernail cutout — a slightly darker rounded rect at the tip */}
            <rect x="45" y="33" width="14" height="22" rx="5" ry="5" fill="#111111" opacity="0.6"/>
            {/* Knuckle crease lines */}
            <line x1="43" y1="88" x2="61" y2="88" stroke="#060606" strokeWidth="2" opacity="0.5"/>
            <line x1="43" y1="100" x2="61" y2="100" stroke="#060606" strokeWidth="1.5" opacity="0.35"/>

            {/* ── Ring finger — bent/folded: short stub ──────────────────── */}
            <rect x="64" y="80" width="18" height="40" rx="8" ry="8"/>

            {/* ── Pinky — bent, shortest ─────────────────────────────────── */}
            <rect x="82" y="92" width="15" height="30" rx="7" ry="7"/>

            {/* ── Knuckle ridge across top of palm ──────────────────────── */}
            <rect x="22" y="108" width="76" height="10" rx="5" ry="5" opacity="0.4"/>

          </g>
        </svg>
      </div>

      {/* ── Flying words ───────────────────────────────────────────────────── */}
      {particles.map(p => {
        if (p.scale == null) return null;
        return (
          <div
            key={p.id}
            style={{
              position     : 'absolute',
              left         : '50%',
              top          : '50%',
              zIndex       : 20,
              // x is in vw units, y is in vh units — both computed in tick()
              transform    : `translate(calc(-50% + ${p.x}vw), calc(-50% + ${p.y}vh)) scale(${p.scale})`,
              opacity      : p.opacity,
              color        : '#ffffff',
              fontFamily   : "'Bebas Neue', 'Impact', sans-serif",
              fontSize     : '5vw',
              fontWeight   : 900,
              letterSpacing: '0.04em',   // slight open spacing between letters
              whiteSpace   : 'nowrap',
              pointerEvents: 'none',
              willChange   : 'transform, opacity',
              textShadow   : '0 0 55px rgba(255,255,255,0.45)',
              userSelect   : 'none',
            }}
          >
            {p.word}
          </div>
        );
      })}

      {/* ── Vignette ───────────────────────────────────────────────────────── */}
      <div style={{
        position    : 'absolute',
        inset       : 0,
        zIndex      : 40,
        pointerEvents: 'none',
        boxShadow   : 'inset 0 0 200px rgba(0,0,0,0.90)',
      }}/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060606; overflow: hidden; }
      `}</style>
    </div>
  );
}

