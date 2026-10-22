import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

const THEME_COLORS: Record<Theme, string> = {
  light: "#F4F3EF",
  dark: "#07090E",
};

function updateThemeColorMeta(theme: Theme) {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_COLORS[theme]);
  }
}

function getSystemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = true,
}: ThemeProviderProps) {
  const [hasUserPreference, setHasUserPreference] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("stockia-theme");
      return stored === "dark" || stored === "light";
    } catch {
      return false;
    }
  });

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("stockia-theme");
      if (stored === "dark" || stored === "light") return stored;
    } catch {}
    const system = getSystemTheme();
    return system || defaultTheme;
  });

  // Listen to system preference changes only if user hasn't chosen manually
  useEffect(() => {
    if (hasUserPreference || typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [hasUserPreference]);

  // Apply theme to DOM dataset and update meta tag
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    updateThemeColorMeta(theme);

    if (switchable && hasUserPreference) {
      try {
        localStorage.setItem("stockia-theme", theme);
      } catch {}
    }
  }, [theme, switchable, hasUserPreference]);

  const toggleTheme = () => {
    setHasUserPreference(true);
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
