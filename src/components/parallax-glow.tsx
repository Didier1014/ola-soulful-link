import { useEffect, useRef } from "react";

export default function ParallaxGlow() {
  const wrap = useRef<HTMLDivElement>(null);
  const vortex = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (vortex.current) {
          vortex.current.style.transform = `translate3d(-50%, ${y * 0.35}px, 0) rotate(${y * 0.15}deg)`;
        }
        if (wrap.current) {
          wrap.current.style.setProperty("--spin", `${y * 0.15}deg`);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={wrap}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Vortex */}
      <div
        ref={vortex}
        className="absolute left-1/2 top-[10%] h-[900px] w-[900px] will-change-transform"
        style={{
          transform: "translate3d(-50%, 0, 0)",
          animation: "vortex-spin 22s linear infinite",
        }}
      >
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, color-mix(in oklab, var(--primary-glow) 55%, transparent) 20%, transparent 40%, color-mix(in oklab, var(--primary) 60%, transparent) 60%, transparent 80%, color-mix(in oklab, var(--primary-glow) 45%, transparent) 100%)",
            filter: "blur(60px)",
            opacity: 0.75,
          }}
        />
        {/* Inner swirl */}
        <div
          className="absolute inset-[15%] rounded-full"
          style={{
            background:
              "conic-gradient(from 180deg, transparent, color-mix(in oklab, var(--primary-glow) 70%, transparent), transparent, color-mix(in oklab, var(--primary) 80%, transparent), transparent)",
            filter: "blur(40px)",
            animation: "vortex-spin-rev 14s linear infinite",
          }}
        />
        {/* Eye of the storm */}
        <div
          className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--primary-glow) 90%, white) 0%, color-mix(in oklab, var(--primary) 70%, transparent) 40%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />

      <style>{`
        @keyframes vortex-spin {
          to { filter: hue-rotate(20deg); }
        }
        @keyframes vortex-spin-rev {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
