import { useEffect, useRef } from "react";

export default function ParallaxGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (ref.current) ref.current.style.transform = `translate3d(-50%, ${y * 0.4}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        ref={ref}
        className="pointer-events-none absolute left-1/2 -top-[160px]"
        style={{ transform: "translate3d(-50%, 0, 0)" }}
      >
        {/* camada externa - braços do vórtice bem definidos */}
        <div
          className="hurricane-spin mix-blend-screen h-[780px] w-[780px] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, oklch(0.6 0.26 25) 20deg, transparent 70deg, oklch(0.45 0.22 20) 110deg, transparent 160deg, oklch(0.62 0.26 28) 200deg, transparent 250deg, oklch(0.5 0.24 22) 290deg, transparent 340deg)",
            filter: "blur(8px)",
            opacity: 0.55,
          }}
        />
        {/* camada intermédia - espirais internas mais rápidas */}
        <div
          className="hurricane-spin-reverse mix-blend-screen absolute inset-[130px] rounded-full"
          style={{
            background:
              "conic-gradient(from 90deg, transparent 0deg, oklch(0.65 0.27 24) 25deg, transparent 80deg, oklch(0.5 0.24 20) 140deg, transparent 200deg, oklch(0.6 0.25 22) 260deg, transparent 320deg)",
            filter: "blur(5px)",
            opacity: 0.6,
            boxShadow:
              "inset 0 0 0 1px color-mix(in oklab, oklch(0.7 0.24 25) 45%, transparent), inset 0 0 30px color-mix(in oklab, oklch(0.6 0.24 22) 30%, transparent)",
          }}
        />
        {/* olho do furacão - núcleo pulsante bem definido */}
        <div
          className="hurricane-pulse mix-blend-screen absolute inset-[320px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.78 0.22 25) 0%, oklch(0.55 0.24 22) 45%, transparent 75%)",
            filter: "blur(3px)",
            opacity: 0.6,
            boxShadow:
              "0 0 0 1px color-mix(in oklab, oklch(0.75 0.22 25) 60%, transparent), 0 0 20px color-mix(in oklab, oklch(0.65 0.24 22) 40%, transparent)",
          }}
        />
      </div>
    </div>
  );
}
