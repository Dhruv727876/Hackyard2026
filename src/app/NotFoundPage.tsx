import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="space-y-3 text-center">
      <h1 className="text-2xl font-bold text-slate-800">Page not found</h1>
      <p className="text-slate-600">That page does not exist.</p>
      <Link
        to="/"
        className="inline-block rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Back to scan
      </Link>
    </section>
  )
}
