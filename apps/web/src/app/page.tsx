import { redirect } from 'next/navigation'

export default function Home() {
  // Homepage redirects to online ordering
  // Tables are accessed via QR codes: /menu/tavolo-1, /menu/tavolo-2, etc.
  // In-store counter ordering: /banco
  redirect('/ordina')
}
