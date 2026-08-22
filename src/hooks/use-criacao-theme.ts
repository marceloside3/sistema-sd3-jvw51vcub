import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'criacao-kanban-theme'

function readInitial(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'dark'
  } catch {
    return false
  }
}

/**
 * Local theme state for the Criação Kanban page.
 * Persists the light/dark preference in localStorage and exposes a toggle.
 * The actual `dark` class is applied on the page root container (scoped),
 * so only the Kanban experience switches theme.
 */
export function useCriacaoTheme() {
  const [isDark, setIsDark] = useState<boolean>(readInitial)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, [isDark])

  const toggle = useCallback(() => setIsDark((v) => !v), [])

  return { isDark, toggle }
}
