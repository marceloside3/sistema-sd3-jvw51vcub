import { useState, useCallback } from 'react'

export interface AuditFilters {
  selectedUserId: string | null
  dateFrom: string | null
  dateTo: string | null
  selectedField: string | null
  isFiltered: boolean
  reset: () => void
  setUserId: (id: string | null) => void
  setDateFrom: (date: string | null) => void
  setDateTo: (date: string | null) => void
  setField: (field: string | null) => void
}

export function useDemandAuditFilters(): AuditFilters {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)
  const [selectedField, setSelectedField] = useState<string | null>(null)

  const reset = useCallback(() => {
    setSelectedUserId(null)
    setDateFrom(null)
    setDateTo(null)
    setSelectedField(null)
  }, [])

  const isFiltered = Boolean(selectedUserId || dateFrom || dateTo || selectedField)

  return {
    selectedUserId,
    dateFrom,
    dateTo,
    selectedField,
    isFiltered,
    reset,
    setUserId: setSelectedUserId,
    setDateFrom,
    setDateTo,
    setField: setSelectedField,
  }
}
