import { useTheme } from '@/hooks/use-theme'

/**
 * Bridge to the global theme for the Criação Kanban page.
 *
 * The dark/light toggle is now global (see `useTheme` / `ThemeProvider`):
 * toggling it from the header flips the `dark` class on <html>, which the
 * Kanban page picks up through its existing `dark:` Tailwind variants.
 *
 * This hook is kept for backwards compatibility so the Kanban page can still
 * call `useCriacaoTheme()` — it simply delegates to the global theme.
 */
export function useCriacaoTheme() {
  const { isDark, toggleTheme } = useTheme()
  return { isDark, toggle: toggleTheme }
}
