import { forwardRef, useRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MagneticButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, _ref) => {
    const innerRef = useRef<HTMLButtonElement | null>(null);

    const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      const el = innerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
    };
    const onLeave = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.transform = "translate(0,0)";
    };

    return (
      <Button
        ref={innerRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={cn("transition-transform duration-200 ease-out will-change-transform", className)}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
MagneticButton.displayName = "MagneticButton";
