import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

type Theme = "light" | "dark";

const ThemeContext = createContext<Theme>("light");

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const win = getCurrentWindow();

    // Read OS theme on mount
    win.theme().then((t) => {
      const resolved: Theme = t === "dark" ? "dark" : "light";
      setTheme(resolved);
      document.body.setAttribute("data-theme", resolved);
    });

    // Listen for OS theme changes
    const unlistenPromise = win.onThemeChanged(({ payload }) => {
      const resolved: Theme = payload === "dark" ? "dark" : "light";
      setTheme(resolved);
      document.body.setAttribute("data-theme", resolved);
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}
