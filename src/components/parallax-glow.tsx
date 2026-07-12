import { useEffect, useRef } from "react";

export default function ParallaxGlow() {
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (groupRef.current) {
          groupRef.current.style.transform = `translate3d(-50%, ${y * 0.35}px, 0)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        ref={groupRef}
        className="absolute left-1/2 -top-[200px]"
        style={{ transform: "translate3d(-50%, 0, 0)" }}
      >
        {/* anel exterior do furacão */}
        <div
          className="hurricane-spin h-[900px] w-[900px] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--primary-glow) 55%, transparent) 60deg, transparent 140deg, color-mix(in oklab, var(--primary) 60%, transparent) 220deg, transparent 300deg, color-mix(in oklab, var(--primary-glow) 40%, transparent) 360deg)",
            filter: "blur(90px)",
          }}
        />
        {/* olho do furacão */}
        <div
          className="hurricane-spin-reverse absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "conic-gradient(from 90deg, transparent 0deg, color-mix(in oklab, var(--primary) 70%, transparent) 50deg, transparent 120deg, color-mix(in oklab, var(--primary-glow) 60%, transparent) 200deg, transparent 280deg)",
            filter: "blur(60px)",
          }}
        />
      </div>
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />

      <style>{`
        @keyframes hurricane-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes hurricane-spin-reverse {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        .hurricane-spin {
          animation: hurricane-spin 28s linear infinite;
          transform-origin: 50% 50%;
        }
        .hurricane-spin-reverse {
          animation: hurricane-spin-reverse 14s linear infinite;
          transform-origin: 50% 50%;
        }
      `}</style>
    </div>
  );
}
