/**
 * Menu Timers & Availability Logic
 *
 * This module handles time-based menu filtering:
 * - Sushi: Configurable days and hours (default: Tuesday 18:00 to Wednesday 17:00)
 * - Panini: Hidden on BAR menu before configurable hour (default: 11:00)
 *
 * Configuration is stored in localStorage and can be modified by admin
 */

import type { Category } from '@shared/types'

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
    enabled: true,
    startHour: 11, // 11:00
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
      // Merge with defaults to ensure all fields exist
      return {
        sushi: { ...DEFAULT_CONFIG.sushi, ...parsed.sushi },
        panini: { ...DEFAULT_CONFIG.panini, ...parsed.panini },
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

/**
 * Check if current time is within sushi availability window
 */
export function isSushiTimeActive(): boolean {
  const config = getTimerConfig()

  if (!config.sushi.enabled) {
    return true // If timer disabled, sushi always available (controlled by category.active)
  }

  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const hour = now.getHours()

  const { startDay, startHour, endDay, endHour } = config.sushi

  // Same day range
  if (startDay === endDay) {
    return day === startDay && hour >= startHour && hour < endHour
  }

  // Cross-day range (e.g., Tuesday 18:00 to Wednesday 17:00)
  if (startDay < endDay) {
    // Start day from startHour onwards
    if (day === startDay && hour >= startHour) {
      return true
    }
    // End day until endHour
    if (day === endDay && hour < endHour) {
      return true
    }
    // Days in between (if any)
    if (day > startDay && day < endDay) {
      return true
    }
  }

  // Wrap around week (e.g., Saturday to Monday)
  if (startDay > endDay) {
    if (day === startDay && hour >= startHour) {
      return true
    }
    if (day === endDay && hour < endHour) {
      return true
    }
    if (day > startDay || day < endDay) {
      return true
    }
  }

  return false
}

/**
 * Check if panini should be visible based on current time
 */
export function isPaniniTimeActive(): boolean {
  const config = getTimerConfig()

  if (!config.panini.enabled) {
    return true // If timer disabled, panini always available
  }

  const now = new Date()
  const hour = now.getHours()

  return hour >= config.panini.startHour
}

/**
 * Check if a category should be visible based on time and context
 *
 * For Sushi: visible only when BOTH timer is active AND category.active is true
 * - Timer window: Tuesday 18:00 to Wednesday 17:00
 * - Admin can disable sushi early by setting category.active = false
 *
 * For Panini: hidden before 11:00 on bar/table, always visible on takeaway
 */
export function isCategoryVisible(
  category: Category,
  context: MenuContext
): boolean {
  const categoryNameLower = category.name.toLowerCase()

  // Sushi categories - must pass BOTH timer check AND be active
  if (categoryNameLower.includes('sushi')) {
    // Category must be active (admin toggle) AND within time window
    // Note: category.active is already checked by the API, but we also check timer
    return category.active && isSushiTimeActive()
  }

  // Panini categories - only apply time restriction on bar and table (QR at counter)
  if (categoryNameLower.includes('panin')) {
    // Takeaway (ordina page) always shows panini
    if (context === 'takeaway') {
      return true
    }
    // Bar and table (QR code at counter) hide panini before 11:00
    return isPaniniTimeActive()
  }

  return true
}

/**
 * Filter categories based on time and context
 * Returns only categories that should be visible
 */
export function filterCategoriesByTime(
  categories: Category[],
  context: MenuContext
): Category[] {
  return categories.filter(category => {
    // Check time-based visibility (includes active check for sushi)
    return isCategoryVisible(category, context)
  })
}

/**
 * Get sushi availability status for admin display
 */
export function getSushiStatus(): {
  isTimeWindow: boolean
  statusText: string
  config: TimerConfig['sushi']
} {
  const config = getTimerConfig()
  const isActive = isSushiTimeActive()

  const startDayName = DAYS_OF_WEEK.find(d => d.value === config.sushi.startDay)?.label || ''
  const endDayName = DAYS_OF_WEEK.find(d => d.value === config.sushi.endDay)?.label || ''

  let statusText: string
  if (!config.sushi.enabled) {
    statusText = 'Timer disabilitato'
  } else if (isActive) {
    statusText = `Attivo fino a ${endDayName} ore ${config.sushi.endHour}:00`
  } else {
    statusText = `Si attiva ${startDayName} alle ${config.sushi.startHour}:00`
  }

  return {
    isTimeWindow: isActive,
    statusText,
    config: config.sushi
  }
}

/**
 * Get panini availability status
 */
export function getPaniniStatus(): {
  isAvailable: boolean
  statusText: string
  config: TimerConfig['panini']
} {
  const config = getTimerConfig()
  const isActive = isPaniniTimeActive()
  const now = new Date()

  let statusText: string
  if (!config.panini.enabled) {
    statusText = 'Timer disabilitato - sempre visibili'
  } else if (isActive) {
    statusText = 'Panini disponibili'
  } else {
    const hoursLeft = config.panini.startHour - now.getHours()
    statusText = `Disponibili dalle ${config.panini.startHour}:00 (tra ${hoursLeft} ore)`
  }

  return {
    isAvailable: isActive,
    statusText,
    config: config.panini
  }
}
