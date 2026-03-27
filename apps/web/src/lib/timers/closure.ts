/**
 * Closure Schedule
 *
 * Weekly opening hours and temporary closure management.
 * Configuration is stored server-side via /api/settings/closure.
 */

import { DAYS_OF_WEEK } from './config'

export interface DaySchedule {
  enabled: boolean    // Se il giorno è abilitato per ordini online
  openHour: number    // Ora apertura (0-23)
  openMinute: number  // Minuto apertura (0, 15, 30, 45)
  closeHour: number   // Ora chiusura (0-23)
  closeMinute: number // Minuto chiusura (0, 15, 30, 45)
}

export interface ClosureConfig {
  enabled: boolean                       // Master switch
  schedule: Record<number, DaySchedule> // 0=Domenica, 1=Lunedi, ... 6=Sabato
  temporaryClosure: {
    active: boolean
    until?: string  // ISO date string
    message?: string
  }
}

const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  enabled: true,
  openHour: 11,
  openMinute: 0,
  closeHour: 21,
  closeMinute: 0,
}

export const DEFAULT_CLOSURE_CONFIG: ClosureConfig = {
  enabled: true,
  schedule: {
    0: { ...DEFAULT_DAY_SCHEDULE, enabled: false }, // Domenica chiuso
    1: { ...DEFAULT_DAY_SCHEDULE },
    2: { ...DEFAULT_DAY_SCHEDULE },
    3: { ...DEFAULT_DAY_SCHEDULE },
    4: { ...DEFAULT_DAY_SCHEDULE },
    5: { ...DEFAULT_DAY_SCHEDULE },
    6: { ...DEFAULT_DAY_SCHEDULE },
  },
  temporaryClosure: { active: false },
}

/**
 * Fetch closure configuration from server
 */
export async function fetchClosureConfig(): Promise<ClosureConfig> {
  try {
    const res = await fetch('/api/settings/closure', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      enabled: data.enabled ?? true,
      schedule: { ...DEFAULT_CLOSURE_CONFIG.schedule, ...data.schedule },
      temporaryClosure: { ...DEFAULT_CLOSURE_CONFIG.temporaryClosure, ...data.temporaryClosure },
    }
  } catch (e) {
    console.error('Error fetching closure config:', e)
    return DEFAULT_CLOSURE_CONFIG
  }
}

/**
 * Save closure configuration to server
 */
export async function saveClosureConfigToServer(config: ClosureConfig): Promise<void> {
  const res = await fetch('/api/settings/closure', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`)
  }
}

/**
 * Check if online ordering is currently open
 */
export function isOnlineOrderingOpen(config: ClosureConfig): {
  isOpen: boolean
  reason?: string
  nextOpenTime?: string
} {
  if (!config.enabled) {
    return { isOpen: false, reason: 'Menu online disabilitato' }
  }

  if (config.temporaryClosure.active) {
    if (config.temporaryClosure.until) {
      const untilDate = new Date(config.temporaryClosure.until)
      if (new Date() < untilDate) {
        return {
          isOpen: false,
          reason: config.temporaryClosure.message || 'Chiusura temporanea',
          nextOpenTime: untilDate.toLocaleDateString('it-IT', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          }),
        }
      }
      config.temporaryClosure.active = false // expired
    } else {
      return { isOpen: false, reason: config.temporaryClosure.message || 'Chiusura temporanea' }
    }
  }

  const now = new Date()
  const dayOfWeek = now.getDay()
  const currentTime = now.getHours() * 60 + now.getMinutes()
  const todaySchedule = config.schedule[dayOfWeek] ?? DEFAULT_CLOSURE_CONFIG.schedule[dayOfWeek]

  if (!todaySchedule?.enabled) {
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextSchedule = config.schedule[nextDay]
      if (nextSchedule?.enabled) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === nextDay)?.label || ''
        return {
          isOpen: false,
          reason: 'Chiuso oggi',
          nextOpenTime: `${dayName} alle ${nextSchedule.openHour.toString().padStart(2, '0')}:${nextSchedule.openMinute.toString().padStart(2, '0')}`,
        }
      }
    }
    return { isOpen: false, reason: 'Chiuso' }
  }

  const openTime = todaySchedule.openHour * 60 + todaySchedule.openMinute
  const closeTime = todaySchedule.closeHour * 60 + todaySchedule.closeMinute

  if (currentTime < openTime) {
    return {
      isOpen: false,
      reason: 'Non ancora aperto',
      nextOpenTime: `oggi alle ${todaySchedule.openHour.toString().padStart(2, '0')}:${todaySchedule.openMinute.toString().padStart(2, '0')}`,
    }
  }

  if (currentTime >= closeTime) {
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextSchedule = config.schedule[nextDay]
      if (nextSchedule?.enabled) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === nextDay)?.label || ''
        return {
          isOpen: false,
          reason: 'Chiuso per oggi',
          nextOpenTime: `${dayName} alle ${nextSchedule.openHour.toString().padStart(2, '0')}:${nextSchedule.openMinute.toString().padStart(2, '0')}`,
        }
      }
    }
    return { isOpen: false, reason: 'Chiuso' }
  }

  return { isOpen: true }
}

/**
 * Get formatted weekly schedule for display
 */
export function getFormattedSchedule(config: ClosureConfig): { day: string; schedule: string }[] {
  return DAYS_OF_WEEK.map(day => {
    const daySchedule = config.schedule[day.value]
    if (!daySchedule.enabled) return { day: day.label, schedule: 'Chiuso' }

    const open = `${daySchedule.openHour.toString().padStart(2, '0')}:${daySchedule.openMinute.toString().padStart(2, '0')}`
    const close = `${daySchedule.closeHour.toString().padStart(2, '0')}:${daySchedule.closeMinute.toString().padStart(2, '0')}`
    return { day: day.label, schedule: `${open} - ${close}` }
  })
}
