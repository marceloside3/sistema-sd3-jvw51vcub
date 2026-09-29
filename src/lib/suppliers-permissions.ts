import type { useCurrentUser } from '@/hooks/use-current-user'

type CurrentUserData = NonNullable<ReturnType<typeof useCurrentUser>['data']>

/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas.
 */
function normalizeText(text?: string | null): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Retorna true se o usuário atual pertence às áreas autorizadas a acessar
 * a funcionalidade de Fornecedores:
 * - Admin (is_admin === true)
 * - Atendimento
 * - Produção
 * - Financeiro
 *
 * As demais áreas (Criação, Planejamento, Mídia, Social, Influs etc.) não têm acesso.
 */
export function canAccessSuppliers(userData: CurrentUserData | null | undefined): boolean {
  if (!userData) return false

  // 1. Admin sempre tem acesso
  if (userData.profile?.is_admin === true) return true

  // Perfis ou códigos autorizados
  const allowedCodes = new Set(['atendimento', 'producao', 'financeiro'])

  // 2. Checa pelo código ou nome do perfil do usuário
  const profileCode = normalizeText(userData.profile?.code)
  const profileName = normalizeText(userData.profile?.name)

  if (allowedCodes.has(profileCode)) return true
  if (profileName === 'atendimento' || profileName === 'producao' || profileName === 'financeiro') {
    return true
  }

  // 3. Checa pela flag is_finance no perfil (caso exista perfil financeiro customizado)
  if ((userData.profile as any)?.is_finance === true) return true

  // 4. Checa pelas áreas atribuídas ao usuário (area_responsibles)
  if (Array.isArray(userData.areas)) {
    const hasAllowedArea = userData.areas.some((area) => {
      const code = normalizeText(area.code)
      const name = normalizeText(area.name)
      return (
        allowedCodes.has(code) ||
        name === 'atendimento' ||
        name === 'producao' ||
        name === 'financeiro' ||
        code === 'hub' ||
        area.is_hub // HUB Atendimento
      )
    })
    if (hasAllowedArea) return true
  }

  return false
}
