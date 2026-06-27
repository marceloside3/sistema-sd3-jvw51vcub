export function calculateSla(startedAt: string | null | undefined, hoursLimit: number) {
  if (!startedAt) {
    return {
      status: 'not_distributed',
      elapsedHours: 0,
      remainingHours: 0,
      label: 'Não distribuído',
    }
  }

  const start = new Date(startedAt).getTime()
  const elapsedHours = (Date.now() - start) / (1000 * 60 * 60)
  const remainingHours = hoursLimit - elapsedHours

  let status: 'safe' | 'warning' | 'overdue' = 'safe'

  if (elapsedHours > hoursLimit) {
    status = 'overdue'
  } else if (elapsedHours > hoursLimit * 0.83) {
    status = 'warning'
  }

  let label = ''
  if (status === 'overdue') {
    label = `Vencido há ${Math.abs(remainingHours).toFixed(1)}h`
  } else {
    label = `${remainingHours.toFixed(1)}h restantes`
  }

  return { status, elapsedHours, remainingHours, label }
}
