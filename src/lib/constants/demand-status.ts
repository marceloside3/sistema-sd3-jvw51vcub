import {
  DEMAND_PRIORITY_CATALOG,
  DEMAND_STATUS_CATALOG,
  BUDGET_STATUS_CATALOG,
  PAYMENT_STATUS_CATALOG,
} from './status-catalog'

export const DEMAND_PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent: {
    label: DEMAND_PRIORITY_CATALOG.urgent.label,
    className: DEMAND_PRIORITY_CATALOG.urgent.className,
  },
  high: {
    label: DEMAND_PRIORITY_CATALOG.high.label,
    className: DEMAND_PRIORITY_CATALOG.high.className,
  },
  normal: {
    label: DEMAND_PRIORITY_CATALOG.normal.label,
    className: DEMAND_PRIORITY_CATALOG.normal.className,
  },
  low: {
    label: DEMAND_PRIORITY_CATALOG.low.label,
    className: DEMAND_PRIORITY_CATALOG.low.className,
  },
}

export const DEMAND_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: DEMAND_STATUS_CATALOG.pending.label,
    className: DEMAND_STATUS_CATALOG.pending.className,
  },
  in_progress: {
    label: DEMAND_STATUS_CATALOG.in_progress.label,
    className: DEMAND_STATUS_CATALOG.in_progress.className,
  },
  review: {
    label: DEMAND_STATUS_CATALOG.review.label,
    className: DEMAND_STATUS_CATALOG.review.className,
  },
  done: {
    label: DEMAND_STATUS_CATALOG.done.label,
    className: DEMAND_STATUS_CATALOG.done.className,
  },
  completed: {
    label: DEMAND_STATUS_CATALOG.completed.label,
    className: DEMAND_STATUS_CATALOG.completed.className,
  },
  cancelled: {
    label: DEMAND_STATUS_CATALOG.cancelled.label,
    className: DEMAND_STATUS_CATALOG.cancelled.className,
  },
  rejected: {
    label: DEMAND_STATUS_CATALOG.rejected.label,
    className: DEMAND_STATUS_CATALOG.rejected.className,
  },
}

export const BUDGET_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: BUDGET_STATUS_CATALOG.pending.label,
    className: BUDGET_STATUS_CATALOG.pending.className,
  },
  sent: {
    label: BUDGET_STATUS_CATALOG.sent.label,
    className: BUDGET_STATUS_CATALOG.sent.className,
  },
  approved: {
    label: BUDGET_STATUS_CATALOG.approved.label,
    className: BUDGET_STATUS_CATALOG.approved.className,
  },
  rejected: {
    label: BUDGET_STATUS_CATALOG.rejected.label,
    className: BUDGET_STATUS_CATALOG.rejected.className,
  },
  adjustments_requested: {
    label: BUDGET_STATUS_CATALOG.adjustments_requested.label,
    className: BUDGET_STATUS_CATALOG.adjustments_requested.className,
  },
}

export const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  none: {
    label: PAYMENT_STATUS_CATALOG.none.label,
    className: PAYMENT_STATUS_CATALOG.none.className,
  },
  requested: {
    label: PAYMENT_STATUS_CATALOG.requested.label,
    className: PAYMENT_STATUS_CATALOG.requested.className,
  },
  processed: {
    label: PAYMENT_STATUS_CATALOG.processed.label,
    className: PAYMENT_STATUS_CATALOG.processed.className,
  },
}
