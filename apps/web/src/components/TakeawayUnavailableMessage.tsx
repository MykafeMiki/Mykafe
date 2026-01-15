'use client'

interface TakeawayUnavailableProps {
  status: {
    isAvailable: boolean
    reason: 'disabled' | 'closed_day' | 'outside_hours' | 'available'
    message: string
  }
}

export function TakeawayUnavailableMessage({ status }: TakeawayUnavailableProps) {
  const getIcon = () => {
    switch (status.reason) {
      case 'disabled':
        return '🔒'
      case 'closed_day':
        return '📅'
      case 'outside_hours':
        return '⏰'
      default:
        return '🛒'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">{getIcon()}</div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Takeaway non disponibile
        </h1>

        <p className="text-gray-600 mb-6">
          {status.message}
        </p>

        {status.reason === 'closed_day' && (
          <div className="bg-amber-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-700">
              Puoi comunque venirci a trovare di persona nei giorni di apertura!
            </p>
          </div>
        )}

        {status.reason === 'outside_hours' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              Torna più tardi per ordinare online oppure vieni a trovarci in negozio!
            </p>
          </div>
        )}

        {status.reason === 'disabled' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              Il servizio di ordini online è temporaneamente sospeso.
              <br />
              Per maggiori informazioni, contattaci direttamente.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="/"
            className="block w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition"
          >
            Torna alla Home
          </a>

          <a
            href="/banco"
            className="block w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
          >
            Ordina al Banco
          </a>
        </div>
      </div>
    </div>
  )
}
