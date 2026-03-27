// ============================================
// CLOSURE SCHEDULE - Calendario Chiusure
// Aggiungi questo codice alla fine di menuTimers.ts
// ============================================

export interface DaySchedule {
  enabled: boolean      // Se il giorno è abilitato per ordini online
  openHour: number      // Ora apertura (0-23)
  openMinute: number    // Minuto apertura (0, 15, 30, 45)
  closeHour: number     // Ora chiusura (0-23)
  closeMinute: number   // Minuto chiusura (0, 15, 30, 45)
}

export interface ClosureConfig {
  enabled: boolean                       // Master switch per abilitare/disabilitare tutto
  schedule: Record<number, DaySchedule>  // 0=Domenica, 1=Lunedi, ... 6=Sabato
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
  closeMinute: 0
}

const DEFAULT_CLOSURE_CONFIG: ClosureConfig = {
  enabled: true,
  schedule: {
    0: { ...DEFAULT_DAY_SCHEDULE, enabled: false }, // Domenica chiuso
    1: { ...DEFAULT_DAY_SCHEDULE }, // Lunedi
    2: { ...DEFAULT_DAY_SCHEDULE }, // Martedi
    3: { ...DEFAULT_DAY_SCHEDULE }, // Mercoledi
    4: { ...DEFAULT_DAY_SCHEDULE }, // Giovedi
    5: { ...DEFAULT_DAY_SCHEDULE }, // Venerdi
    6: { ...DEFAULT_DAY_SCHEDULE }, // Sabato
  },
  temporaryClosure: {
    active: false
  }
}

const CLOSURE_CONFIG_KEY = 'mykafe-closure-config'

/**
 * Get closure configuration from localStorage
 */
export function getClosureConfig(): ClosureConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CLOSURE_CONFIG
  }

  try {
    const stored = localStorage.getItem(CLOSURE_CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        enabled: parsed.enabled ?? true,
        schedule: { ...DEFAULT_CLOSURE_CONFIG.schedule, ...parsed.schedule },
        temporaryClosure: { ...DEFAULT_CLOSURE_CONFIG.temporaryClosure, ...parsed.temporaryClosure }
      }
    }
  } catch (e) {
    console.error('Error reading closure config:', e)
  }

  return DEFAULT_CLOSURE_CONFIG
}

/**
 * Save closure configuration to localStorage
 */
export function saveClosureConfig(config: ClosureConfig): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CLOSURE_CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('Error saving closure config:', e)
  }
}

/**
 * Check if online ordering is currently available
 */
export function isOnlineOrderingOpen(): { 
  isOpen: boolean
  reason?: string
  nextOpenTime?: string 
} {
  const config = getClosureConfig()
  
  // Master switch off
  if (!config.enabled) {
    return { isOpen: false, reason: 'Menu online disabilitato' }
  }

  // Temporary closure active
  if (config.temporaryClosure.active) {
    if (config.temporaryClosure.until) {
      const untilDate = new Date(config.temporaryClosure.until)
      if (new Date() < untilDate) {
        return { 
          isOpen: false, 
          reason: config.temporaryClosure.message || 'Chiusura temporanea',
          nextOpenTime: new Date(config.temporaryClosure.until).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      }
      // Chiusura scaduta, disattivala automaticamente
      config.temporaryClosure.active = false
      saveClosureConfig(config)
    } else {
      return { 
        isOpen: false, 
        reason: config.temporaryClosure.message || 'Chiusura temporanea'
      }
    }
  }

  const now = new Date()
  const dayOfWeek = now.getDay()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const todaySchedule = config.schedule[dayOfWeek]

  // Day not enabled (closed)
  if (!todaySchedule.enabled) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextSchedule = config.schedule[nextDay]
      if (nextSchedule.enabled) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === nextDay)?.label || ''
        return { 
          isOpen: false, 
          reason: 'Chiuso oggi',
          nextOpenTime: `${dayName} alle ${nextSchedule.openHour.toString().padStart(2, '0')}:${nextSchedule.openMinute.toString().padStart(2, '0')}`
        }
      }
    }
    return { isOpen: false, reason: 'Chiuso' }
  }

  const openTime = todaySchedule.openHour * 60 + todaySchedule.openMinute
  const closeTime = todaySchedule.closeHour * 60 + todaySchedule.closeMinute

  // Before opening time
  if (currentTime < openTime) {
    return { 
      isOpen: false, 
      reason: 'Non ancora aperto',
      nextOpenTime: `oggi alle ${todaySchedule.openHour.toString().padStart(2, '0')}:${todaySchedule.openMinute.toString().padStart(2, '0')}`
    }
  }

  // After closing time
  if (currentTime >= closeTime) {
    // Find next open time
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextSchedule = config.schedule[nextDay]
      if (nextSchedule.enabled) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === nextDay)?.label || ''
        return { 
          isOpen: false, 
          reason: 'Chiuso per oggi',
          nextOpenTime: `${dayName} alle ${nextSchedule.openHour.toString().padStart(2, '0')}:${nextSchedule.openMinute.toString().padStart(2, '0')}`
        }
      }
    }
    return { isOpen: false, reason: 'Chiuso' }
  }

  // Currently open!
  return { isOpen: true }
}

/**
 * Get formatted schedule for display
 */
export function getFormattedSchedule(): { day: string, schedule: string }[] {
  const config = getClosureConfig()
  
  return DAYS_OF_WEEK.map(day => {
    const daySchedule = config.schedule[day.value]
    
    if (!daySchedule.enabled) {
      return { day: day.label, schedule: 'Chiuso' }
    }

    const open = `${daySchedule.openHour.toString().padStart(2, '0')}:${daySchedule.openMinute.toString().padStart(2, '0')}`
    const close = `${daySchedule.closeHour.toString().padStart(2, '0')}:${daySchedule.closeMinute.toString().padStart(2, '0')}`
    
    return { day: day.label, schedule: `${open} - ${close}` }
  })
}
