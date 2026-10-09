import { useLocation, useNavigate } from 'react-router-dom'
import type { ScrapItemInput } from '@/domain/types'
import { PickupRequestForm } from './PickupRequestForm'

interface LocationState {
  items?: ScrapItemInput[]
}

function hasItemsState(state: unknown): state is LocationState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'items' in state &&
    Array.isArray((state as Record<string, unknown>)['items'])
  )
}

export default function NewPickupPage(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()

  const items = hasItemsState(location.state) && location.state.items
    ? location.state.items
    : null

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-emerald-800">Request a pickup</h1>
        <p className="text-sm text-slate-600">
          Enter pickup details to book a collector for your scrap.
        </p>
      </header>

      <PickupRequestForm
        items={items}
        onSubmitted={() => navigate('/pickups')}
      />
    </section>
  )
}
