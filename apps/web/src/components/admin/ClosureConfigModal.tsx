'use client'

import { useState } from 'react'
import { X, Save, ToggleRight, ToggleLeft, Check } from 'lucide-react'
import { isOnlineOrderingOpen, DAYS_OF_WEEK, type ClosureConfig, type DaySchedule } from '@/lib/menuTimers'

export interface ClosureConfigModalProps {
  config: ClosureConfig
  onClose: () => void
  onSave: (config: ClosureConfig) => void
}

export function ClosureConfigModal({ config, onClose, onSave }: ClosureConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<ClosureConfig>(config)

  const handleSave = () => {
    onSave(localConfig)
  }

  const updateDaySchedule = (day: number, updates: Partial<DaySchedule>) => {
    setLocalConfig({
      ...localConfig,
      schedule: {
        ...localConfig.schedule,
        [day]: { ...localConfig.schedule[day], ...updates }
      }
    })
  }

  const orderingStatus = isOnlineOrderingOpen(localConfig)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">Calendario Ordini Online</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Live Status Preview */}
          <div className={`p-3 rounded-lg text-center text-sm font-medium ${orderingStatus.isOpen ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {orderingStatus.isOpen
              ? 'Stato attuale: APERTO'
              : `Stato attuale: CHIUSO — ${orderingStatus.reason || ''}${orderingStatus.nextOpenTime ? ` (Prossima apertura: ${orderingStatus.nextOpenTime})` : ''}`
            }
          </div>

          {/* Master Switch */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Controllo Calendario</h3>
              <p className="text-xs text-gray-500">Abilita/disabilita il controllo orario globale</p>
            </div>
            <button
              onClick={() => setLocalConfig({ ...localConfig, enabled: !localConfig.enabled })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${localConfig.enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
              }`}
            >
              {localConfig.enabled ? (
                <>
                  <ToggleRight className="w-5 h-5" />
                  <span className="text-sm">Attivo</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5" />
                  <span className="text-sm">Disattivo</span>
                </>
              )}
            </button>
          </div>

          {localConfig.enabled && (
            <>
              {/* Weekly Schedule */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Orari Settimanali</h3>
                {DAYS_OF_WEEK.map(day => {
                  const daySchedule = localConfig.schedule[day.value]
                  return (
                    <div key={day.value} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <button
                        onClick={() => updateDaySchedule(day.value, { enabled: !daySchedule.enabled })}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0 ${daySchedule.enabled
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-white'
                        }`}
                      >
                        {daySchedule.enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                      <span className="font-medium text-gray-800 w-20 text-sm">{day.label}</span>
                      {daySchedule.enabled ? (
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={`${daySchedule.openHour.toString().padStart(2, '0')}:${daySchedule.openMinute.toString().padStart(2, '0')}`}
                            onChange={(e) => {
                              const [h, m] = e.target.value.split(':').map(Number)
                              updateDaySchedule(day.value, { openHour: h, openMinute: m })
                            }}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            {Array.from({ length: 24 * 4 }, (_, i) => {
                              const h = Math.floor(i / 4)
                              const m = (i % 4) * 15
                              const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                              return <option key={val} value={val}>{val}</option>
                            })}
                          </select>
                          <span className="text-gray-400">—</span>
                          <select
                            value={`${daySchedule.closeHour.toString().padStart(2, '0')}:${daySchedule.closeMinute.toString().padStart(2, '0')}`}
                            onChange={(e) => {
                              const [h, m] = e.target.value.split(':').map(Number)
                              updateDaySchedule(day.value, { closeHour: h, closeMinute: m })
                            }}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            {Array.from({ length: 24 * 4 }, (_, i) => {
                              const h = Math.floor(i / 4)
                              const m = (i % 4) * 15
                              const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                              return <option key={val} value={val}>{val}</option>
                            })}
                          </select>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Chiuso</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Temporary Closure */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Chiusura Temporanea</h3>
                  <button
                    onClick={() => setLocalConfig({
                      ...localConfig,
                      temporaryClosure: {
                        ...localConfig.temporaryClosure,
                        active: !localConfig.temporaryClosure.active
                      }
                    })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${localConfig.temporaryClosure.active
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {localConfig.temporaryClosure.active ? (
                      <>
                        <ToggleRight className="w-5 h-5" />
                        <span className="text-sm">Attiva</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5" />
                        <span className="text-sm">Disattiva</span>
                      </>
                    )}
                  </button>
                </div>

                {localConfig.temporaryClosure.active && (
                  <div className="bg-red-50 rounded-lg p-4 space-y-3 border border-red-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Messaggio (opzionale)
                      </label>
                      <input
                        type="text"
                        value={localConfig.temporaryClosure.message || ''}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          temporaryClosure: {
                            ...localConfig.temporaryClosure,
                            message: e.target.value || undefined
                          }
                        })}
                        placeholder="Es: Chiusi per ferie"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Riapertura (opzionale)
                      </label>
                      <input
                        type="datetime-local"
                        value={localConfig.temporaryClosure.until ? new Date(localConfig.temporaryClosure.until).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          temporaryClosure: {
                            ...localConfig.temporaryClosure,
                            until: e.target.value ? new Date(e.target.value).toISOString() : undefined
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <div className="p-4 border-t sticky bottom-0 bg-white">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Salva Configurazione
          </button>
        </div>
      </div>
    </div>
  )
}
