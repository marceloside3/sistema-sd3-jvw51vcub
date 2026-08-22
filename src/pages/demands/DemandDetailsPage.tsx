import { useParams } from 'react-router-dom'
import { DemandDetails } from '@/components/demands/DemandDetails'

/**
 * Full-page route for a single demanda (`/demandas/:id`). The actual UI lives
 * in the shared `<DemandDetails />` component, also used by the Kanban
 * flyout, so the two surfaces never drift apart.
 */
export default function DemandDetailsPage() {
  const { id } = useParams()
  if (!id) return <div className="p-8 text-center">Demanda não encontrada</div>
  return <DemandDetails demandId={id} showBackButton={true} />
}
