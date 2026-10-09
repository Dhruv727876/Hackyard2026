import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/app/Layout'
import NotFoundPage from '@/app/NotFoundPage'
import NewPickupPage from '@/features/pickup/NewPickupPage'
import PickupsPage from '@/features/pickup/PickupsPage'
import ScanPage from '@/features/scan/ScanPage'
import WardPage from '@/features/ward/WardPage'
import WorkerPage from '@/features/worker/WorkerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ScanPage />} />
          <Route path="pickups" element={<PickupsPage />} />
          <Route path="pickups/new" element={<NewPickupPage />} />
          <Route path="worker" element={<WorkerPage />} />
          <Route path="ward" element={<WardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
