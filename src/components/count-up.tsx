import { useEffect, useState } from "react";
import { useReveal } from "@/hooks/use-reveal";

export function CountUp({
  target,
  decimals = 0,
  suffix = "",
}: {
  target: number;
  decimals?: number;
  suffix?: string;
}) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const dur = 1200;
    const step = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target]);

  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}
