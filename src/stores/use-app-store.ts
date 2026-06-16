import { create } from 'zustand'
import { Project, User, GateOverride, GateAlert } from '@/lib/types'

interface AppState {
  current_user: User
  projects: Project[]
  overrides: GateOverride[]
  alerts: GateAlert[]
  addOverride: (override: Omit<GateOverride, 'override_id' | 'created_at'>) => void
  approveGate: (project_id: string, gate_id: number) => void
}

const mockProjects: Project[] = [
  {
    project_id: 'PRJ-2024-001',
    client_name: 'Nike do Brasil',
    current_area: 2,
    active_gate: 2,
    status: 'waiting_gate',
    sla_status: 'late',
    kamino_sync_id: null,
    gates_passed: [1],
    briefing_data: {
      objective: 'Lançamento nova linha de tênis',
      target_audience: 'Jovens 18-35 anos',
      budget: 'R$ 500.000',
      deliverables: ['KV', 'Peças Sociais', 'Vídeo 30s'],
    },
  },
  {
    project_id: 'PRJ-2024-002',
    client_name: 'Apple Inc.',
    current_area: 4,
    active_gate: 3,
    status: 'execution',
    sla_status: 'ok',
    kamino_sync_id: null,
    gates_passed: [1, 2],
    briefing_data: {
      objective: 'Campanha institucional',
      target_audience: 'Público Geral AB',
      budget: 'R$ 1.200.000',
      deliverables: ['Key Visual', 'OOH'],
    },
  },
  {
    project_id: 'PRJ-2024-003',
    client_name: 'Coca-Cola',
    current_area: 1,
    active_gate: 1,
    status: 'briefing',
    sla_status: 'warning',
    kamino_sync_id: null,
    gates_passed: [],
    briefing_data: {
      objective: 'Ativação de Verão',
      target_audience: 'Todos',
      budget: 'R$ 800.000',
      deliverables: ['Landing Page', 'Filtro Instagram'],
    },
  },
]

const mockAlerts: GateAlert[] = [
  {
    alert_id: 'ALT-01',
    project_id: 'PRJ-2024-001',
    gate_id: 2,
    message: 'Estratégia pendente de aprovação há 3 dias.',
    created_at: new Date().toISOString(),
  },
]

export const useAppStore = create<AppState>((set) => ({
  current_user: {
    user_id: 'USR-999',
    name: 'Ana Silva',
    profile_id: 1, // Diretor de Área
    area_id: 2, // Atendimento (HUB)
  },
  projects: mockProjects,
  overrides: [],
  alerts: mockAlerts,

  addOverride: (overrideData) =>
    set((state) => {
      const newOverride: GateOverride = {
        ...overrideData,
        override_id: `OVR-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      }

      // Auto-approve the gate when overridden
      const updatedProjects = state.projects.map((p) => {
        if (p.project_id === overrideData.project_id) {
          return {
            ...p,
            status: 'execution' as const,
            active_gate: Math.min(p.active_gate + 1, 7),
            gates_passed: [...p.gates_passed, overrideData.gate_id],
          }
        }
        return p
      })

      return {
        overrides: [...state.overrides, newOverride],
        projects: updatedProjects,
        alerts: state.alerts.filter(
          (a) => !(a.project_id === overrideData.project_id && a.gate_id === overrideData.gate_id),
        ),
      }
    }),

  approveGate: (project_id, gate_id) =>
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.project_id === project_id) {
          return {
            ...p,
            status: 'execution',
            active_gate: Math.min(p.active_gate + 1, 7),
            gates_passed: [...p.gates_passed, gate_id],
          }
        }
        return p
      }),
      alerts: state.alerts.filter((a) => !(a.project_id === project_id && a.gate_id === gate_id)),
    })),
}))
