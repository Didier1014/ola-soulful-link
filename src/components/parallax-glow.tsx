import { useEffect, useState } from "react";

export default function ParallaxGlow() {
  const [pos, setPos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-[background] duration-500 ease-out"
      style={{
        background: `radial-gradient(600px circle at ${pos.x}% ${pos.y}%, color-mix(in oklab, var(--primary-glow) 10%, transparent), transparent 60%)`,
      }}
    />
  );
}
