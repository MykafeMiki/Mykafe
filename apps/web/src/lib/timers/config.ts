/**
 * Timer Configuration
 *
 * Types, defaults, and localStorage persistence for menu timer settings.
 */

// Menu context types
export type MenuContext = 'bar' | 'takeaway' | 'table'

// Day names for UI
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Domenica' },
  { value: 1, label: 'Lunedi' },
  { value: 2, label: 'Martedi' },
  { value: 3, label: 'Mercoledi' },
  { value: 4, label: 'Giovedi' },
  { value: 5, label: 'Venerdi' },
  { value: 6, label: 'Sabato' },
]

// Timer configuration interface
export interface TimerConfig {
  sushi: {
    enabled: boolean
    startDay: number // 0-6 (Sunday-Saturday)
    startHour: number // 0-23
    endDay: number // 0-6
    endHour: number // 0-23
  }
  panini: {
    enabled: boolean
    startHour: number // Hour from which panini are visible (default 11)
  }
  takeaway: {
    enabled: boolean // Toggle to enable/disable takeaway completely
    openingHour: number // Earliest pickup hour (default 11)
    closingHour: number // Latest pickup hour (default 20)
    closedDays: number[] // Array of day numbers (0-6) when restaurant is closed
  }
}

// Default configuration
const DEFAULT_CONFIG: TimerConfig = {
  sushi: {
    enabled: true,
    startDay: 2, // Tuesday
    startHour: 18, // 18:00
    endDay: 3, // Wednesday
    endHour: 17, // 17:00
  },
  panini: {
    enabled: false, // Timer disabilitato - panini sempre visibili
    startHour: 11,
  },
  takeaway: {
    enabled: true,
    openingHour: 11,
    closingHour: 20,
    closedDays: [],
  },
}

const CONFIG_STORAGE_KEY = 'mykafe-timer-config'

/**
 * Get timer configuration from localStorage
 */
export function getTimerConfig(): TimerConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG
  }

  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        sushi: { ...DEFAULT_CONFIG.sushi, ...parsed.sushi },
        panini: { ...DEFAULT_CONFIG.panini, ...parsed.panini },
        takeaway: {
          ...DEFAULT_CONFIG.takeaway,
          ...parsed.takeaway,
          closedDays: Array.isArray(parsed.takeaway?.closedDays)
            ? parsed.takeaway.closedDays
            : DEFAULT_CONFIG.takeaway.closedDays,
        },
      }
    }
  } catch (e) {
    console.error('Error reading timer config:', e)
  }

  return DEFAULT_CONFIG
}

/**
 * Save timer configuration to localStorage
 */
export function saveTimerConfig(config: TimerConfig): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('Error saving timer config:', e)
  }
}
