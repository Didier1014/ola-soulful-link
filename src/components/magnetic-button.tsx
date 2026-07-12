import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MagneticButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.25;
    const y = (e.clientY - r.top - r.height / 2) * 0.25;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  const reset = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };

  return (
    <Button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn("transition-transform duration-200 ease-out", className)}
      {...props}
    >
      {children}
    </Button>
  );
}
