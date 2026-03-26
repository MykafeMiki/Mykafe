'use client'

import { useState } from 'react'
import { X, ToggleRight, ToggleLeft } from 'lucide-react'
import { DAYS_OF_WEEK, type TimerConfig } from '@/lib/menuTimers'

export interface TimerConfigModalProps {
  config: TimerConfig
  onClose: () => void
  onSave: (config: TimerConfig) => void
}

export function TimerConfigModal({ config, onClose, onSave }: TimerConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<TimerConfig>(config)

  const handleSave = () => {
    onSave(localConfig)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">Configurazione Timer Menu</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Sushi Timer Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍣</span>
                <h3 className="font-semibold text-gray-900">Timer Sushi</h3>
              </div>
              <button
                onClick={() => setLocalConfig({
                  ...localConfig,
                  sushi: { ...localConfig.sushi, enabled: !localConfig.sushi.enabled }
                })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${localConfig.sushi.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                  }`}
              >
                {localConfig.sushi.enabled ? (
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

            {localConfig.sushi.enabled && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Il sushi sara visibile solo durante la finestra oraria configurata.
                </p>

                {/* Start Day/Hour */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giorno Inizio
                    </label>
                    <select
                      value={localConfig.sushi.startDay}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        sushi: { ...localConfig.sushi, startDay: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ora Inizio
                    </label>
                    <select
                      value={localConfig.sushi.startHour}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        sushi: { ...localConfig.sushi, startHour: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* End Day/Hour */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giorno Fine
                    </label>
                    <select
                      value={localConfig.sushi.endDay}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        sushi: { ...localConfig.sushi, endDay: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ora Fine
                    </label>
                    <select
                      value={localConfig.sushi.endHour}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        sushi: { ...localConfig.sushi, endHour: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {!localConfig.sushi.enabled && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                Timer disabilitato: il sushi sara visibile in base al toggle della categoria nell'elenco menu.
              </p>
            )}
          </div>

          {/* Panini Timer Configuration */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥪</span>
                <h3 className="font-semibold text-gray-900">Timer Panini (Bar/Banco)</h3>
              </div>
              <button
                onClick={() => setLocalConfig({
                  ...localConfig,
                  panini: { ...localConfig.panini, enabled: !localConfig.panini.enabled }
                })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${localConfig.panini.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                  }`}
              >
                {localConfig.panini.enabled ? (
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

            {localConfig.panini.enabled && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  I panini saranno nascosti sul menu bar/banco prima dell'orario configurato.
                  Sul menu takeaway (/ordina) sono sempre visibili.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibili dalle ore
                  </label>
                  <select
                    value={localConfig.panini.startHour}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      panini: { ...localConfig.panini, startHour: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!localConfig.panini.enabled && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                Timer disabilitato: i panini saranno sempre visibili su tutti i menu.
              </p>
            )}
          </div>

          {/* Takeaway Service Configuration */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛒</span>
              <h3 className="font-semibold text-gray-900">Servizio Takeaway</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Master Toggle */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-gray-900">Takeaway Online (/ordina)</p>
                  <p className="text-sm text-gray-500">
                    {localConfig.takeaway.enabled
                      ? 'I clienti possono ordinare online per il ritiro'
                      : 'Servizio temporaneamente sospeso'}
                  </p>
                </div>
                <button
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    takeaway: { ...localConfig.takeaway, enabled: !localConfig.takeaway.enabled }
                  })}
                  className={`relative w-14 h-8 rounded-full transition-colors ${localConfig.takeaway.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                  <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${localConfig.takeaway.enabled ? 'left-7' : 'left-1'
                    }`} />
                </button>
              </div>

              {localConfig.takeaway.enabled && (
                <>
                  {/* Closed Days Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giorni di chiusura
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Seleziona i giorni in cui il ristorante è chiuso. Il takeaway non sarà disponibile in questi giorni.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = localConfig.takeaway.closedDays?.includes(day.value)
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              const currentDays = localConfig.takeaway.closedDays || []
                              const newDays = isSelected
                                ? currentDays.filter(d => d !== day.value)
                                : [...currentDays, day.value]
                              setLocalConfig({
                                ...localConfig,
                                takeaway: { ...localConfig.takeaway, closedDays: newDays }
                              })
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${isSelected
                                ? 'bg-red-100 text-red-700 border-2 border-red-300'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            {isSelected ? '✕ ' : ''}{day.label}
                          </button>
                        )
                      })}
                    </div>
                    {localConfig.takeaway.closedDays && localConfig.takeaway.closedDays.length > 0 && (
                      <p className="text-sm text-amber-600 mt-2">
                        Chiuso: {localConfig.takeaway.closedDays
                          .sort((a, b) => a - b)
                          .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
                          .join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Operating Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Orario apertura
                      </label>
                      <select
                        value={localConfig.takeaway.openingHour}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          takeaway: { ...localConfig.takeaway, openingHour: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Orario chiusura
                      </label>
                      <select
                        value={localConfig.takeaway.closingHour}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          takeaway: { ...localConfig.takeaway, closingHour: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    I clienti potranno selezionare orari di ritiro compresi tra le {localConfig.takeaway.openingHour.toString().padStart(2, '0')}:00 e le {localConfig.takeaway.closingHour.toString().padStart(2, '0')}:00.
                  </p>
                </>
              )}

              {!localConfig.takeaway.enabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Takeaway disabilitato:</strong> I clienti che visitano /ordina vedranno un messaggio che indica che il servizio è temporaneamente sospeso.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Salva Configurazione
          </button>
        </div>
      </div>
    </div>
  )
}
