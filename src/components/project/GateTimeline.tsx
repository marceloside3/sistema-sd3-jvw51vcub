import { Check, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOVERNANCE_GATES, Project } from '@/lib/types'

interface GateTimelineProps {
  project: Project
}

export function GateTimeline({ project }: GateTimelineProps) {
  return (
    <div className="relative py-8">
      {/* Connecting line */}
      <div className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-muted rounded-full" />
      <div
        className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-primary rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${((project.active_gate - 1) / (GOVERNANCE_GATES.length - 1)) * 100}%` }}
      />

      <div className="relative flex justify-between w-full">
        {GOVERNANCE_GATES.map((gate, index) => {
          const isPassed = project.gates_passed.includes(gate.id)
          const isActive = project.active_gate === gate.id
          const isBlocked = isActive && project.status === 'waiting_gate'

          return (
            <div key={gate.id} className="flex flex-col items-center group">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 bg-background z-10 transition-colors duration-300 shadow-sm',
                  isPassed
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isBlocked
                      ? 'border-destructive bg-destructive/10 text-destructive animate-pulse-soft'
                      : isActive
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {isPassed ? (
                  <Check className="w-4 h-4" />
                ) : isBlocked ? (
                  <XCircle className="w-4 h-4" />
                ) : isActive ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-medium font-mono">{gate.id}</span>
                )}
              </div>
              <div className="absolute top-10 w-24 text-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100 md:relative md:top-auto md:mt-3">
                <p
                  className={cn(
                    'text-[10px] md:text-xs font-medium leading-tight',
                    isPassed || isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {gate.name}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
