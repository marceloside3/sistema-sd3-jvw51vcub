import * as React from 'react'
import { cn } from '@/lib/utils'
import { getStatusMeta, type StatusCategory, type StatusMeta } from '@/lib/constants/status-catalog'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Categoria do status (projeto, demanda, prioridade, orçamento, pagamento, custo, g2, g3, etc.) */
  category: StatusCategory
  /** Valor bruto do status vindo do banco/API (ex: 'active', 'in_progress', 'pending', etc.) */
  status: string | boolean | null | undefined
  /** Rótulo customizado para sobrepor o padrão do catálogo se estritamente necessário */
  label?: string
  /** Se deve exibir o ponto colorido indicador (default: true) */
  showDot?: boolean
  /** Se deve exibir o ícone semântico do catálogo (default: false) */
  showIcon?: boolean
  /** Tamanho da badge: sm (compacto, p/ tabelas densas) ou md (padrão) */
  size?: 'sm' | 'md'
}

/**
 * StatusBadge — Componente único de pílula/badge padronizada do Sistema Side3.
 *
 * Garante em 100% dos ambientes:
 * - MESMO formato: pílula arredondada (`rounded-full`), borda fina suave, padding harmônico.
 * - MESMA cor: baseada na categoria semântica do status (verde p/ concluído/ativo, azul p/ andamento, etc.).
 * - MESMO texto: rótulos padronizados em todo o sistema.
 */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  (
    {
      category,
      status,
      label: customLabel,
      showDot = true,
      showIcon = false,
      size = 'md',
      className,
      ...props
    },
    ref,
  ) => {
    const meta: StatusMeta = React.useMemo(
      () => getStatusMeta(category, status),
      [category, status],
    )

    const label = customLabel ?? meta.label
    const Icon = meta.icon

    const sizeClasses =
      size === 'sm' ? 'text-[10px] px-2 py-0.5 gap-1' : 'text-[11px] px-2.5 py-0.5 gap-1.5'

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-semibold rounded-full border transition-colors select-none tracking-tight whitespace-nowrap',
          sizeClasses,
          meta.className,
          className,
        )}
        {...props}
      >
        {showDot && meta.dotColor && !showIcon && (
          <span
            className={cn(
              'rounded-full shrink-0',
              meta.dotColor,
              size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5',
            )}
            aria-hidden="true"
          />
        )}
        {showIcon && Icon && (
          <Icon
            className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')}
            aria-hidden="true"
          />
        )}
        <span>{label}</span>
      </span>
    )
  },
)

StatusBadge.displayName = 'StatusBadge'
