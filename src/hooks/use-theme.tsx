import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'side3-theme'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readInitial(): Theme {
  try {
    if (typeof window === 'undefined') return 'light'
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    // Fall back to the legacy criacao-kanban-theme key so existing users keep
    // their preference when migrating to the global toggle.
    const legacy = window.localStorage.getItem('criacao-kanban-theme')
    if (legacy === 'dark') return 'dark'
    // Respect the OS preference on first visit.
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  return 'light'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = theme
}

/**
 * Global light/dark theme provider.
 *
 * Persists the preference in localStorage (`side3-theme`), applies the `dark`
 * class to <html> so Tailwind's `dark:` variant works across every page
 * (login, dashboard, projects, demands, kanban, admin, ...), and exposes a
 * `toggleTheme` for the header switch.
 *
 * Also keeps the legacy `criacao-kanban-theme` key in sync so the Criação
 * Kanban page can keep reading its own preference if needed.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitial)

  // Apply + persist whenever the theme changes (and on first mount).
  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
      window.localStorage.setItem('criacao-kanban-theme', theme)
    } catch {
      /* ignore storage errors */
    }
  }, [theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  )

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
