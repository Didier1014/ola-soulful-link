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
        <div
          className="hurricane-spin mix-blend-screen h-[780px] w-[780px] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, oklch(0.55 0.24 25) 55deg, transparent 130deg, oklch(0.5 0.22 20) 210deg, transparent 290deg, oklch(0.6 0.25 25) 350deg, transparent 360deg)",
            filter: "blur(35px)",
            opacity: 0.85,
          }}
        />
        <div
          className="hurricane-spin-reverse mix-blend-screen absolute inset-[130px] rounded-full"
          style={{
            background:
              "conic-gradient(from 90deg, transparent 0deg, oklch(0.62 0.25 22) 60deg, transparent 140deg, oklch(0.55 0.23 18) 240deg, transparent 320deg)",
            filter: "blur(20px)",
            opacity: 0.9,
          }}
        />
        <div
          className="hurricane-pulse mix-blend-screen absolute inset-[320px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.75 0.22 25) 0%, oklch(0.55 0.24 22) 45%, transparent 75%)",
            filter: "blur(4px)",
          }}
        />
      </div>
    </div>
  );
}
