import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-primary-50 to-white">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">
          MyKafe
        </h1>
        <p className="text-gray-600 mb-8">
          Sistema di ordinazione digitale per ristoranti
        </p>

        <div className="space-y-4">
          <Link
            href="/menu/tavolo-1"
            className="block w-full py-3 px-6 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
          >
            Menu Tavolo 1 (Demo)
          </Link>

          <Link
            href="/takeaway"
            className="block w-full py-3 px-6 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition"
          >
            Ordina Take Away Online
          </Link>

          <Link
            href="/kitchen"
            className="block w-full py-3 px-6 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition"
          >
            Display Cucina
          </Link>

          <Link
            href="/admin"
            className="block w-full py-3 px-6 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition"
          >
            Pannello Admin
          </Link>
        </div>
      </div>
    </main>
  )
}
