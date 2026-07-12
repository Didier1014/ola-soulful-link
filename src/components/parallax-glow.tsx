import { useEffect, useRef } from "react";

export default function ParallaxGlow() {
  const glow1 = useRef<HTMLDivElement>(null);
  const glow2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (glow1.current) glow1.current.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
        if (glow2.current) glow2.current.style.transform = `translate3d(0, ${y * -0.15}px, 0)`;
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
      <div ref={glow1} className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[160px]" />
      <div ref={glow2} className="absolute top-1/2 -right-32 h-[420px] w-[420px] rounded-full bg-primary-glow/20 blur-[140px]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />
    </div>
  );
}
