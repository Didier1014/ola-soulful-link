import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

const STORAGE_KEY = "redox-theme";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  return document.documentElement.classList.contains("dark") ? "dark" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const update = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    try { window.localStorage.setItem(STORAGE_KEY, t); } catch {}
  };

  return { theme, setTheme: update, toggle: () => update(theme === "dark" ? "light" : "dark") };
}

/**
 * Futuristic segmented dark/light selector.
 * Small pill with a glowing slider that snaps between icons.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      role="radiogroup"
      aria-label="Selecionar tema"
      className={
        "relative inline-flex items-center h-10 rounded-xl p-1 " +
        "bg-white/5 border border-white/10 backdrop-blur-xl " +
        "shadow-[inset_0_0_20px_-10px_var(--primary-glow)] " +
        className
      }
    >
      {/* animated glow slider */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 w-8 rounded-lg transition-all duration-300 ease-out"
        style={{
          left: isDark ? "4px" : "36px",
          background:
            "linear-gradient(135deg, var(--primary), var(--primary-glow))",
          boxShadow:
            "0 0 18px -2px var(--primary-glow), inset 0 0 12px color-mix(in oklab, white 20%, transparent)",
        }}
      />
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        aria-label="Modo escuro"
        onClick={() => setTheme("dark")}
        className={
          "relative z-10 h-8 w-8 flex items-center justify-center rounded-lg transition-colors " +
          (isDark ? "text-white" : "text-muted-foreground hover:text-foreground")
        }
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        aria-label="Modo claro"
        onClick={() => setTheme("light")}
        className={
          "relative z-10 h-8 w-8 flex items-center justify-center rounded-lg transition-colors " +
          (!isDark ? "text-white" : "text-muted-foreground hover:text-foreground")
        }
      >
        <Sun className="h-4 w-4" />
      </button>
    </div>
  );
}
