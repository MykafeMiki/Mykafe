// ============================================
// CLOSURE CONFIG MODAL
// Aggiungi questo componente in admin/page.tsx prima di TimerConfigModal
// ============================================

// AGGIUNGI QUESTI IMPORT IN CIMA AL FILE:
// import { 
//   getClosureConfig, 
//   saveClosureConfig, 
//   ClosureConfig,
//   DaySchedule,
//   isOnlineOrderingOpen 
// } from '@/lib/menuTimers'

// AGGIUNGI QUESTI STATE NEL COMPONENTE MenuManager:
// const [showClosureModal, setShowClosureModal] = useState(false)
// const [closureConfig, setClosureConfig] = useState<ClosureConfig>(getClosureConfig())

interface ClosureConfigModalProps {
  config: ClosureConfig
  onClose: () => void
  onSave: (config: ClosureConfig) => void
}

function ClosureConfigModal({ config, onClose, onSave }: ClosureConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<ClosureConfig>(config)

  const updateDaySchedule = (day: number, updates: Partial<DaySchedule>) => {
    setLocalConfig(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], ...updates }
      }
    }))
  }

  const handleSave = () => {
    onSave(localConfig)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">🗓️ Calendario Ordini Online</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Master Switch */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <div>
              <h3 className="font-semibold text-gray-900">Ordini Online</h3>
              <p className="text-sm text-gray-600">Abilita/disabilita completamente gli ordini dal sito</p>
            </div>
            <button
              onClick={() => setLocalConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                localConfig.enabled
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {localConfig.enabled ? (
                <>
                  <ToggleRight className="w-5 h-5" />
                  <span>Attivo</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5" />
                  <span>Disattivo</span>
                </>
              )}
            </button>
          </div>

          {/* Temporary Closure */}
          <div className="p-4 bg-orange-50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-800">⚠️ Chiusura Temporanea</h3>
                <p className="text-sm text-orange-600">Per ferie, manutenzione, ecc.</p>
              </div>
              <button
                onClick={() => setLocalConfig(prev => ({
                  ...prev,
                  temporaryClosure: { ...prev.temporaryClosure, active: !prev.temporaryClosure.active }
                }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                  localConfig.temporaryClosure.active
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-orange-600 border border-orange-200'
                }`}
              >
                {localConfig.temporaryClosure.active ? 'Attiva' : 'Attiva chiusura'}
              </button>
            </div>

            {localConfig.temporaryClosure.active && (
              <div className="space-y-3 pt-2 border-t border-orange-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Messaggio per i clienti (opzionale)
                  </label>
                  <input
                    type="text"
                    value={localConfig.temporaryClosure.message || ''}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      temporaryClosure: { ...prev.temporaryClosure, message: e.target.value }
                    }))}
                    placeholder="Es: Chiusi per ferie fino al 20 gennaio"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Riapriamo il (opzionale)
                  </label>
                  <input
                    type="datetime-local"
                    value={localConfig.temporaryClosure.until?.slice(0, 16) || ''}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      temporaryClosure: { 
                        ...prev.temporaryClosure, 
                        until: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                      }
                    }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se impostato, la chiusura verrà disattivata automaticamente a questa data
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Schedule */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">📅 Orari Settimanali</h3>
            <p className="text-sm text-gray-500">
              Configura gli orari di apertura per ogni giorno della settimana. 
              I clienti potranno ordinare solo durante questi orari.
            </p>

            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const daySchedule = localConfig.schedule[day.value]
                
                return (
                  <div 
                    key={day.value} 
                    className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                      daySchedule.enabled 
                        ? 'bg-white border-gray-200' 
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    {/* Day toggle */}
                    <button
                      onClick={() => updateDaySchedule(day.value, { enabled: !daySchedule.enabled })}
                      className={`w-28 flex items-center gap-2 px-2 py-1.5 rounded-lg transition ${
                        daySchedule.enabled
                          ? 'bg-green-100 text-green-700 font-medium'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {daySchedule.enabled ? (
                        <ToggleRight className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{day.label}</span>
                    </button>

                    {daySchedule.enabled ? (
                      <div className="flex items-center gap-3 flex-1">
                        {/* Opening time */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 w-10">dalle</span>
                          <select
                            value={daySchedule.openHour}
                            onChange={(e) => updateDaySchedule(day.value, { openHour: parseInt(e.target.value) })}
                            className="px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 w-16"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                          <span className="text-gray-400">:</span>
                          <select
                            value={daySchedule.openMinute}
                            onChange={(e) => updateDaySchedule(day.value, { openMinute: parseInt(e.target.value) })}
                            className="px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 w-16"
                          >
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>

                        {/* Closing time */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 w-10">alle</span>
                          <select
                            value={daySchedule.closeHour}
                            onChange={(e) => updateDaySchedule(day.value, { closeHour: parseInt(e.target.value) })}
                            className="px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 w-16"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                          <span className="text-gray-400">:</span>
                          <select
                            value={daySchedule.closeMinute}
                            onChange={(e) => updateDaySchedule(day.value, { closeMinute: parseInt(e.target.value) })}
                            className="px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 w-16"
                          >
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic flex-1">Chiuso</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-2">Anteprima stato attuale:</h4>
            {(() => {
              // Simulate check with local config
              const status = (() => {
                if (!localConfig.enabled) return { isOpen: false, reason: 'Menu online disabilitato' }
                if (localConfig.temporaryClosure.active) return { isOpen: false, reason: localConfig.temporaryClosure.message || 'Chiusura temporanea' }
                const now = new Date()
                const daySchedule = localConfig.schedule[now.getDay()]
                if (!daySchedule.enabled) return { isOpen: false, reason: 'Chiuso oggi' }
                const currentTime = now.getHours() * 60 + now.getMinutes()
                const openTime = daySchedule.openHour * 60 + daySchedule.openMinute
                const closeTime = daySchedule.closeHour * 60 + daySchedule.closeMinute
                if (currentTime < openTime) return { isOpen: false, reason: 'Non ancora aperto' }
                if (currentTime >= closeTime) return { isOpen: false, reason: 'Chiuso per oggi' }
                return { isOpen: true }
              })()
              
              return (
                <div className={`flex items-center gap-2 ${status.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="text-xl">{status.isOpen ? '✅' : '❌'}</span>
                  <span className="font-medium">
                    {status.isOpen ? 'Ordini online attivi' : status.reason}
                  </span>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
          >
            Salva Configurazione
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// BOTTONE DA AGGIUNGERE NELLA SEZIONE ADMIN
// Mettilo dopo il div di "Timer Config" o in "Menu Speciali"
// ============================================

/*
{/* Closure Calendar Button *}
<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <span className="text-2xl">🗓️</span>
      <div>
        <h3 className="font-semibold text-indigo-800">Calendario Ordini Online</h3>
        <p className="text-sm text-indigo-600">
          {isOnlineOrderingOpen().isOpen 
            ? '✅ Ordini online attivi' 
            : `❌ ${isOnlineOrderingOpen().reason}`
          }
        </p>
      </div>
    </div>
    <button
      onClick={() => setShowClosureModal(true)}
      className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
    >
      Configura
    </button>
  </div>
</div>

{/* Closure Modal *}
{showClosureModal && (
  <ClosureConfigModal
    config={closureConfig}
    onClose={() => setShowClosureModal(false)}
    onSave={(newConfig) => {
      saveClosureConfig(newConfig)
      setClosureConfig(newConfig)
      setShowClosureModal(false)
    }}
  />
)}
*/
