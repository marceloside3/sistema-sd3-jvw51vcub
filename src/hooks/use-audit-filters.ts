import { useState, useCallback, useMemo } from 'react'

export interface AuditFilters {
  selectedUserIds: Set<string>
  dateFrom: string
  dateTo: string
  selectedField: string
  setDateFrom: (v: string) => void
  setDateTo: (v: string) => void
  setSelectedField: (v: string) => void
  toggleUser: (id: string) => void
  clearFilters: () => void
  hasActiveFilters: boolean
}

export function useAuditFilters(): AuditFilters {
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedField, setSelectedField] = useState('')

  const toggleUser = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedUserIds(new Set())
    setDateFrom('')
    setDateTo('')
    setSelectedField('')
  }, [])

  const hasActiveFilters = useMemo(
    () => selectedUserIds.size > 0 || dateFrom !== '' || dateTo !== '' || selectedField !== '',
    [selectedUserIds, dateFrom, dateTo, selectedField],
  )

  return {
    selectedUserIds,
    dateFrom,
    dateTo,
    selectedField,
    setDateFrom,
    setDateTo,
    setSelectedField,
    toggleUser,
    clearFilters,
    hasActiveFilters,
  }
}
