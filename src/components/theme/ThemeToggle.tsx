import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

/**
 * Light/dark theme switch rendered in the global header.
 * Reads and writes the preference through the global ThemeProvider so every
 * page of the system follows the same setting.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        'relative rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors',
        'dark:text-zinc-300 dark:hover:text-zinc-50 dark:hover:bg-zinc-800',
        className,
      )}
      title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-pressed={isDark}
    >
      {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
