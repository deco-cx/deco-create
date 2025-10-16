/**
 * Global Theme Context for managing TODO card themes across the application.
 * 
 * Features:
 * - Global theme state accessible from any component
 * - Persistent storage in localStorage
 * - Automatic rehydration on app load
 * - Type-safe theme access
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { TodoSetting } from "@/hooks/useTodoSettings";

interface ThemeContextValue {
  activeTheme: TodoSetting | undefined;
  setActiveTheme: (theme: TodoSetting | undefined) => void;
  colors: {
    cardColor: string;
    completedColor: string;
    textColor: string;
  };
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const DEFAULT_COLORS = {
  cardColor: "#1e293b", // slate-800
  completedColor: "#334155", // slate-700
  textColor: "#e2e8f0", // slate-200
};

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [activeTheme, setActiveThemeState] = useState<TodoSetting | undefined>(undefined);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeUri = localStorage.getItem("activeThemeUri");
    if (savedThemeUri) {
      // Theme will be rehydrated when settings load
      // This just marks that we should restore a theme
    }
  }, []);

  // Set theme and persist to localStorage
  const setActiveTheme = (theme: TodoSetting | undefined) => {
    setActiveThemeState(theme);
    if (theme) {
      localStorage.setItem("activeThemeUri", theme.uri);
    } else {
      localStorage.removeItem("activeThemeUri");
    }
  };

  // Get current colors from active theme or defaults
  const colors = activeTheme
    ? {
        cardColor: activeTheme.data.cardColor,
        completedColor: activeTheme.data.completedColor,
        textColor: activeTheme.data.textColor,
      }
    : DEFAULT_COLORS;

  return (
    <ThemeContext.Provider value={{ activeTheme, setActiveTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the global theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Hook to restore saved theme from localStorage when settings load
 */
export function useThemeRestore(settings: TodoSetting[] | undefined) {
  const { setActiveTheme } = useTheme();

  useEffect(() => {
    if (!settings || settings.length === 0) return;

    const savedThemeUri = localStorage.getItem("activeThemeUri");
    if (savedThemeUri) {
      const savedTheme = settings.find((s) => s.uri === savedThemeUri);
      if (savedTheme) {
        setActiveTheme(savedTheme);
      }
    }
  }, [settings, setActiveTheme]);
}

